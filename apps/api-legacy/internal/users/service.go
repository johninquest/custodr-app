package users

import (
	"context"
	"fmt"

	"github.com/custodr-app/api/internal/shared/errors"
	"github.com/custodr-app/api/internal/shared/ids"
)

// service implements Service interface for user business logic
type service struct {
	repo Repository
}

// NewService creates a new users service instance
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// GetProfile retrieves a user's profile by internal ID
func (s *service) GetProfile(ctx context.Context, userID string) (*User, error) {
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}

	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	return user, nil
}

// DeleteAccount permanently deletes a user's account and all associated data (GDPR)
func (s *service) DeleteAccount(ctx context.Context, userID string) error {
	// Hard delete removes the user and cascades to contracts, reminders, etc.
	if err := s.repo.HardDelete(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete account: %w", err)
	}

	return nil
}

// ListConsents returns a user's consent records.
func (s *service) ListConsents(ctx context.Context, userID string) ([]Consent, error) {
	consents, err := s.repo.ListConsents(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list consents: %w", err)
	}
	return consents, nil
}

// GrantConsent records a new consent grant.
func (s *service) GrantConsent(ctx context.Context, userID string, req *GrantConsentRequest) (*Consent, error) {
	if req.ConsentType == "" {
		return nil, errors.NewValidationError("consent_type is required", []errors.ErrorDetail{{Field: "consent_type", Message: "consent_type is required"}})
	}
	if req.ConsentType != "email_notifications" {
		return nil, errors.NewValidationError("invalid consent_type", []errors.ErrorDetail{{Field: "consent_type", Message: "must be email_notifications"}})
	}
	if req.Version == "" {
		return nil, errors.NewValidationError("version is required", []errors.ErrorDetail{{Field: "version", Message: "version is required"}})
	}

	consent := &Consent{
		ID:          ids.New(),
		UserID:      userID,
		ConsentType: req.ConsentType,
		Version:     req.Version,
	}
	if err := s.repo.GrantConsent(ctx, consent); err != nil {
		return nil, fmt.Errorf("failed to grant consent: %w", err)
	}
	return consent, nil
}

// WithdrawConsent withdraws a consent of the given type.
func (s *service) WithdrawConsent(ctx context.Context, userID, consentType string) error {
	if err := s.repo.WithdrawConsent(ctx, userID, consentType); err != nil {
		return errors.NewNotFoundError("no active consent of type " + consentType)
	}
	return nil
}
