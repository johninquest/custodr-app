package contracts

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/custodr-app/api/internal/shared/errors"
	"github.com/custodr-app/api/internal/shared/ids"
)

// service implements Service for contract business logic.
type service struct {
	repo Repository
}

// NewService creates a new contracts service instance.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// parseDate parses a YYYY-MM-DD date string.
func parseDate(s string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date %q: %w", s, err)
	}
	return t, nil
}

// Create creates a contract and records an audit entry.
func (s *service) Create(ctx context.Context, userID string, req *CreateRequest) (*Contract, error) {
	if req.Name == "" {
		return nil, errors.NewValidationError("name is required", []errors.ErrorDetail{
			{Field: "name", Message: "name is required"},
		})
	}
	if !IsValidCategory(req.Category) {
		return nil, errors.NewValidationError("invalid category", []errors.ErrorDetail{
			{Field: "category", Message: "category must be one of the MVP starter set"},
		})
	}

	startDate, err := parseDate(req.StartDate)
	if err != nil {
		return nil, errors.NewValidationError("invalid start_date", []errors.ErrorDetail{
			{Field: "start_date", Message: "must be YYYY-MM-DD"},
		})
	}
	renewalDate, err := parseDate(req.RenewalDate)
	if err != nil {
		return nil, errors.NewValidationError("invalid renewal_date", []errors.ErrorDetail{
			{Field: "renewal_date", Message: "must be YYYY-MM-DD"},
		})
	}
	if !renewalDate.After(startDate) {
		return nil, errors.NewValidationError("renewal_date must be after start_date", []errors.ErrorDetail{
			{Field: "renewal_date", Message: "must be after start_date"},
		})
	}

	var cancellationDeadline *time.Time
	if req.CancellationDeadline != "" {
		cd, err := parseDate(req.CancellationDeadline)
		if err != nil {
			return nil, errors.NewValidationError("invalid cancellation_deadline", []errors.ErrorDetail{
				{Field: "cancellation_deadline", Message: "must be YYYY-MM-DD"},
			})
		}
		cancellationDeadline = &cd
	}

	contract := &Contract{
		ID:                   ids.New(),
		UserID:               userID,
		Name:                 req.Name,
		Category:             req.Category,
		Provider:             req.Provider,
		StartDate:            startDate,
		RenewalDate:          renewalDate,
		CancellationDeadline: cancellationDeadline,
		Cost:                 req.Cost,
		Currency:             req.Currency,
		BillingFrequency:     req.BillingFrequency,
		Status:               "active",
		Notes:                req.Notes,
	}

	if err := s.repo.Create(ctx, contract); err != nil {
		return nil, fmt.Errorf("failed to create contract: %w", err)
	}

	if err := s.repo.CreateAudit(ctx, &AuditEntry{
		ID:          ids.New(),
		EntityType:  "contract",
		EntityID:    contract.ID,
		ActorUserID: &userID,
		Action:      "created",
	}); err != nil {
		return nil, fmt.Errorf("failed to record audit: %w", err)
	}

	return contract, nil
}

// GetByID returns a contract only if the user owns it or has an active share.
func (s *service) GetByID(ctx context.Context, userID, email, id string) (*Contract, error) {
	c, err := s.repo.GetByIDAndUserOrGrantee(ctx, id, userID, email)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	if c == nil {
		return nil, errors.NewNotFoundError("contract not found")
	}
	return c, nil
}

// List returns contracts owned by or shared with the user.
func (s *service) List(ctx context.Context, userID, email string, filters map[string]string, page, limit int) (*ListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	contracts, total, err := s.repo.List(ctx, userID, email, filters, offset, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list contracts: %w", err)
	}

	return &ListResponse{
		Data: contracts,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages(total, limit),
		},
	}, nil
}

