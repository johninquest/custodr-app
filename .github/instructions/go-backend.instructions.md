---
description: 'Go backend development instructions adapted for Echo framework and domain-driven modular monolith architecture'
applyTo: '**/*.go,**/go.mod,**/go.sum'
---

# Go Backend Development Instructions

Follow idiomatic Go practices with specific patterns for Echo framework and domain-driven modular monolith architecture. Based on [Effective Go](https://go.dev/doc/effective_go), [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments), and project-specific conventions.

## General Instructions

- Write simple, clear, and idiomatic Go code
- Favor clarity and simplicity over cleverness
- Follow the principle of least surprise
- Keep the happy path left-aligned (minimize indentation)
- Return early to reduce nesting
- Prefer early return over if-else chains
- Make the zero value useful
- Write self-documenting code with clear, descriptive names
- Document exported types, functions, methods, and packages
- Use Go modules for dependency management
- Leverage the Go standard library instead of reinventing the wheel
- Write comments in English by default
- Avoid using emoji in code and comments

## Project Architecture

### Domain-Driven Modular Monolith

Organize code by **business domain**, not technical layer:

```
internal/
├── commitments/          # Commitment management domain
│   ├── handler.go       # HTTP handlers (Echo)
│   ├── service.go       # Business logic
│   ├── repository.go    # Database operations
│   ├── models.go        # Domain models and DTOs
│   └── handler_test.go  # Tests
├── reminders/           # Reminder management domain
├── users/               # User management domain
├── notifications/       # Notification domain
└── shared/              # Cross-cutting concerns
    ├── config/          # Configuration
    ├── database/        # Database connection
    ├── logger/          # Structured logging
    ├── middleware/      # HTTP middleware
    └── errors/          # Error types
```

**Key Principles:**
- Each domain module is self-contained (handler, service, repository, models)
- Domains communicate through well-defined interfaces
- Shared code goes in `internal/shared/`
- No circular dependencies between domains
- Use `internal/` to prevent external imports

### Request Flow

Follow this strict layering:

```
HTTP Request → Handler → Service → Repository → SQLite
```

**Handler Layer:**
- Parse HTTP requests and validate input
- Call service layer for business logic
- Format HTTP responses
- Handle HTTP-specific concerns (status codes, headers)
- NO business logic or database queries

**Service Layer:**
- Implement business rules and validation
- Orchestrate repository calls
- Manage transactions
- NO HTTP concerns or SQL queries

**Repository Layer:**
- Execute database queries
- Map database rows to domain models
- Handle database-specific concerns (transactions, connections)
- NO business logic or HTTP concerns

## Naming Conventions

### Packages

- Use lowercase, single-word package names
- Avoid underscores, hyphens, or mixedCaps
- Choose names that describe what the package provides
- Package names should be singular, not plural
- Domain packages: `commitments`, `reminders`, `users`, `notifications`

#### Package Declaration Rules (CRITICAL)
- **NEVER duplicate `package` declarations** - each Go file must have exactly ONE `package` line
- When editing an existing `.go` file, **PRESERVE** the existing `package` declaration
- When creating a new `.go` file, check what package name other `.go` files in the same directory use
- Use the SAME package name as existing files in that directory

### Variables and Functions

- Use mixedCaps or MixedCaps (camelCase) rather than underscores
- Keep names short but descriptive
- Use single-letter variables only for very short scopes (like loop indices)
- Exported names start with a capital letter
- Unexported names start with a lowercase letter
- Avoid stuttering (e.g., avoid `commitments.CommitmentService`, prefer `commitments.Service`)

### Interfaces

- Name interfaces with -er suffix when possible (e.g., `Repository`, `Provider`)
- Single-method interfaces should be named after the method
- Keep interfaces small and focused (1-3 methods ideal)
- Define interfaces close to where they're used, not where they're implemented

**Project-Specific Interfaces:**

```go
// internal/shared/auth/provider.go
type AuthProvider interface {
    ValidateToken(ctx context.Context, token string) (string, error)
}

// internal/shared/email/provider.go
type EmailProvider interface {
    SendReminderEmail(ctx context.Context, to string, commitment *commitments.Commitment, reminder *reminders.Reminder) error
    SendWelcomeEmail(ctx context.Context, to string, user *users.User) error
}

// internal/commitments/repository.go
type Repository interface {
    Create(ctx context.Context, commitment *Commitment) error
    GetByID(ctx context.Context, id string) (*Commitment, error)
    ListByUserID(ctx context.Context, userID string, params ListParams) ([]Commitment, error)
    Update(ctx context.Context, commitment *Commitment) error
    Delete(ctx context.Context, id string) error
}
```

## Echo Framework Patterns

### Handler Structure

```go
type Handler struct {
    service *Service
}

func NewHandler(service *Service) *Handler {
    return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(e *echo.Echo) {
    api := e.Group("/api/v1")
    api.Use(h.authMiddleware)
    
    api.GET("/commitments", h.List)
    api.POST("/commitments", h.Create)
    api.GET("/commitments/:id", h.Get)
    api.PUT("/commitments/:id", h.Update)
    api.DELETE("/commitments/:id", h.Delete)
}
```

### Request Binding and Validation

```go
func (h *Handler) Create(c echo.Context) error {
    var req CreateCommitmentRequest
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

    // Extract user ID from context (set by auth middleware)
    userID := c.Get("user_id").(string)

    commitment, err := h.service.Create(c.Request().Context(), userID, req)
    if err != nil {
        return handleError(c, err)
    }

    return c.JSON(http.StatusCreated, commitment)
}
```

### Request/Response Models

```go
type CreateCommitmentRequest struct {
    Name                 string          `json:"name" validate:"required,min=1,max=255"`
    Category             string          `json:"category" validate:"required,oneof=insurance streaming_subscription software_subscription"`
    Provider             string          `json:"provider" validate:"required,min=1,max=255"`
    StartDate            time.Time       `json:"start_date" validate:"required"`
    RenewalDate          time.Time       `json:"renewal_date" validate:"required,gtfield=StartDate"`
    CancellationDeadline *time.Time      `json:"cancellation_deadline"`
    Cost                 int64           `json:"cost" validate:"required,gt=0"` // integer cents
    Currency             string          `json:"currency" validate:"required,len=3"`
    BillingFrequency     string          `json:"billing_frequency" validate:"required,oneof=monthly quarterly semi_annual annual"`
    Notes                string          `json:"notes" validate:"max=1000"`
}

type Commitment struct {
    ID                   string     `json:"id" db:"id"`
    UserID               string     `json:"user_id" db:"user_id"`
    Name                 string     `json:"name" db:"name"`
    Category             string     `json:"category" db:"category"`
    Provider             string     `json:"provider" db:"provider"`
    StartDate            string     `json:"start_date" db:"start_date"` // YYYY-MM-DD
    RenewalDate          string     `json:"renewal_date" db:"renewal_date"` // YYYY-MM-DD
    CancellationDeadline *string    `json:"cancellation_deadline" db:"cancellation_deadline"`
    Cost                 int64      `json:"cost" db:"cost"` // integer cents
    Currency             string     `json:"currency" db:"currency"`
    BillingFrequency     string     `json:"billing_frequency" db:"billing_frequency"`
    Status               string     `json:"status" db:"status"`
    Notes                string     `json:"notes" db:"notes"`
    CreatedAt            time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
}
```

### Error Handling

Use standard error response format:

```go
type ErrorResponse struct {
    Error Error `json:"error"`
}

type Error struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details []ValidationError `json:"details,omitempty"`
}

type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

func handleError(c echo.Context, err error) error {
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        return c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: Error{
                Code:    "VALIDATION_ERROR",
                Message: "Validation failed",
                Details: []ValidationError{*validationErr},
            },
        })
    }

    var notFoundErr *NotFoundError
    if errors.As(err, &notFoundErr) {
        return c.JSON(http.StatusNotFound, ErrorResponse{
            Error: Error{
                Code:    "NOT_FOUND",
                Message: notFoundErr.Error(),
            },
        })
    }

    // Log unexpected errors
    log.Error().Err(err).Msg("Unexpected error")
    
    return c.JSON(http.StatusInternalServerError, ErrorResponse{
        Error: Error{
            Code:    "INTERNAL_ERROR",
            Message: "An unexpected error occurred",
        },
    })
}
```

## Database Patterns (sqlx)

### Repository Implementation

```go
type repository struct {
    db *sqlx.DB
}

func NewRepository(db *sqlx.DB) Repository {
    return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, commitment *Commitment) error {
    query := `
        INSERT INTO commitments (
            id, user_id, name, category, provider, start_date, renewal_date,
            cancellation_deadline, cost, currency, billing_frequency, status, notes
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    `

    _, err := r.db.ExecContext(ctx, query,
        commitment.ID,
        commitment.UserID,
        commitment.Name,
        commitment.Category,
        commitment.Provider,
        commitment.StartDate,
        commitment.RenewalDate,
        commitment.CancellationDeadline,
        commitment.Cost,
        commitment.Currency,
        commitment.BillingFrequency,
        commitment.Status,
        commitment.Notes,
    )

    if err != nil {
        return fmt.Errorf("failed to insert commitment: %w", err)
    }

    return nil
}

func (r *repository) ListByUserID(ctx context.Context, userID string, params ListParams) ([]Commitment, error) {
    query := `
        SELECT id, user_id, name, category, provider, start_date, renewal_date,
               cancellation_deadline, cost, currency, billing_frequency, status, notes,
               created_at, updated_at
        FROM commitments
        WHERE user_id = ? AND deleted_at IS NULL
    `

    args := []interface{}{userID}

    // Dynamic filtering
    if params.Status != "" {
        query += " AND status = ?"
        args = append(args, params.Status)
    }

    if params.Category != "" {
        query += " AND category = ?"
        args = append(args, params.Category)
    }

    // Pagination
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    args = append(args, params.Limit, (params.Page-1)*params.Limit)

    var commitments []Commitment
    err := r.db.SelectContext(ctx, &commitments, query, args...)
    if err != nil {
        return nil, fmt.Errorf("failed to query commitments: %w", err)
    }

    return commitments, nil
}
```

### Soft Delete Pattern

Always filter by `deleted_at IS NULL`:

```go
func (r *repository) Delete(ctx context.Context, id string) error {
    query := `UPDATE commitments SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`

    result, err := r.db.ExecContext(ctx, query, id)
    if err != nil {
        return fmt.Errorf("failed to delete commitment: %w", err)
    }

    rows, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("failed to check rows affected: %w", err)
    }

    if rows == 0 {
        return ErrNotFound
    }

    return nil
}
```

### Transaction Management

```go
func (s *Service) CreateWithReminders(ctx context.Context, req CreateRequest) error {
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback()

    // Create commitment
    commitment, err := s.repo.CreateTx(ctx, tx, req.Commitment)
    if err != nil {
        return err
    }

    // Create reminders
    for _, reminder := range req.Reminders {
        reminder.CommitmentID = commitment.ID
        if err := s.reminderRepo.CreateTx(ctx, tx, reminder); err != nil {
            return err
        }
    }

    return tx.Commit()
}
```

## Database Migrations (SQLite + golang-migrate)

Use `golang-migrate` with the `sqlite3` driver. Migrations live in `migrations/` as paired up/down SQL files.

### File Naming

```
migrations/
├── 000001_create_users.up.sql
├── 000001_create_users.down.sql
├── 000002_create_commitments.up.sql
├── 000002_create_commitments.down.sql
├── 000003_create_reminders.up.sql
└── 000003_create_reminders.down.sql
```

### Commands

```bash
# Create a new migration
migrate create -ext sql -dir migrations -seq <descriptive_name>

# Apply all pending migrations
migrate -path migrations -database "sqlite3://<db_path>" up

# Rollback the last migration
migrate -path migrations -database "sqlite3://<db_path>" down 1

# Check current migration version
migrate -path migrations -database "sqlite3://<db_path>" version
```

### SQLite-Specific Rules

1. **Foreign keys are off by default.** Enable them on every connection:
   ```go
   db, _ := sqlx.Connect("sqlite3", dsn)
   db.Exec("PRAGMA foreign_keys = ON;")
   ```
   Forgetting this silently allows orphaned rows.

2. **Primary keys are `TEXT` storing UUIDs** generated in the application layer (e.g. `uuid.NewString()`). SQLite has no `gen_random_uuid()`.

3. **Timestamps are `TEXT` in ISO 8601 UTC.** Set `created_at` on INSERT and update `updated_at` in application code — SQLite has no trigger language comparable to PL/pgSQL. Use `datetime('now')` for soft-delete `deleted_at`.

4. **Money is integer cents.** Store as `INTEGER`, never `REAL` (floating-point).

5. **Enums are `TEXT` with `CHECK` constraints**, not native enum types.

6. **SQLCipher key management.** The encryption key comes from configuration (env var / secret manager), never hardcoded or committed. See `.env.example` for the `DB_KEY` convention.

7. **Cross-reference `schema.md`** before writing any migration — it is the source of truth for table/column names, types, and constraints.

## Structured Logging (zerolog)

```go
import "github.com/rs/zerolog/log"

// Info level for normal operations
log.Info().
    Str("user_id", userID).
    Int("commitment_count", len(commitments)).
    Msg("Listed commitments")

// Error level for failures
log.Error().
    Err(err).
    Str("commitment_id", id).
    Msg("Failed to create commitment")

// Debug level for detailed debugging
log.Debug().
    Str("query", query).
    Interface("args", args).
    Msg("Executing database query")
```

## Middleware Patterns

### Authentication Middleware

```go
func (m *AuthMiddleware) Handle(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        authHeader := c.Request().Header.Get("Authorization")
        if authHeader == "" {
            return c.JSON(http.StatusUnauthorized, ErrorResponse{
                Error: Error{
                    Code:    "UNAUTHORIZED",
                    Message: "Missing authorization header",
                },
            })
        }

        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            return c.JSON(http.StatusUnauthorized, ErrorResponse{
                Error: Error{
                    Code:    "UNAUTHORIZED",
                    Message: "Invalid authorization header format",
                },
            })
        }

        token := parts[1]
        
        userID, err := m.authProvider.ValidateToken(c.Request().Context(), token)
        if err != nil {
            return c.JSON(http.StatusUnauthorized, ErrorResponse{
                Error: Error{
                    Code:    "UNAUTHORIZED",
                    Message: "Invalid or expired token",
                },
            })
        }

        c.Set("user_id", userID)
        
        return next(c)
    }
}
```

## Dependency Injection

Wire dependencies in `main.go`:

```go
func main() {
    // Load configuration
    config := config.Load()
    
    // Initialize database
    db := database.NewConnection(config.Database)
    
    // Initialize providers
    authProvider := auth.NewFirebaseProvider(config.Firebase)
    emailProvider := email.NewMailjetProvider(config.Mailjet)
    
    // Initialize repositories
    commitmentRepo := commitments.NewRepository(db)
    reminderRepo := reminders.NewRepository(db)
    userRepo := users.NewRepository(db)
    
    // Initialize services
    commitmentService := commitments.NewService(commitmentRepo)
    reminderService := reminders.NewService(reminderRepo, commitmentRepo)
    userService := users.NewService(userRepo)
    
    // Initialize handlers
    commitmentHandler := commitments.NewHandler(commitmentService)
    reminderHandler := reminders.NewHandler(reminderService)
    userHandler := users.NewHandler(userService)
    
    // Initialize Echo
    e := echo.New()
    
    // Register middleware
    authMiddleware := middleware.NewAuthMiddleware(authProvider)
    e.Use(authMiddleware.Handle)
    
    // Register routes
    commitmentHandler.RegisterRoutes(e)
    reminderHandler.RegisterRoutes(e)
    userHandler.RegisterRoutes(e)
    
    // Start server
    e.Logger.Fatal(e.Start(":8080"))
}
```

## Code Style and Formatting

### Formatting

- Always use `gofmt` to format code
- Use `goimports` to manage imports automatically
- Keep line length reasonable (no hard limit, but consider readability)
- Add blank lines to separate logical groups of code

### Error Handling

- Check errors immediately after the function call
- Don't ignore errors using `_` unless you have a good reason (document why)
- Wrap errors with context using `fmt.Errorf` with `%w` verb
- Create custom error types when you need to check for specific errors
- Place error returns as the last return value
- Name error variables `err`
- Keep error messages lowercase and don't end with punctuation

```go
commitment, err := s.repo.GetByID(ctx, id)
if err != nil {
    return nil, fmt.Errorf("failed to get commitment: %w", err)
}
```

## Testing

### Test Organization

- Keep tests in the same package (white-box testing)
- Use `_test` package suffix for black-box testing
- Name test files with `_test.go` suffix
- Place test files next to the code they test

### Writing Tests

- Use table-driven tests for multiple test cases
- Name tests descriptively using `Test_functionName_scenario`
- Use subtests with `t.Run` for better organization
- Test both success and error cases
- Use `testify` for assertions and mocks

```go
func TestCommitmentService_Create(t *testing.T) {
    tests := []struct {
        name        string
        input       CreateCommitmentRequest
        mockSetup   func(*MockRepository)
        expected    *Commitment
        expectError bool
    }{
        {
            name: "valid commitment",
            input: CreateCommitmentRequest{
                Name: "Netflix",
                Cost: 1599,
            },
            mockSetup: func(m *MockRepository) {
                m.On("Create", mock.Anything).Return(nil)
            },
            expected:    &Commitment{Name: "Netflix"},
            expectError: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            mockRepo := new(MockRepository)
            tt.mockSetup(mockRepo)
            service := NewService(mockRepo)

            // Act
            result, err := service.Create(context.Background(), uuid.New().String(), tt.input)

            // Assert
            if tt.expectError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.expected.Name, result.Name)
            }
        })
    }
}
```

## Security Best Practices

### Input Validation

- Validate all external input using struct tags
- Use strong typing to prevent invalid states
- Sanitize data before using in SQL queries (use parameterized queries)
- Be careful with file paths from user input

### Authentication

- Always validate Firebase tokens using AuthProvider interface
- Extract user ID from validated token, not from request body
- Filter all queries by user_id to prevent cross-user data access

### SQL Injection Prevention

- **ALWAYS** use parameterized queries
- **NEVER** concatenate strings to build SQL queries

```go
// GOOD - parameterized query
query := "SELECT * FROM commitments WHERE user_id = ?"
db.QueryContext(ctx, query, userID)

// BAD - string concatenation (SQL injection vulnerability)
query := "SELECT * FROM commitments WHERE user_id = " + userID
```

## Common Pitfalls to Avoid

- Not checking errors
- Ignoring race conditions
- Creating goroutine leaks
- Not using defer for cleanup
- Modifying maps concurrently
- Not understanding nil interfaces vs nil pointers
- Forgetting to close resources (files, connections)
- Using global variables unnecessarily
- Creating duplicate `package` declarations
- Putting business logic in handlers or repositories
- Direct Firebase/Mailjet calls without interface abstraction
- Forgetting `WHERE deleted_at IS NULL` in queries
- Not filtering by user_id (security vulnerability)
- String concatenation in SQL queries (SQL injection)
- Forgetting `PRAGMA foreign_keys = ON;`
- Storing the SQLCipher key in code or version control

## Build and Verification

### Essential Commands

```bash
# Format code
go fmt ./...

# Check for issues
go vet ./...

# Run tests
go test ./... -v

# Run tests with coverage
go test ./... -cover

# Build
go build -o bin/api ./cmd/api

# Run
go run ./cmd/api
```

### Development Workflow

1. Run `go fmt` before committing
2. Run `go vet` to catch issues
3. Run tests before pushing
4. Keep commits focused and atomic
5. Write meaningful commit messages
