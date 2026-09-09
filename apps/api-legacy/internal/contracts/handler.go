package contracts

import (
	"net/http"
	"strconv"

	"github.com/custodr-app/api/internal/shared/errors"
	"github.com/labstack/echo/v4"
)

// Handler handles contract-related HTTP requests.
type Handler struct {
	service Service
}

// NewHandler creates a new contracts handler instance.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers contract routes under the given authenticated group.
func (h *Handler) RegisterRoutes(g *echo.Group) {
	g.GET("/contracts", h.List)
	g.POST("/contracts", h.Create)
	g.GET("/contracts/upcoming", h.Upcoming)
	g.GET("/contracts/:id", h.Get)
	g.PUT("/contracts/:id", h.Update)
	g.DELETE("/contracts/:id", h.Delete)

	g.GET("/contracts/:id/shares", h.ListShares)
	g.POST("/contracts/:id/shares", h.CreateShare)
	g.DELETE("/contracts/:id/shares/:shareId", h.RevokeShare)

	g.GET("/contracts/:id/audit", h.ListAudit)
}

// userID extracts the authenticated user ID from the Echo context.
func userID(c echo.Context) string {
	return c.Get("user_id").(string)
}

// userEmail extracts the authenticated user's email from the Echo context.
func userEmail(c echo.Context) string {
	email, _ := c.Get("user_email").(string)
	return email
}

// errorResponse wraps API errors in the standard response format.
type errorResponse struct {
	Error *errors.APIError `json:"error"`
}

// writeError writes a standardized error response.
func writeError(c echo.Context, err error) error {
	if apiErr, ok := err.(*errors.APIError); ok {
		return c.JSON(apiErr.HTTPStatus(), errorResponse{Error: apiErr})
	}
	return c.JSON(http.StatusInternalServerError, errorResponse{
		Error: errors.NewInternalError("an unexpected error occurred"),
	})
}

// List godoc
// @Summary List contracts
// @Description List contracts visible to the authenticated user (owned + shared)
// @Tags Contracts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param status query string false "Filter by status"
// @Param category query string false "Filter by category"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} ListResponse
// @Failure 401 {object} errorResponse
// @Router /api/v1/contracts [get]
func (h *Handler) List(c echo.Context) error {
	filters := map[string]string{}
	if status := c.QueryParam("status"); status != "" {
		filters["status"] = status
	}
	if category := c.QueryParam("category"); category != "" {
		filters["category"] = category
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))

	resp, err := h.service.List(c.Request().Context(), userID(c), userEmail(c), filters, page, limit)
	if err != nil {
		return writeError(c, err)
	}
	return c.JSON(http.StatusOK, resp)
}

// Create godoc
// @Summary Create a contract
// @Description Create a new contract
// @Tags Contracts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateRequest true "Contract"
// @Success 201 {object} Contract
// @Failure 400 {object} errorResponse
// @Failure 401 {object} errorResponse
// @Router /api/v1/contracts [post]
func (h *Handler) Create(c echo.Context) error {
	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Error: errors.NewValidationError("invalid request body", nil),
		})
	}

	contract, err := h.service.Create(c.Request().Context(), userID(c), &req)
	if err != nil {
		return writeError(c, err)
	}
	return c.JSON(http.StatusCreated, contract)
}

// Get godoc
// @Summary Get a contract
// @Description Retrieve a single contract (owned or shared)
// @Tags Contracts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contract ID"
// @Success 200 {object} Contract
// @Failure 404 {object} errorResponse
// @Failure 401 {object} errorResponse
// @Router /api/v1/contracts/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	contract, err := h.service.GetByID(c.Request().Context(), userID(c), userEmail(c), c.Param("id"))
	if err != nil {
		return writeError(c, err)
	}
	return c.JSON(http.StatusOK, contract)
}

