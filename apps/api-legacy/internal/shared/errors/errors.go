package errors

import (
	"net/http"
)

// APIError represents a standardized API error response
type APIError struct {
	Code    string        `json:"code"`
	Message string        `json:"message"`
	Details []ErrorDetail `json:"details,omitempty"`
}

// ErrorDetail provides field-specific error information
type ErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Error implements the error interface
func (e *APIError) Error() string {
	return e.Message
}

// NewValidationError creates a validation error
func NewValidationError(message string, details []ErrorDetail) *APIError {
	return &APIError{
		Code:    "VALIDATION_ERROR",
		Message: message,
		Details: details,
	}
}

// NewUnauthorizedError creates an unauthorized error
func NewUnauthorizedError(message string) *APIError {
	return &APIError{
		Code:    "UNAUTHORIZED",
		Message: message,
	}
}

// NewNotFoundError creates a not found error
func NewNotFoundError(message string) *APIError {
	return &APIError{
		Code:    "NOT_FOUND",
		Message: message,
	}
}

// NewInternalError creates an internal server error
func NewInternalError(message string) *APIError {
	return &APIError{
		Code:    "INTERNAL_ERROR",
		Message: message,
	}
}

// HTTPStatus returns the HTTP status code for an error
func (e *APIError) HTTPStatus() int {
	switch e.Code {
	case "VALIDATION_ERROR":
		return http.StatusBadRequest
	case "UNAUTHORIZED":
		return http.StatusUnauthorized
	case "FORBIDDEN":
		return http.StatusForbidden
	case "NOT_FOUND":
		return http.StatusNotFound
	case "CONFLICT":
		return http.StatusConflict
	case "RATE_LIMIT_EXCEEDED":
		return http.StatusTooManyRequests
	default:
		return http.StatusInternalServerError
	}
}
