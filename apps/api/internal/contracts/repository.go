package contracts

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/custodr-app/api/internal/shared/ids"
)

// repository implements Repository for contract persistence on PostgreSQL.
type repository struct {
	db *sql.DB
}

// NewRepository creates a new contracts repository instance.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

const contractColumns = `
	id, user_id, name, category, provider, start_date, renewal_date,
	cancellation_deadline, cost, currency, billing_frequency, status, notes,
	created_at, updated_at, deleted_at
`

// scanContract maps a single row to a Contract, reading cost as integer cents.
type rowScanner interface {
	Scan(dest ...any) error
}

func scanContract(row rowScanner) (*Contract, error) {
	var c Contract
	var costCents int64
	var startDate, renewalDate time.Time
	var cancellationDeadline sql.NullTime

	err := row.Scan(
		&c.ID,
		&c.UserID,
		&c.Name,
		&c.Category,
		&c.Provider,
		&startDate,
		&renewalDate,
		&cancellationDeadline,
		&costCents,
		&c.Currency,
		&c.BillingFrequency,
		&c.Status,
		&c.Notes,
		&c.CreatedAt,
		&c.UpdatedAt,
		&c.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	c.StartDate = startDate
	c.RenewalDate = renewalDate
	if cancellationDeadline.Valid {
		c.CancellationDeadline = &cancellationDeadline.Time
	}
	c.Cost = centsToDecimal(costCents)

	return &c, nil
}

// Create inserts a new contract.
func (r *repository) Create(ctx context.Context, c *Contract) error {
	if c.ID == "" {
		c.ID = ids.New()
	}
	now := time.Now().UTC()
	c.CreatedAt = now
	c.UpdatedAt = now
	c.Status = "active"

	costCents := decimalToCents(c.Cost)

	query := `
		INSERT INTO contracts (
			id, user_id, name, category, provider, start_date, renewal_date,
			cancellation_deadline, cost, currency, billing_frequency, status, notes,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	_, err := r.db.ExecContext(ctx, query,
		c.ID,
		c.UserID,
		c.Name,
		c.Category,
		c.Provider,
		c.StartDate,
		c.RenewalDate,
		c.CancellationDeadline,
		costCents,
		c.Currency,
		c.BillingFrequency,
		c.Status,
		c.Notes,
		c.CreatedAt,
		c.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert contract: %w", err)
	}

	return nil
}

// GetByID retrieves a contract by ID (no ownership check).
func (r *repository) GetByID(ctx context.Context, id string) (*Contract, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM contracts WHERE id = $1 AND deleted_at IS NULL
	`, contractColumns)

	row := r.db.QueryRowContext(ctx, query, id)
	c, err := scanContract(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query contract by ID: %w", err)
	}
	return c, nil
}

// GetByIDAndUserOrGrantee retrieves a contract only if the user owns it or has
// an active share for their email.
func (r *repository) GetByIDAndUserOrGrantee(ctx context.Context, id, userID, userEmail string) (*Contract, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM contracts c
		WHERE c.id = $1 AND c.deleted_at IS NULL
		  AND (
		    c.user_id = $2
		    OR EXISTS (
		      SELECT 1 FROM contract_shares cs
		      WHERE cs.contract_id = c.id
		        AND cs.grantee_email = $3
		        AND cs.revoked_at IS NULL
		    )
		  )
	`, contractColumns)

	row := r.db.QueryRowContext(ctx, query, id, userID, normalizeEmail(userEmail))
	c, err := scanContract(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query visible contract: %w", err)
	}
	return c, nil
}

// List returns contracts owned by the user or shared with them, paginated.
func (r *repository) List(ctx context.Context, userID, userEmail string, filters map[string]string, offset, limit int) ([]Contract, int, error) {
	email := normalizeEmail(userEmail)

	where := []string{
		"(c.user_id = $1 OR EXISTS (SELECT 1 FROM contract_shares cs WHERE cs.contract_id = c.id AND cs.grantee_email = $2 AND cs.revoked_at IS NULL))",
		"c.deleted_at IS NULL",
	}
	args := []any{userID, email}

	if status, ok := filters["status"]; ok && status != "" {
		args = append(args, status)
		where = append(where, fmt.Sprintf("c.status = $%d", len(args)))
	}
	if category, ok := filters["category"]; ok && category != "" {
		args = append(args, category)
		where = append(where, fmt.Sprintf("c.category = $%d", len(args)))
	}

	whereClause := strings.Join(where, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM contracts c WHERE %s`, whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count contracts: %w", err)
	}

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM contracts c
		WHERE %s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, contractColumns, whereClause, len(args)+1, len(args)+2)

	listArgs := append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query contracts: %w", err)
	}
	defer rows.Close()

	contracts := make([]Contract, 0)
	for rows.Next() {
		c, err := scanContract(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan contract: %w", err)
		}
		contracts = append(contracts, *c)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate contracts: %w", err)
	}

	return contracts, total, nil
}