// Update godoc
// @Summary Update a contract
// @Description Update a contract owned by the authenticated user
// @Tags Contracts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contract ID"
// @Param request body UpdateRequest true "Contract"
// @Success 200 {object} Contract
// @Failure 400 {object} errorResponse
// @Failure 404 {object} errorResponse
// @Router /api/v1/contracts/{id} [put]
func (h *Handler) Update(c echo.Context) error {
	var req UpdateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Error: errors.NewValidationError("invalid request body", nil),
		})
	}

	contract, err := h.service.Update(c.Request().Context(), userID(c), c.Param("id"), &req)
	if err != nil {
		return writeError(c, err)
	}
	return c.JSON(http.StatusOK, contract)
}

// Delete godoc
// @Summary Delete a contract
// @Description Soft-delete a contract owned by the authenticated user
// @Tags Contracts
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contract ID"
// @Success 204 "No Content"
// @Failure 404 {object} errorResponse
// @Router /api/v1/contracts/{id} [delete]
func (h *Handler) Delete(c echo.Context) error {
	if err := h.service.Delete(c.Request().Context(), userID(c), c.Param("id")); err != nil {
		return writeError(c, err)
	}
	return c.NoContent(http.StatusNoContent)
}

// Upcoming is a placeholder for the /contracts/upcoming endpoint.
func (h *Handler) Upcoming(c echo.Context) error {
	// Deferred: aggregation over contracts with upcoming deadlines.
	return c.JSON(http.StatusNotImplemented, errorResponse{
		Error: errors.NewInternalError("not implemented"),
	})
}

// ListShares godoc
// @Summary List shares
// @Description List active shares for a contract (owner only)
// @Tags Contracts
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contract ID"
// @Success 200 {object} map[string][]Share
// @Failure 404 {object} errorResponse
// @Router /api/v1/contracts/{id}/shares [get]
func (h *Handler) ListShares(c echo.Context) error {
	shares, err := h.service.ListShares(c.Request().Context(), userID(c), c.Param("id"))
	if err != nil {
		return writeError(c, err)
	}
	return c.JSON(http.StatusOK, map[string][]Share{"data": shares})
}

// CreateShare godoc
// @Summary Grant access
// @Description Grant read-only access to a contract by email (owner only)
// @Tags Contracts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contract ID"
// @Param request body CreateShareRequest true "Share"
// @Success 201 {object} Share
// @Failure 404 {object} errorResponse
// @Router /api/v1/contracts/{id}/shares [post]
func (h *Handler) CreateShare(c echo.Context) error {
	var req CreateShareRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Error: errors.NewValidationError("invalid request body", nil),
		})
	}

	share, err := h.service.CreateShare(c.Request().Context(), userID(c), c.Param("id"), &req)
	if err != nil {
		return writeError(c, err)
	}
	return c.JSON(http.StatusCreated, share)
}

// RevokeShare godoc
// @Summary Revoke access
// @Description Revoke a share (owner only)
// @Tags Contracts
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contract ID"
// @Param shareId path string true "Share ID"
// @Success 204 "No Content"
// @Failure 404 {object} errorResponse
// @Router /api/v1/contracts/{id}/shares/{shareId} [delete]
func (h *Handler) RevokeShare(c echo.Context) error {
	if err := h.service.RevokeShare(c.Request().Context(), userID(c), c.Param("id"), c.Param("shareId")); err != nil {
		return writeError(c, err)
	}
	return c.NoContent(http.StatusNoContent)
}

// ListAudit godoc
// @Summary List activity
// @Description Get the activity feed for a contract (owner or grantee)
// @Tags Contracts
// @Produce json
// @Security BearerAuth
// @Param id path string true "Contract ID"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} AuditListResponse
// @Failure 404 {object} errorResponse
// @Router /api/v1/contracts/{id}/audit [get]
func (h *Handler) ListAudit(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))

	resp, err := h.service.ListAudit(c.Request().Context(), userID(c), userEmail(c), c.Param("id"), page, limit)
	if err != nil {
		return writeError(c, err)
	}
	return c.JSON(http.StatusOK, resp)
}
