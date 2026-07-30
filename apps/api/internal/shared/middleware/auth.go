package middleware

import (
	"net/http"
	"strings"

	"github.com/custodr-app/api/internal/auth"
	"github.com/custodr-app/api/internal/shared/errors"
	"github.com/labstack/echo/v4"
)

// errorResponse wraps API errors in the standard response format
type errorResponse struct {
	Error *errors.APIError `json:"error"`
}

// AuthMiddleware creates an Echo middleware that verifies Firebase ID tokens
// and sets the internal user ID and Firebase UID in the request context.
//
// The middleware:
//  1. Extracts the Bearer token from the Authorization header
//  2. Verifies it using the Firebase TokenVerifier
//  3. Looks up the internal user by Firebase UID
//  4. Sets "user_id" and "firebase_uid" in the Echo context
//
// Returns 401 if the token is missing, invalid, or the user is not found.
func AuthMiddleware(verifier auth.TokenVerifier, repo auth.Repository) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Extract Bearer token from Authorization header
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, errorResponse{
					Error: errors.NewUnauthorizedError("missing authorization header"),
				})
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				return c.JSON(http.StatusUnauthorized, errorResponse{
					Error: errors.NewUnauthorizedError("invalid authorization header format"),
				})
			}

			token := parts[1]

			// Verify Firebase token
			firebaseUID, _, err := verifier.VerifyToken(c.Request().Context(), token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, errorResponse{
					Error: errors.NewUnauthorizedError("invalid or expired token"),
				})
			}

			// Look up internal user by Firebase UID
			user, err := repo.GetByExternalID(c.Request().Context(), "firebase", firebaseUID)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, errorResponse{
					Error: errors.NewInternalError("failed to lookup user"),
				})
			}

			if user == nil {
				return c.JSON(http.StatusUnauthorized, errorResponse{
					Error: errors.NewUnauthorizedError("user not found, please login first"),
				})
			}

			// Set user context values for downstream handlers
			c.Set("user_id", user.ID)
			c.Set("firebase_uid", firebaseUID)

			return next(c)
		}
	}
}