// Update updates a contract owned by the user and records field-level audit.
func (s *service) Update(ctx context.Context, userID, id string, req *UpdateRequest) (*Contract, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	if existing == nil || existing.UserID != userID {
		return nil, errors.NewNotFoundError("contract not found")
	}

	startDate, err := parseDate(req.StartDate)
	if err != nil {
		return nil, errors.NewValidationError("invalid start_date", []errors.ErrorDetail{{Field: "start_date", Message: "must be YYYY-MM-DD"}})
	}
	renewalDate, err := parseDate(req.RenewalDate)
	if err != nil {
		return nil, errors.NewValidationError("invalid renewal_date", []errors.ErrorDetail{{Field: "renewal_date", Message: "must be YYYY-MM-DD"}})
	}
	if !renewalDate.After(startDate) {
		return nil, errors.NewValidationError("renewal_date must be after start_date", []errors.ErrorDetail{{Field: "renewal_date", Message: "must be after start_date"}})
	}
	var cancellationDeadline *time.Time
	if req.CancellationDeadline != "" {
		cd, err := parseDate(req.CancellationDeadline)
		if err != nil {
			return nil, errors.NewValidationError("invalid cancellation_deadline", []errors.ErrorDetail{{Field: "cancellation_deadline", Message: "must be YYYY-MM-DD"}})
		}
		cancellationDeadline = &cd
	}
	if !IsValidCategory(req.Category) {
		return nil, errors.NewValidationError("invalid category", []errors.ErrorDetail{{Field: "category", Message: "invalid category"}})
	}

	updated := &Contract{
		ID:                   existing.ID,
		UserID:               existing.UserID,
		Name:                 req.Name,
		Category:             req.Category,
		Provider:             req.Provider,
		StartDate:            startDate,
		RenewalDate:          renewalDate,
		CancellationDeadline: cancellationDeadline,
		Cost:                 req.Cost,
		Currency:             req.Currency,
		BillingFrequency:     req.BillingFrequency,
		Status:               req.Status,
		Notes:                req.Notes,
	}

	if err := s.repo.Update(ctx, updated); err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NewNotFoundError("contract not found")
		}
		return nil, fmt.Errorf("failed to update contract: %w", err)
	}

	// Record field-level diffs.
	diffs := fieldDiffs(existing, updated)
	for field, change := range diffs {
		if err := s.repo.CreateAudit(ctx, &AuditEntry{
			ID:          ids.New(),
			EntityType:  "contract",
			EntityID:    updated.ID,
			ActorUserID: &userID,
			Action:      "updated",
			Field:       strPtr(field),
			BeforeValue: strPtr(change.before),
			AfterValue:  strPtr(change.after),
		}); err != nil {
			return nil, fmt.Errorf("failed to record audit: %w", err)
		}
	}

	// Reload to return canonical timestamps.
	return s.repo.GetByID(ctx, id)
}

// Delete soft-deletes a contract owned by the user and its audit rows.
func (s *service) Delete(ctx context.Context, userID, id string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get contract: %w", err)
	}
	if existing == nil || existing.UserID != userID {
		return errors.NewNotFoundError("contract not found")
	}

	if err := s.repo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("failed to soft-delete contract: %w", err)
	}
	if err := s.repo.SoftDeleteAudit(ctx, id); err != nil {
		return fmt.Errorf("failed to soft-delete audit rows: %w", err)
	}
	return nil
}

