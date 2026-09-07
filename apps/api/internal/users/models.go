package users

import (
	"context"
	"time"
)

// User represents a user profile
type User struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	Name          string     `json:"name,omitempty"`
	EmailVerified bool       `json:"email_verified"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`
}

// Consent represents a recorded opt-in (Einwilligungserklärung).
type Consent struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	ConsentType string     `json:"consent_type"`
	Version     string     `json:"version"`
	GrantedAt   time.Time  `json:"granted_at"`
	WithdrawnAt *time.Time `json:"withdrawn_at,omitempty"`
}

// GrantConsentRequest represents a consent grant request.
type GrantConsentRequest struct {
	ConsentType string `json:"consent_type" validate:"required"`
	Version     string `json:"version" validate:"required"`
}

// Service handles user business logic
type Service interface {
	GetProfile(ctx context.Context, userID string) (*User, error)
	DeleteAccount(ctx context.Context, userID string) error

	ListConsents(ctx context.Context, userID string) ([]Consent, error)
	GrantConsent(ctx context.Context, userID string, req *GrantConsentRequest) (*Consent, error)
	WithdrawConsent(ctx context.Context, userID, consentType string) error
}

// Repository handles user persistence
type Repository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	Delete(ctx context.Context, id string) error
	HardDelete(ctx context.Context, id string) error

	ListConsents(ctx context.Context, userID string) ([]Consent, error)
	GrantConsent(ctx context.Context, consent *Consent) error
	WithdrawConsent(ctx context.Context, userID, consentType string) error
}
