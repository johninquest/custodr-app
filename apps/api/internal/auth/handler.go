package auth

import (
	"net/http"

	"github.com/custodr-app/api/internal/shared/errors"
	"github.com/custodr-app/api/internal/users"
	"github.com/labstack/echo/v4"
)

// Handler handles authentication-related HTTP requests
type Handler struct {
	service     Service
	userService users.Service
}

// NewHandler creates a new auth handler instance
func NewHandler(service Service, userService users.Service) *Handler {
	return &Handler{
		service:     service,
		userService: userService,
	}
}

// Login godoc
// @Summary Login with Firebase token
// @Description Exchange Firebase ID token for internal session. Auto-provisions user if first login.
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Firebase token"
// @Success 200 {object} LoginResponse "User authenticated successfully"
// @Failure 400 {object} errorResponse "Invalid request"
// @Failure 401 {object} errorResponse "Invalid or expired token"
// @Failure 500 {object} errorResponse "Internal server error"
// @Router /api/v1/auth/login [post]
func (h *Handler) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Error: errors.NewValidationError("invalid request body", nil),
		})
	}

	if req.FirebaseToken == "" {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Error: errors.NewValidationError("firebase_token is required", []errors.ErrorDetail{
				{Field: "firebase_token", Message: "firebase_token is required"},
			}),
		})
	}

	resp, err := h.service.Login(c.Request().Context(), &req)
	if err != nil {
		if err.Error() == "invalid firebase token" {
			return c.JSON(http.StatusUnauthorized, errorResponse{
				Error: errors.NewUnauthorizedError("invalid or expired token"),
			})
		}
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Error: errors.NewInternalError("failed to process login"),
		})
	}

	return c.JSON(http.StatusOK, resp)
}

// GetProfile godoc
// @Summary Get current user profile
// @Description Retrieve the authenticated user's profile information
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} users.User "User profile"
// @Failure 401 {object} errorResponse "Unauthorized"
// @Failure 500 {object} errorResponse "Internal server error"
// @Router /api/v1/users/me [get]
func (h *Handler) GetProfile(c echo.Context) error {
	userID := c.Get("user_id").(string)

	user, err := h.userService.GetProfile(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Error: errors.NewInternalError("failed to retrieve user profile"),
		})
	}

	return c.JSON(http.StatusOK, user)
}

// DeleteAccount godoc
// @Summary Delete user account
// @Description Permanently delete the authenticated user's account and all associated data (GDPR right to erasure)
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 204 "Account deleted successfully"
// @Failure 401 {object} errorResponse "Unauthorized"
// @Failure 500 {object} errorResponse "Internal server error"
// @Router /api/v1/users/me [delete]
func (h *Handler) DeleteAccount(c echo.Context) error {
	userID := c.Get("user_id").(string)

	if err := h.userService.DeleteAccount(c.Request().Context(), userID); err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Error: errors.NewInternalError("failed to delete account"),
		})
	}

	return c.NoContent(http.StatusNoContent)
}

// errorResponse wraps API errors in the standard response format
type errorResponse struct {
	Error *errors.APIError `json:"error"`
}
