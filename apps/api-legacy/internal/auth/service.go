package auth

import (
	"context"
	"fmt"
)

// service implements Service interface for authentication business logic
type service struct {
	repo     Repository
	verifier TokenVerifier
}

// NewService creates a new auth service instance
func NewService(repo Repository, verifier TokenVerifier) Service {
	return &service{
		repo:     repo,
		verifier: verifier,
	}
}

// Login verifies a Firebase token and returns user information.
// If the user doesn't exist, it auto-provisions a new user record.
// If the user exists, it updates their email and verification status if changed.
func (s *service) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	// Verify Firebase token and extract UID + email
	firebaseUID, email, err := s.verifier.VerifyToken(ctx, req.FirebaseToken)
	if err != nil {
		return nil, fmt.Errorf("invalid firebase token: %w", err)
	}

	// Look up existing user by Firebase UID
	user, err := s.repo.GetByExternalID(ctx, "firebase", firebaseUID)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup user: %w", err)
	}

	// Auto-provision new user if not found
	if user == nil {
		user = &User{
			ExternalAuthProvider: "firebase",
			ExternalSubjectID:    firebaseUID,
			Email:                email,
			EmailVerified:        true, // Firebase already verified the email
		}

		if err := s.repo.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	} else {
		// Update user if email or verification status changed
		if user.Email != email || !user.EmailVerified {
			user.Email = email
			user.EmailVerified = true

			if err := s.repo.Update(ctx, user); err != nil {
				return nil, fmt.Errorf("failed to update user: %w", err)
			}
		}
	}

	return &LoginResponse{
		UserID:    user.ID,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	}, nil
}
