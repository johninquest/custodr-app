package auth

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
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
		SELECT id, external_auth_provider, external_subject_id, email, email_verified,
		       created_at, updated_at, deleted_at
		FROM users
		WHERE external_auth_provider = ? AND external_subject_id = ? AND deleted_at IS NULL
	`

	var user User
	var createdAt, updatedAt string
	var deletedAt sql.NullString
	var emailVerified int

	err := r.db.QueryRowContext(ctx, query, provider, externalID).Scan(
		&user.ID,
		&user.ExternalAuthProvider,
		&user.ExternalSubjectID,
		&user.Email,
		&emailVerified,
		&createdAt,
		&updatedAt,
		&deletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query user by external ID: %w", err)
	}

	user.EmailVerified = emailVerified == 1
	user.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	user.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	if deletedAt.Valid {
		t, _ := time.Parse(time.RFC3339, deletedAt.String)
		user.DeletedAt = &t
	}

	return &user, nil
}

// Create inserts a new user record
func (r *repository) Create(ctx context.Context, user *User) error {
	if user.ID == "" {
		user.ID = uuid.NewString()
	}

	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	query := `
		INSERT INTO users (
			id, external_auth_provider, external_subject_id, email, email_verified,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	emailVerified := 0
	if user.EmailVerified {
		emailVerified = 1
	}

	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.ExternalAuthProvider,
		user.ExternalSubjectID,
		user.Email,
		emailVerified,
		user.CreatedAt.Format(time.RFC3339),
		user.UpdatedAt.Format(time.RFC3339),
	)

	if err != nil {
		return fmt.Errorf("failed to insert user: %w", err)
	}

	return nil
}

// Update updates an existing user record
func (r *repository) Update(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE users
		SET email = ?, email_verified = ?, updated_at = ?
		WHERE id = ? AND deleted_at IS NULL
	`

	emailVerified := 0
	if user.EmailVerified {
		emailVerified = 1
	}

	result, err := r.db.ExecContext(ctx, query,
		user.Email,
		emailVerified,
		user.UpdatedAt.Format(time.RFC3339),
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
