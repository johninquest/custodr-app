package users

import (
	"context"
	"fmt"
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
	// Hard delete removes the user and cascades to commitments, reminders, etc.
	if err := s.repo.HardDelete(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete account: %w", err)
	}

	return nil
}
