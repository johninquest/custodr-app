package users

import (
	"context"
	"database/sql"
	"fmt"
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
		SELECT id, email, name, email_verified, created_at, updated_at, deleted_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`

	var user User
	var name sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
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
		return nil, fmt.Errorf("failed to query user by ID: %w", err)
	}

	if name.Valid {
		user.Name = name.String
	}

	return &user, nil
}

// Delete soft-deletes a user by setting deleted_at
func (r *repository) Delete(ctx context.Context, id string) error {
	query := `UPDATE users SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL`

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
// Relies on ON DELETE CASCADE for contracts, reminders, etc.
func (r *repository) HardDelete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = $1`

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

// ListConsents returns a user's consent records.
func (r *repository) ListConsents(ctx context.Context, userID string) ([]Consent, error) {
	query := `
		SELECT id, user_id, consent_type, version, granted_at, withdrawn_at
		FROM consents
		WHERE user_id = $1
		ORDER BY granted_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query consents: %w", err)
	}
	defer rows.Close()

	consents := make([]Consent, 0)
	for rows.Next() {
		var c Consent
		if err := rows.Scan(&c.ID, &c.UserID, &c.ConsentType, &c.Version, &c.GrantedAt, &c.WithdrawnAt); err != nil {
			return nil, fmt.Errorf("failed to scan consent: %w", err)
		}
		consents = append(consents, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate consents: %w", err)
	}
	return consents, nil
}

// GrantConsent records a new consent grant.
func (r *repository) GrantConsent(ctx context.Context, consent *Consent) error {
	query := `
		INSERT INTO consents (id, user_id, consent_type, version, granted_at)
		VALUES ($1, $2, $3, $4, now())
	`

	_, err := r.db.ExecContext(ctx, query, consent.ID, consent.UserID, consent.ConsentType, consent.Version)
	if err != nil {
		return fmt.Errorf("failed to grant consent: %w", err)
	}
	return nil
}

// WithdrawConsent sets withdrawn_at on the latest active consent of a type.
func (r *repository) WithdrawConsent(ctx context.Context, userID, consentType string) error {
	query := `
		UPDATE consents
		SET withdrawn_at = now()
		WHERE user_id = $1 AND consent_type = $2 AND withdrawn_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, userID, consentType)
	if err != nil {
		return fmt.Errorf("failed to withdraw consent: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("no active consent of type %s", consentType)
	}
	return nil
}
