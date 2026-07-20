package commitments

import (
	"context"
	"time"
)

// Commitment represents a recurring commitment
type Commitment struct {
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

// CreateRequest represents a create commitment request
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

// UpdateRequest represents an update commitment request
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

// ListResponse represents a paginated list of commitments
type ListResponse struct {
	Data       []Commitment `json:"data"`
	Pagination Pagination   `json:"pagination"`
}

// Pagination represents pagination metadata
type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// Service handles commitment business logic
type Service interface {
	Create(ctx context.Context, userID string, req *CreateRequest) (*Commitment, error)
	GetByID(ctx context.Context, userID, id string) (*Commitment, error)
	List(ctx context.Context, userID string, filters map[string]string, page, limit int) (*ListResponse, error)
	Update(ctx context.Context, userID, id string, req *UpdateRequest) (*Commitment, error)
	Delete(ctx context.Context, userID, id string) error
}

// Repository handles commitment persistence
type Repository interface {
	Create(ctx context.Context, commitment *Commitment) error
	GetByID(ctx context.Context, id string) (*Commitment, error)
	List(ctx context.Context, userID string, filters map[string]string, offset, limit int) ([]Commitment, int, error)
	Update(ctx context.Context, commitment *Commitment) error
	SoftDelete(ctx context.Context, id string) error
}