// Update updates an existing contract.
func (r *repository) Update(ctx context.Context, c *Contract) error {
	c.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE contracts
		SET name = $1, category = $2, provider = $3, start_date = $4,
		    renewal_date = $5, cancellation_deadline = $6, cost = $7,
		    currency = $8, billing_frequency = $9, status = $10, notes = $11,
		    updated_at = $12
		WHERE id = $13 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query,
		c.Name,
		c.Category,
		c.Provider,
		c.StartDate,
		c.RenewalDate,
		c.CancellationDeadline,
		decimalToCents(c.Cost),
		c.Currency,
		c.BillingFrequency,
		c.Status,
		c.Notes,
		c.UpdatedAt,
		c.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update contract: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// SoftDelete soft-deletes a contract by ID.
func (r *repository) SoftDelete(ctx context.Context, id string) error {
	query := `UPDATE contracts SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to soft-delete contract: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// SoftDeleteAudit soft-deletes audit rows for a contract.
func (r *repository) SoftDeleteAudit(ctx context.Context, contractID string) error {
	query := `UPDATE audit_logs SET deleted_at = now() WHERE entity_type = 'contract' AND entity_id = $1 AND deleted_at IS NULL`

	_, err := r.db.ExecContext(ctx, query, contractID)
	if err != nil {
		return fmt.Errorf("failed to soft-delete audit rows: %w", err)
	}
	return nil
}

// ListShares returns active shares for a contract.
func (r *repository) ListShares(ctx context.Context, contractID string) ([]Share, error) {
	query := `
		SELECT id, contract_id, grantee_email, role, granted_by, granted_at, revoked_at
		FROM contract_shares
		WHERE contract_id = $1 AND revoked_at IS NULL
		ORDER BY granted_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to query shares: %w", err)
	}
	defer rows.Close()

	shares := make([]Share, 0)
	for rows.Next() {
		var s Share
		if err := rows.Scan(&s.ID, &s.ContractID, &s.GranteeEmail, &s.Role, &s.GrantedBy, &s.GrantedAt, &s.RevokedAt); err != nil {
			return nil, fmt.Errorf("failed to scan share: %w", err)
		}
		shares = append(shares, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate shares: %w", err)
	}
	return shares, nil
}

// CreateShare inserts a new (or re-activates an existing) share.
func (r *repository) CreateShare(ctx context.Context, share *Share) error {
	if share.ID == "" {
		share.ID = ids.New()
	}
	share.GrantedAt = time.Now().UTC()
	share.GranteeEmail = normalizeEmail(share.GranteeEmail)

	// Upsert: if a (possibly revoked) share exists for this email, reactivate it;
	// otherwise insert a new one.
	query := `
		INSERT INTO contract_shares (id, contract_id, grantee_email, role, granted_by, granted_at, revoked_at)
		VALUES ($1, $2, $3, 'viewer', $4, $5, NULL)
		ON CONFLICT (contract_id, grantee_email)
		DO UPDATE SET role = 'viewer', granted_by = $4, granted_at = $5, revoked_at = NULL
		RETURNING id, granted_at
	`

	err := r.db.QueryRowContext(ctx, query,
		share.ID, share.ContractID, share.GranteeEmail, share.GrantedBy, share.GrantedAt,
	).Scan(&share.ID, &share.GrantedAt)
	if err != nil {
		return fmt.Errorf("failed to create share: %w", err)
	}
	return nil
}

// GetShare retrieves a share by ID.
func (r *repository) GetShare(ctx context.Context, shareID string) (*Share, error) {
	query := `
		SELECT id, contract_id, grantee_email, role, granted_by, granted_at, revoked_at
		FROM contract_shares
		WHERE id = $1
	`

	var s Share
	err := r.db.QueryRowContext(ctx, query, shareID).Scan(
		&s.ID, &s.ContractID, &s.GranteeEmail, &s.Role, &s.GrantedBy, &s.GrantedAt, &s.RevokedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query share: %w", err)
	}
	return &s, nil
}

// RevokeShare sets revoked_at on an active share.
func (r *repository) RevokeShare(ctx context.Context, shareID string) error {
	query := `UPDATE contract_shares SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, shareID)
	if err != nil {
		return fmt.Errorf("failed to revoke share: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// ListAudit returns the activity feed for a contract, paginated.
func (r *repository) ListAudit(ctx context.Context, contractID string, offset, limit int) ([]AuditEntry, int, error) {
	countQuery := `
		SELECT COUNT(*)
		FROM audit_logs
		WHERE entity_type = 'contract' AND entity_id = $1 AND deleted_at IS NULL
	`
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, contractID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count audit entries: %w", err)
	}

	query := `
		SELECT id, entity_type, entity_id, actor_user_id, action, field, before_value, after_value, created_at
		FROM audit_logs
		WHERE entity_type = 'contract' AND entity_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, contractID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query audit entries: %w", err)
	}
	defer rows.Close()

	entries := make([]AuditEntry, 0)
	for rows.Next() {
		var e AuditEntry
		var actorUserID, field, beforeValue, afterValue sql.NullString
		if err := rows.Scan(
			&e.ID, &e.EntityType, &e.EntityID, &actorUserID, &e.Action,
			&field, &beforeValue, &afterValue, &e.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan audit entry: %w", err)
		}
		if actorUserID.Valid {
			e.ActorUserID = &actorUserID.String
		}
		if field.Valid {
			e.Field = &field.String
		}
		if beforeValue.Valid {
			e.BeforeValue = &beforeValue.String
		}
		if afterValue.Valid {
			e.AfterValue = &afterValue.String
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate audit entries: %w", err)
	}

	return entries, total, nil
}

// CreateAudit inserts a single audit entry.
func (r *repository) CreateAudit(ctx context.Context, entry *AuditEntry) error {
	if entry.ID == "" {
		entry.ID = ids.New()
	}
	entry.CreatedAt = time.Now().UTC()

	query := `
		INSERT INTO audit_logs (id, entity_type, entity_id, actor_user_id, action, field, before_value, after_value, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := r.db.ExecContext(ctx, query,
		entry.ID, entry.EntityType, entry.EntityID, entry.ActorUserID, entry.Action,
		entry.Field, entry.BeforeValue, entry.AfterValue, entry.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert audit entry: %w", err)
	}
	return nil
}

// centsToDecimal converts integer cents to a decimal amount (1599 -> 15.99).
func centsToDecimal(cents int64) float64 {
	return math.Round(float64(cents)) / 100.0
}

// decimalToCents converts a decimal amount to integer cents (15.99 -> 1599).
func decimalToCents(amount float64) int64 {
	return int64(math.Round(amount * 100))
}

// normalizeEmail lowercases and trims an email for identity comparison.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