// ListShares returns active shares for a contract owned by the user.
func (s *service) ListShares(ctx context.Context, userID, contractID string) ([]Share, error) {
	existing, err := s.repo.GetByID(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	if existing == nil || existing.UserID != userID {
		return nil, errors.NewNotFoundError("contract not found")
	}
	return s.repo.ListShares(ctx, contractID)
}

// CreateShare grants read-only access by email (owner only).
func (s *service) CreateShare(ctx context.Context, userID, contractID string, req *CreateShareRequest) (*Share, error) {
	existing, err := s.repo.GetByID(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	if existing == nil || existing.UserID != userID {
		return nil, errors.NewNotFoundError("contract not found")
	}
	if req.GranteeEmail == "" {
		return nil, errors.NewValidationError("grantee_email is required", []errors.ErrorDetail{{Field: "grantee_email", Message: "grantee_email is required"}})
	}

	share := &Share{
		ContractID:   contractID,
		GranteeEmail: req.GranteeEmail,
		Role:         "viewer",
		GrantedBy:    userID,
	}
	if err := s.repo.CreateShare(ctx, share); err != nil {
		return nil, fmt.Errorf("failed to create share: %w", err)
	}

	if err := s.repo.CreateAudit(ctx, &AuditEntry{
		ID:          ids.New(),
		EntityType:  "contract_share",
		EntityID:    share.ID,
		ActorUserID: &userID,
		Action:      "shared",
		Field:       strPtr("grantee_email"),
		AfterValue:  strPtr(req.GranteeEmail),
	}); err != nil {
		return nil, fmt.Errorf("failed to record audit: %w", err)
	}

	return share, nil
}

// RevokeShare revokes a share (owner only).
func (s *service) RevokeShare(ctx context.Context, userID, contractID, shareID string) error {
	existing, err := s.repo.GetByID(ctx, contractID)
	if err != nil {
		return fmt.Errorf("failed to get contract: %w", err)
	}
	if existing == nil || existing.UserID != userID {
		return errors.NewNotFoundError("contract not found")
	}

	share, err := s.repo.GetShare(ctx, shareID)
	if err != nil {
		return fmt.Errorf("failed to get share: %w", err)
	}
	if share == nil || share.ContractID != contractID {
		return errors.NewNotFoundError("share not found")
	}

	if err := s.repo.RevokeShare(ctx, shareID); err != nil {
		return fmt.Errorf("failed to revoke share: %w", err)
	}

	if err := s.repo.CreateAudit(ctx, &AuditEntry{
		ID:          ids.New(),
		EntityType:  "contract_share",
		EntityID:    shareID,
		ActorUserID: &userID,
		Action:      "revoked",
		Field:       strPtr("grantee_email"),
		BeforeValue: strPtr(share.GranteeEmail),
	}); err != nil {
		return fmt.Errorf("failed to record audit: %w", err)
	}

	return nil
}

// ListAudit returns the activity feed for a contract visible to the user.
func (s *service) ListAudit(ctx context.Context, userID, email, contractID string, page, limit int) (*AuditListResponse, error) {
	// The contract must be visible (owned or shared) to the caller.
	visible, err := s.repo.GetByIDAndUserOrGrantee(ctx, contractID, userID, email)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	if visible == nil {
		return nil, errors.NewNotFoundError("contract not found")
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	entries, total, err := s.repo.ListAudit(ctx, contractID, offset, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list audit: %w", err)
	}

	return &AuditListResponse{
		Data: entries,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages(total, limit),
		},
	}, nil
}

type fieldChange struct {
	before string
	after  string
}

// fieldDiffs compares two contracts and returns changed fields as strings.
func fieldDiffs(before, after *Contract) map[string]fieldChange {
	diffs := make(map[string]fieldChange)
	compare := func(field, b, a string) {
		if b != a {
			diffs[field] = fieldChange{before: b, after: a}
		}
	}
	compare("name", before.Name, after.Name)
	compare("category", before.Category, after.Category)
	compare("provider", before.Provider, after.Provider)
	compare("start_date", dateStr(before.StartDate), dateStr(after.StartDate))
	compare("renewal_date", dateStr(before.RenewalDate), dateStr(after.RenewalDate))
	compare("cancellation_deadline", datePtrStr(before.CancellationDeadline), datePtrStr(after.CancellationDeadline))
	compare("cost", fmt.Sprintf("%.2f", before.Cost), fmt.Sprintf("%.2f", after.Cost))
	compare("currency", before.Currency, after.Currency)
	compare("billing_frequency", before.BillingFrequency, after.BillingFrequency)
	compare("status", before.Status, after.Status)
	compare("notes", before.Notes, after.Notes)
	return diffs
}

func dateStr(t time.Time) string {
	return t.Format("2006-01-02")
}

func datePtrStr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02")
}

func strPtr(s string) *string {
	return &s
}

func totalPages(total, limit int) int {
	if limit <= 0 {
		return 0
	}
	pages := total / limit
	if total%limit != 0 {
		pages++
	}
	return pages
}
