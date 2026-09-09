package auth

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/custodr-app/api/internal/shared/ids"
)

// repository implements Repository interface for user persistence
type repository struct {
	db *sql.DB
}

// NewRepository creates a new auth repository instance
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

// GetByExternalID retrieves a user by external auth provider and subject ID
func (r *repository) GetByExternalID(ctx context.Context, provider, externalID string) (*User, error) {
	query := `
		SELECT id, external_auth_provider, external_subject_id, email, name, email_verified,
		       created_at, updated_at, deleted_at
		FROM users
		WHERE external_auth_provider = $1 AND external_subject_id = $2 AND deleted_at IS NULL
	`

	var user User
	var name sql.NullString

	err := r.db.QueryRowContext(ctx, query, provider, externalID).Scan(
		&user.ID,
		&user.ExternalAuthProvider,
		&user.ExternalSubjectID,
		&user.Email,
		&name,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query user by external ID: %w", err)
	}

	if name.Valid {
		user.Name = name.String
	}

	return &user, nil
}

// Create inserts a new user record
func (r *repository) Create(ctx context.Context, user *User) error {
	if user.ID == "" {
		user.ID = ids.New()
	}

	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	// Store email lowercase-normalized so identity comparison (e.g. contract
	// shares) is case-insensitive and deterministic.
	user.Email = normalizeEmail(user.Email)

	query := `
		INSERT INTO users (
			id, external_auth_provider, external_subject_id, email, name, email_verified,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.ExternalAuthProvider,
		user.ExternalSubjectID,
		user.Email,
		user.Name,
		user.EmailVerified,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to insert user: %w", err)
	}

	return nil
}

// Update updates an existing user record
func (r *repository) Update(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now().UTC()
	user.Email = normalizeEmail(user.Email)

	query := `
		UPDATE users
		SET email = $1, name = $2, email_verified = $3, updated_at = $4
		WHERE id = $5 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query,
		user.Email,
		user.Name,
		user.EmailVerified,
		user.UpdatedAt,
		user.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found or already deleted")
	}

	return nil
}

// normalizeEmail lowercases and trims an email address for identity purposes.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
