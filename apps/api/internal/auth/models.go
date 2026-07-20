package auth

import (
	"context"
	"time"
)

// User represents an authenticated user
type User struct {
	ID                   string     `json:"id"`
	ExternalAuthProvider string     `json:"external_auth_provider"`
	ExternalSubjectID    string     `json:"external_subject_id"`
	Email                string     `json:"email"`
	EmailVerified        bool       `json:"email_verified"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	DeletedAt            *time.Time `json:"deleted_at,omitempty"`
}

// LoginRequest represents a login request payload
type LoginRequest struct {
	FirebaseToken string `json:"firebase_token" validate:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// TokenVerifier verifies Firebase tokens
type TokenVerifier interface {
	VerifyToken(ctx context.Context, token string) (string, string, error) // returns uid, email, error
}

// Service handles authentication business logic
type Service interface {
	Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error)
}

// Repository handles user persistence
type Repository interface {
	GetByExternalID(ctx context.Context, provider, externalID string) (*User, error)
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
}
