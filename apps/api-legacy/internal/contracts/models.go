package contracts

import (
	"context"
	"time"
)

// ContractCategory values (MVP starter set, see docs/schema.md).
const (
	CategoryInsurance             = "insurance"
	CategoryElectricityContract   = "electricity_contract"
	CategoryGasContract           = "gas_contract"
	CategoryMobileContract        = "mobile_contract"
	CategoryStreamingSubscription = "streaming_subscription"
	CategoryOther                 = "other"
)

// validCategories is the authoritative set of category values accepted by the API.
// Unexported: IsValidCategory is the only intended consumer, and a mutable
// package-level set must not be modifiable by importing packages.
var validCategories = map[string]struct{}{
	CategoryInsurance:             {},
	CategoryElectricityContract:   {},
	CategoryGasContract:           {},
	CategoryMobileContract:        {},
	CategoryStreamingSubscription: {},
	CategoryOther:                 {},
}

// IsValidCategory reports whether the given category is in the MVP starter set.
func IsValidCategory(category string) bool {
	_, ok := validCategories[category]
	return ok
}

// Contract represents a recurring contract
type Contract struct {
	ID                   string     `json:"id"`
	UserID               string     `json:"user_id"`
	Name                 string     `json:"name"`
	Category             string     `json:"category"`
	Provider             string     `json:"provider"`
	StartDate            time.Time  `json:"start_date"`
	RenewalDate          time.Time  `json:"renewal_date"`
	CancellationDeadline *time.Time `json:"cancellation_deadline,omitempty"`
	Cost                 float64    `json:"cost"` // Decimal in API, stored as cents in DB
	Currency             string     `json:"currency"`
	BillingFrequency     string     `json:"billing_frequency"`
	Status               string     `json:"status"`
	Notes                string     `json:"notes,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	DeletedAt            *time.Time `json:"deleted_at,omitempty"`
}

// CreateRequest represents a create contract request
type CreateRequest struct {
	Name                 string  `json:"name" validate:"required,min=1,max=255"`
	Category             string  `json:"category" validate:"required"`
	Provider             string  `json:"provider" validate:"required,min=1,max=255"`
	StartDate            string  `json:"start_date" validate:"required"`
	RenewalDate          string  `json:"renewal_date" validate:"required"`
	CancellationDeadline string  `json:"cancellation_deadline,omitempty"`
	Cost                 float64 `json:"cost" validate:"required,gt=0"`
	Currency             string  `json:"currency" validate:"required"`
	BillingFrequency     string  `json:"billing_frequency" validate:"required"`
	Notes                string  `json:"notes,omitempty" validate:"max=1000"`
}

// UpdateRequest represents an update contract request
type UpdateRequest struct {
	Name                 string  `json:"name" validate:"required,min=1,max=255"`
	Category             string  `json:"category" validate:"required"`
	Provider             string  `json:"provider" validate:"required,min=1,max=255"`
	StartDate            string  `json:"start_date" validate:"required"`
	RenewalDate          string  `json:"renewal_date" validate:"required"`
	CancellationDeadline string  `json:"cancellation_deadline,omitempty"`
	Cost                 float64 `json:"cost" validate:"required,gt=0"`
	Currency             string  `json:"currency" validate:"required"`
	BillingFrequency     string  `json:"billing_frequency" validate:"required"`
	Status               string  `json:"status" validate:"required"`
	Notes                string  `json:"notes,omitempty" validate:"max=1000"`
}

// ListResponse represents a paginated list of contracts
type ListResponse struct {
	Data       []Contract `json:"data"`
	Pagination Pagination `json:"pagination"`
}

// AuditListResponse represents a paginated list of audit entries.
type AuditListResponse struct {
	Data       []AuditEntry `json:"data"`
	Pagination Pagination   `json:"pagination"`
}

// Pagination represents pagination metadata
type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// Share represents a read-only grant of a contract to another user by email.
type Share struct {
	ID           string     `json:"id"`
	ContractID   string     `json:"contract_id"`
	GranteeEmail string     `json:"grantee_email"`
	Role         string     `json:"role"`
	GrantedBy    string     `json:"granted_by"`
	GrantedAt    time.Time  `json:"granted_at"`
	RevokedAt    *time.Time `json:"revoked_at,omitempty"`
}

// CreateShareRequest represents a grant request.
type CreateShareRequest struct {
	GranteeEmail string `json:"grantee_email" validate:"required,email"`
}

// AuditEntry represents a single activity/audit record for a contract.
type AuditEntry struct {
	ID          string    `json:"id"`
	EntityType  string    `json:"entity_type"`
	EntityID    string    `json:"entity_id"`
	ActorUserID *string   `json:"actor_user_id,omitempty"`
	Action      string    `json:"action"`
	Field       *string   `json:"field,omitempty"`
	BeforeValue *string   `json:"before_value,omitempty"`
	AfterValue  *string   `json:"after_value,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// Service handles contract business logic.
//
// Methods that must resolve "owned OR shared" visibility (GetByID, List,
// ListAudit) accept the caller's email so shares can be matched against it.
type Service interface {
	Create(ctx context.Context, userID string, req *CreateRequest) (*Contract, error)
	GetByID(ctx context.Context, userID, email, id string) (*Contract, error)
	List(ctx context.Context, userID, email string, filters map[string]string, page, limit int) (*ListResponse, error)
	Update(ctx context.Context, userID, id string, req *UpdateRequest) (*Contract, error)
	Delete(ctx context.Context, userID, id string) error

	ListShares(ctx context.Context, userID, contractID string) ([]Share, error)
	CreateShare(ctx context.Context, userID, contractID string, req *CreateShareRequest) (*Share, error)
	RevokeShare(ctx context.Context, userID, contractID, shareID string) error

	ListAudit(ctx context.Context, userID, email, contractID string, page, limit int) (*AuditListResponse, error)
}

// Repository handles contract persistence
type Repository interface {
	Create(ctx context.Context, contract *Contract) error
	GetByID(ctx context.Context, id string) (*Contract, error)
	GetByIDAndUserOrGrantee(ctx context.Context, id, userID, userEmail string) (*Contract, error)
	List(ctx context.Context, userID, userEmail string, filters map[string]string, offset, limit int) ([]Contract, int, error)
	Update(ctx context.Context, contract *Contract) error
	SoftDelete(ctx context.Context, id string) error
	SoftDeleteAudit(ctx context.Context, contractID string) error

	ListShares(ctx context.Context, contractID string) ([]Share, error)
	CreateShare(ctx context.Context, share *Share) error
	GetShare(ctx context.Context, shareID string) (*Share, error)
	RevokeShare(ctx context.Context, shareID string) error

	ListAudit(ctx context.Context, contractID string, offset, limit int) ([]AuditEntry, int, error)
	CreateAudit(ctx context.Context, entry *AuditEntry) error
}
