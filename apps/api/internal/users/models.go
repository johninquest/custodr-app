package users

import (
	"context"
	"time"
)

// User represents a user profile
type User struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	EmailVerified bool       `json:"email_verified"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`
}

// Service handles user business logic
type Service interface {
	GetProfile(ctx context.Context, userID string) (*User, error)
	DeleteAccount(ctx context.Context, userID string) error
}

// Repository handles user persistence
type Repository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	Delete(ctx context.Context, id string) error
	HardDelete(ctx context.Context, id string) error
}
