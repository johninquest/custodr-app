---
name: create-endpoint
description: "Scaffold a complete API endpoint for Go/Echo backend. Generates handler, service, repository, models, tests, and updates API documentation."
---

# Create Endpoint

Create API endpoint: `${input:EndpointSpec}` (e.g., "POST /api/v1/commitments")

## Instructions

You are a backend specialist creating a complete API endpoint implementation. Follow the domain-driven modular monolith architecture and generate all necessary layers.

### Step 1: Parse Endpoint Specification

Extract from the endpoint spec:

- **HTTP method**: GET, POST, PUT, DELETE
- **Path**: /api/v1/resource/:id
- **Parameters**: Path params, query params, request body
- **Response**: Expected response format and status codes
- **Authentication**: Required or optional
- **Authorization**: User-scoped or admin-only

### Step 2: Cross-Reference Contracts

Check `api_spec.md` for:

- Request/response format
- Validation rules
- Error codes
- Pagination format

Check `schema.md` for:

- Table structure
- Column names and types
- Constraints and indexes
- Relationships

### Step 3: Generate Models

Create request/response structs:

```go
// internal/[module]/models.go

type CreateResourceRequest struct {
    Name     string          `json:"name" validate:"required,min=1,max=255"`
    Category string          `json:"category" validate:"required,oneof=category1 category2"`
    Cost     decimal.Decimal `json:"cost" validate:"required,gt=0"`
    // ... other fields
}

type Resource struct {
    ID        uuid.UUID       `json:"id" db:"id"`
    UserID    uuid.UUID       `json:"user_id" db:"user_id"`
    Name      string          `json:"name" db:"name"`
    // ... other fields
    CreatedAt time.Time       `json:"created_at" db:"created_at"`
    UpdatedAt time.Time       `json:"updated_at" db:"updated_at"`
}
```

### Step 4: Generate Repository

Create database operations:

```go
// internal/[module]/repository.go

type Repository interface {
    Create(ctx context.Context, resource *Resource) error
    GetByID(ctx context.Context, id uuid.UUID) (*Resource, error)
    ListByUserID(ctx context.Context, userID uuid.UUID, params ListParams) ([]Resource, error)
    Update(ctx context.Context, resource *Resource) error
    Delete(ctx context.Context, id uuid.UUID) error
}

type repository struct {
    db *sqlx.DB
}

func NewRepository(db *sqlx.DB) Repository {
    return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, resource *Resource) error {
    query := `
        INSERT INTO resources (id, user_id, name, category, cost, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `
    
    _, err := r.db.ExecContext(ctx, query,
        resource.ID,
        resource.UserID,
        resource.Name,
        resource.Category,
        resource.Cost,
    )
    
    if err != nil {
        return fmt.Errorf("failed to create resource: %w", err)
    }
    
    return nil
}
```

### Step 5: Generate Service

Create business logic:

```go
// internal/[module]/service.go

type Service struct {
    repo Repository
}

func NewService(repo Repository) *Service {
    return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, req CreateResourceRequest) (*Resource, error) {
    // Business validation
    if req.Cost.IsNegative() {
        return nil, &ValidationError{
            Field:   "cost",
            Message: "cost must be positive",
        }
    }
    
    resource := &Resource{
        ID:       uuid.New(),
        UserID:   userID,
        Name:     req.Name,
        Category: req.Category,
        Cost:     req.Cost,
    }
    
    if err := s.repo.Create(ctx, resource); err != nil {
        return nil, fmt.Errorf("failed to create resource: %w", err)
    }
    
    return resource, nil
}
```

### Step 6: Generate Handler

Create HTTP handler:

```go
// internal/[module]/handler.go

type Handler struct {
    service *Service
}

func NewHandler(service *Service) *Handler {
    return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(e *echo.Echo) {
    api := e.Group("/api/v1")
    api.Use(h.authMiddleware)
    
    api.POST("/resources", h.Create)
    api.GET("/resources", h.List)
    api.GET("/resources/:id", h.Get)
    api.PUT("/resources/:id", h.Update)
    api.DELETE("/resources/:id", h.Delete)
}

func (h *Handler) Create(c echo.Context) error {
    var req CreateResourceRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: Error{
                Code:    "VALIDATION_ERROR",
                Message: "Invalid request body",
            },
        })
    }
    
    if err := c.Validate(&req); err != nil {
        return c.JSON(http.StatusBadRequest, formatValidationError(err))
    }
    
    userID := c.Get("user_id").(uuid.UUID)
    
    resource, err := h.service.Create(c.Request().Context(), userID, req)
    if err != nil {
        return handleError(c, err)
    }
    
    return c.JSON(http.StatusCreated, resource)
}
```

### Step 7: Generate Tests

Create comprehensive tests:

```go
// internal/[module]/handler_test.go

func TestHandler_Create(t *testing.T) {
    t.Run("creates resource with valid request", func(t *testing.T) {
        mockService := new(MockService)
        handler := NewHandler(mockService)
        
        userID := uuid.New()
        expectedResource := &Resource{
            ID:   uuid.New(),
            Name: "Test Resource",
        }
        
        mockService.On("Create", mock.Anything, userID, mock.Anything).
            Return(expectedResource, nil)
        
        reqBody := `{"name":"Test Resource","category":"category1","cost":10.00}`
        req := httptest.NewRequest("POST", "/api/v1/resources", strings.NewReader(reqBody))
        req.Header.Set("Content-Type", "application/json")
        req = req.WithContext(context.WithValue(req.Context(), "user_id", userID))
        
        w := httptest.NewRecorder()
        
        handler.Create(w, req)
        
        assert.Equal(t, http.StatusCreated, w.Code)
        
        var response Resource
        err := json.Unmarshal(w.Body.Bytes(), &response)
        assert.NoError(t, err)
        assert.Equal(t, "Test Resource", response.Name)
    })
}
```

### Step 8: Update Documentation

Update `api_spec.md` with:

- Endpoint specification
- Request/response examples
- Validation rules
- Error codes

### Step 9: Wire Dependencies

Update `main.go` to register the handler:

```go
// Wire dependencies
resourceRepo := resources.NewRepository(db)
resourceService := resources.NewService(resourceRepo)
resourceHandler := resources.NewHandler(resourceService)

// Register routes
resourceHandler.RegisterRoutes(e)
```

## Output Format

Provide:

```markdown
# Endpoint Created: [METHOD] [PATH]

## Files Created

### Models
- `internal/[module]/models.go` - Request/response structs

### Repository
- `internal/[module]/repository.go` - Database operations
- `internal/[module]/repository_test.go` - Repository tests

### Service
- `internal/[module]/service.go` - Business logic
- `internal/[module]/service_test.go` - Service tests

### Handler
- `internal/[module]/handler.go` - HTTP handlers
- `internal/[module]/handler_test.go` - Handler tests

## Endpoint Specification

**Method**: POST  
**Path**: /api/v1/resources  
**Authentication**: Required  
**Authorization**: User-scoped

### Request Body
```json
{
  "name": "string (required, 1-255 chars)",
  "category": "string (required, enum)",
  "cost": "number (required, positive)"
}
```

### Response (201 Created)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "category": "string",
  "cost": 10.00,
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:00:00Z"
}
```

### Error Responses
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid auth token
- `500 Internal Server Error` - Database error

## Database Schema

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_user_id ON resources(user_id);
```

## Testing

```bash
# Run tests
go test ./internal/[module]/... -v

# Run with coverage
go test ./internal/[module]/... -cover
```

## Next Steps

1. Create database migration for new table
2. Run tests to verify implementation
3. Test endpoint manually with curl or Postman
4. Update API documentation
5. Add integration tests if needed
```

## Guidelines

- Follow domain-driven organization (not technical layers)
- Use parameterized queries to prevent SQL injection
- Validate all input with struct tags
- Wrap errors with context using `fmt.Errorf`
- Filter queries by user_id for security
- Use soft deletes with `deleted_at` timestamp
- Generate comprehensive tests with table-driven pattern
- Update api_spec.md to keep contracts in sync
