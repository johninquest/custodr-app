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

// ListConsents godoc
// @Summary List consents
// @Description Retrieve the authenticated user's consent records
// @Tags Users
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string][]users.Consent
// @Failure 401 {object} errorResponse
// @Router /api/v1/users/me/consents [get]
func (h *Handler) ListConsents(c echo.Context) error {
	userID := c.Get("user_id").(string)

	consents, err := h.userService.ListConsents(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Error: errors.NewInternalError("failed to retrieve consents"),
		})
	}
	return c.JSON(http.StatusOK, map[string][]users.Consent{"data": consents})
}

// GrantConsent godoc
// @Summary Grant consent
// @Description Record a new consent grant (Einwilligungserklärung)
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body users.GrantConsentRequest true "Consent"
// @Success 201 {object} users.Consent
// @Failure 400 {object} errorResponse
// @Failure 401 {object} errorResponse
// @Router /api/v1/users/me/consents [post]
func (h *Handler) GrantConsent(c echo.Context) error {
	userID := c.Get("user_id").(string)

	var req users.GrantConsentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Error: errors.NewValidationError("invalid request body", nil),
		})
	}

	consent, err := h.userService.GrantConsent(c.Request().Context(), userID, &req)
	if err != nil {
		if apiErr, ok := err.(*errors.APIError); ok {
			return c.JSON(apiErr.HTTPStatus(), errorResponse{Error: apiErr})
		}
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Error: errors.NewInternalError("failed to grant consent"),
		})
	}
	return c.JSON(http.StatusCreated, consent)
}

// WithdrawConsent godoc
// @Summary Withdraw consent
// @Description Withdraw consent of a given type (record retained for audit)
// @Tags Users
// @Produce json
// @Security BearerAuth
// @Param type path string true "Consent type"
// @Success 204 "No Content"
// @Failure 404 {object} errorResponse
// @Router /api/v1/users/me/consents/{type} [delete]
func (h *Handler) WithdrawConsent(c echo.Context) error {
	userID := c.Get("user_id").(string)

	if err := h.userService.WithdrawConsent(c.Request().Context(), userID, c.Param("type")); err != nil {
		if apiErr, ok := err.(*errors.APIError); ok {
			return c.JSON(apiErr.HTTPStatus(), errorResponse{Error: apiErr})
		}
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Error: errors.NewInternalError("failed to withdraw consent"),
		})
	}
	return c.NoContent(http.StatusNoContent)
}

// errorResponse wraps API errors in the standard response format
type errorResponse struct {
	Error *errors.APIError `json:"error"`
}
