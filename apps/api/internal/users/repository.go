package users

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// repository implements Repository interface for user persistence
type repository struct {
	db *sql.DB
}

// NewRepository creates a new users repository instance
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

// GetByID retrieves a user by internal ID
func (r *repository) GetByID(ctx context.Context, id string) (*User, error) {
	query := `
		SELECT id, email, email_verified, created_at, updated_at, deleted_at
		FROM users
		WHERE id = ? AND deleted_at IS NULL
	`

	var user User
	var createdAt, updatedAt string
	var deletedAt sql.NullString
	var emailVerified int

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
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
		return nil, fmt.Errorf("failed to query user by ID: %w", err)
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

// Delete soft-deletes a user by setting deleted_at
func (r *repository) Delete(ctx context.Context, id string) error {
	query := `UPDATE users SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to soft-delete user: %w", err)
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

// HardDelete permanently removes a user and all associated data.
// Relies on ON DELETE CASCADE for commitments, reminders, etc.
func (r *repository) HardDelete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = ?`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to hard-delete user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}
