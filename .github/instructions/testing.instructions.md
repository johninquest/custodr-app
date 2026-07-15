---
description: 'Testing instructions for Go backend and React frontend with coverage targets and best practices'
applyTo: '**/*_test.go,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx'
---

# Testing Instructions

Comprehensive testing patterns for Go backend (table-driven tests, testify, httptest) and React frontend (React Testing Library, Vitest) with coverage targets.

## Testing Philosophy

- **Test behavior, not implementation** — test what code does, not how it does it
- **Write tests first** when possible (TDD approach)
- **Test edge cases** — empty data, boundary values, error conditions
- **Keep tests fast** — unit tests should run in milliseconds
- **Make tests deterministic** — no flaky tests, no random failures
- **One assertion per test** (or closely related assertions)
- **Clear test names** — describe scenario and expected result

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Services | >80% | Business logic is critical |
| Repositories | >90% | Data access must be reliable |
| Handlers | >80% | API contract compliance |
| Critical paths | 100% | Auth, payments, data deletion |
| Frontend components | >70% | UI behavior validation |
| Frontend hooks | >80% | State management logic |

## Go Backend Testing

### Test Organization

```
internal/
├── commitments/
│   ├── handler.go
│   ├── handler_test.go      # HTTP handler tests
│   ├── service.go
│   ├── service_test.go      # Business logic tests
│   ├── repository.go
│   ├── repository_test.go   # Database tests
│   └── models.go
```

### Table-Driven Tests

Use table-driven tests for multiple scenarios:

```go
func TestCommitmentService_Create(t *testing.T) {
    tests := []struct {
        name        string
        input       CreateCommitmentRequest
        mockSetup   func(*MockRepository)
        expected    *Commitment
        expectError bool
        errorMsg    string
    }{
        {
            name: "valid commitment",
            input: CreateCommitmentRequest{
                Name:     "Netflix",
                Category: "streaming_subscription",
                Cost:     1599,
            },
            mockSetup: func(m *MockRepository) {
                m.On("Create", mock.Anything, mock.Anything).Return(nil)
            },
            expected:    &Commitment{Name: "Netflix"},
            expectError: false,
        },
        {
            name: "invalid cost - negative",
            input: CreateCommitmentRequest{
                Name: "Netflix",
                Cost: -10,
            },
            mockSetup:   func(m *MockRepository) {},
            expectError: true,
            errorMsg:    "cost must be positive",
        },
        {
            name: "invalid dates - renewal before start",
            input: CreateCommitmentRequest{
                Name:        "Netflix",
                StartDate:   time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
                RenewalDate: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
                Cost:        1599,
            },
            mockSetup:   func(m *MockRepository) {},
            expectError: true,
            errorMsg:    "renewal date must be after start date",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            mockRepo := new(MockRepository)
            tt.mockSetup(mockRepo)
            service := NewCommitmentService(mockRepo)

            // Act
            result, err := service.Create(context.Background(), uuid.New().String(), tt.input)

            // Assert
            if tt.expectError {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.errorMsg)
                assert.Nil(t, result)
            } else {
                assert.NoError(t, err)
                assert.NotNil(t, result)
                assert.Equal(t, tt.expected.Name, result.Name)
            }
        })
    }
}
```

### Service Layer Tests

Test business logic with mocked repositories:

```go
func TestCommitmentService_List(t *testing.T) {
    t.Run("returns commitments for user", func(t *testing.T) {
        // Arrange
        userID := uuid.New().String()
        mockRepo := new(MockRepository)
        service := NewCommitmentService(mockRepo)

        expectedCommitments := []Commitment{
            {ID: uuid.New().String(), Name: "Netflix", UserID: userID},
            {ID: uuid.New().String(), Name: "Spotify", UserID: userID},
        }

        mockRepo.On("ListByUserID", mock.Anything, userID, mock.Anything).
            Return(expectedCommitments, nil)
        mockRepo.On("CountByUserID", mock.Anything, userID, mock.Anything).
            Return(2, nil)

        // Act
        commitments, total, err := service.List(context.Background(), userID, ListParams{})

        // Assert
        assert.NoError(t, err)
        assert.Equal(t, 2, total)
        assert.Len(t, commitments, 2)
        mockRepo.AssertExpectations(t)
    })

    t.Run("returns error when repository fails", func(t *testing.T) {
        // Arrange
        userID := uuid.New().String()
        mockRepo := new(MockRepository)
        service := NewCommitmentService(mockRepo)

        mockRepo.On("ListByUserID", mock.Anything, userID, mock.Anything).
            Return(nil, errors.New("database error"))

        // Act
        commitments, total, err := service.List(context.Background(), userID, ListParams{})

        // Assert
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "failed to list commitments")
        assert.Nil(t, commitments)
        assert.Equal(t, 0, total)
    })
}
```

### Repository Tests

Test database operations with real test database:

```go
func TestCommitmentRepository_Create(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer cleanupTestDB(db)
    
    repo := NewCommitmentRepository(db)
    
    t.Run("creates commitment successfully", func(t *testing.T) {
        commitment := &Commitment{
            ID:               uuid.New().String(),
            UserID:           uuid.New().String(),
            Name:             "Netflix",
            Category:         "streaming_subscription",
            Provider:         "Netflix",
            StartDate:        time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
            RenewalDate:      time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC),
            Cost:             1599,
            Currency:         "EUR",
            BillingFrequency: "monthly",
            Status:           "active",
        }

        // Act
        err := repo.Create(context.Background(), commitment)

        // Assert
        assert.NoError(t, err)

        // Verify in database
        retrieved, err := repo.GetByID(context.Background(), commitment.ID)
        assert.NoError(t, err)
        assert.Equal(t, commitment.Name, retrieved.Name)
        assert.Equal(t, commitment.Cost, retrieved.Cost)
    })

    t.Run("fails with duplicate ID", func(t *testing.T) {
        commitment := &Commitment{
            ID:       uuid.New().String(),
            UserID:   uuid.New().String(),
            Name:     "Netflix",
            Category: "streaming_subscription",
            Cost:     1599,
        }
        
        // Create first time
        err := repo.Create(context.Background(), commitment)
        assert.NoError(t, err)
        
        // Try to create again with same ID
        err = repo.Create(context.Background(), commitment)
        assert.Error(t, err)
    })
}

func TestCommitmentRepository_SoftDelete(t *testing.T) {
    db := setupTestDB(t)
    defer cleanupTestDB(db)
    
    repo := NewCommitmentRepository(db)
    
    // Create commitment
    commitment := &Commitment{
        ID:       uuid.New().String(),
        UserID:   uuid.New().String(),
        Name:     "Netflix",
        Category: "streaming_subscription",
        Cost:     1599,
    }
    err := repo.Create(context.Background(), commitment)
    assert.NoError(t, err)
    
    // Soft delete
    err = repo.Delete(context.Background(), commitment.ID)
    assert.NoError(t, err)
    
    // Verify excluded from queries
    retrieved, err := repo.GetByID(context.Background(), commitment.ID)
    assert.Error(t, err)
    assert.Equal(t, ErrNotFound, err)
    assert.Nil(t, retrieved)
}
```

### Handler Tests

Test HTTP handlers with httptest:

```go
func TestCommitmentHandler_Create(t *testing.T) {
    t.Run("creates commitment with valid request", func(t *testing.T) {
        // Arrange
        mockService := new(MockCommitmentService)
        handler := NewCommitmentHandler(mockService)
        
        userID := uuid.New().String()
        expectedCommitment := &Commitment{
            ID:   uuid.New().String(),
            Name: "Netflix",
            Cost: 1599,
        }
        
        mockService.On("Create", mock.Anything, userID, mock.Anything).
            Return(expectedCommitment, nil)
        
        reqBody := `{
            "name": "Netflix",
            "category": "streaming_subscription",
            "provider": "Netflix",
            "cost": 15.99,
            "currency": "EUR",
            "billing_frequency": "monthly",
            "start_date": "2024-01-15",
            "renewal_date": "2025-01-15"
        }`
        
        req := httptest.NewRequest("POST", "/api/v1/commitments", strings.NewReader(reqBody))
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("Authorization", "Bearer valid-token")
        
        // Set user ID in context (simulating auth middleware)
        req = req.WithContext(context.WithValue(req.Context(), "user_id", userID))
        
        w := httptest.NewRecorder()

        // Act
        handler.Create(w, req)

        // Assert
        assert.Equal(t, http.StatusCreated, w.Code)
        
        var response Commitment
        err := json.Unmarshal(w.Body.Bytes(), &response)
        assert.NoError(t, err)
        assert.Equal(t, "Netflix", response.Name)
assert.Equal(t, int64(1599), response.Cost)
        
        mockService.AssertExpectations(t)
    })

    t.Run("returns 400 for invalid JSON", func(t *testing.T) {
        mockService := new(MockCommitmentService)
        handler := NewCommitmentHandler(mockService)
        
        reqBody := `{invalid json}`
        req := httptest.NewRequest("POST", "/api/v1/commitments", strings.NewReader(reqBody))
        req.Header.Set("Content-Type", "application/json")
        
        w := httptest.NewRecorder()

        handler.Create(w, req)

        assert.Equal(t, http.StatusBadRequest, w.Code)
        
        var response ErrorResponse
        err := json.Unmarshal(w.Body.Bytes(), &response)
        assert.NoError(t, err)
        assert.Equal(t, "VALIDATION_ERROR", response.Error.Code)
    })

    t.Run("returns 400 for validation error", func(t *testing.T) {
        mockService := new(MockCommitmentService)
        handler := NewCommitmentHandler(mockService)
        
        userID := uuid.New().String()
        mockService.On("Create", mock.Anything, userID, mock.Anything).
            Return(nil, &ValidationError{Field: "cost", Message: "cost must be positive"})
        
        reqBody := `{
            "name": "Netflix",
            "category": "streaming_subscription",
            "provider": "Netflix",
            "cost": -10,
            "currency": "EUR",
            "billing_frequency": "monthly",
            "start_date": "2024-01-15",
            "renewal_date": "2025-01-15"
        }`
        
        req := httptest.NewRequest("POST", "/api/v1/commitments", strings.NewReader(reqBody))
        req.Header.Set("Content-Type", "application/json")
        req = req.WithContext(context.WithValue(req.Context(), "user_id", userID))
        
        w := httptest.NewRecorder()

        handler.Create(w, req)

        assert.Equal(t, http.StatusBadRequest, w.Code)
        
        var response ErrorResponse
        err := json.Unmarshal(w.Body.Bytes(), &response)
        assert.NoError(t, err)
        assert.Equal(t, "VALIDATION_ERROR", response.Error.Code)
        assert.Len(t, response.Error.Details, 1)
        assert.Equal(t, "cost", response.Error.Details[0].Field)
    })
}
```

### Test Database Setup

```go
// internal/shared/testutil/database.go
package testutil

import (
    "database/sql"
    "testing"
    "github.com/jmoiron/sqlx"
    _ "github.com/mutecomm/go-sqlcipher"
)

func SetupTestDB(t *testing.T) *sqlx.DB {
    t.Helper()

    // Use an in-memory SQLite database for tests
    dsn := ":memory:?_pragma_key=test-key"
    db, err := sqlx.Connect("sqlite3", dsn)
    if err != nil {
        t.Fatalf("failed to connect to test database: %v", err)
    }

    // Enable foreign keys
    if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
        t.Fatalf("failed to enable foreign keys: %v", err)
    }

    // Run migrations
    runMigrations(t, db)

    return db
}

func CleanupTestDB(db *sqlx.DB) {
    db.Close()
}

func runMigrations(t *testing.T, db *sqlx.DB) {
    t.Helper()

    // Apply migrations
    m, err := migrate.New(
        "file://migrations",
        "sqlite3://:memory:?_pragma_key=test-key",
    )
    if err != nil {
        t.Fatalf("failed to create migrator: %v", err)
    }

    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        t.Fatalf("failed to run migrations: %v", err)
    }
}
```

### Mocking with testify

```go
// Generate mocks
//go:generate mockery --name=Repository --output=./mocks

// Or create manually
type MockRepository struct {
    mock.Mock
}

func (m *MockRepository) Create(ctx context.Context, commitment *Commitment) error {
    args := m.Called(ctx, commitment)
    return args.Error(0)
}

func (m *MockRepository) GetByID(ctx context.Context, id string) (*Commitment, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*Commitment), args.Error(1)
}
```

## React Frontend Testing

### Component Tests (React Testing Library)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommitmentCard } from './CommitmentCard';

describe('CommitmentCard', () => {
  const mockCommitment = {
    id: '123',
    name: 'Netflix',
    category: 'streaming_subscription' as const,
    provider: 'Netflix',
    cost: 15.99,
    currency: 'EUR',
    status: 'active' as const,
    billing_frequency: 'monthly' as const,
    start_date: '2024-01-01',
    renewal_date: '2025-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'user-123',
  };

  it('renders commitment name and provider', () => {
    render(<CommitmentCard commitment={mockCommitment} />);
    
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('formats cost with currency', () => {
    render(<CommitmentCard commitment={mockCommitment} />);
    
    expect(screen.getByText('€15.99')).toBeInTheDocument();
    expect(screen.getByText('/monthly')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', async () => {
    const onEdit = jest.fn();
    render(<CommitmentCard commitment={mockCommitment} onEdit={onEdit} />);
    
    const editButton = screen.getByRole('button', { name: /edit netflix/i });
    await userEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith('123');
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn();
    render(<CommitmentCard commitment={mockCommitment} onDelete={onDelete} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete netflix/i });
    await userEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledWith('123');
  });

  it('does not render edit button when onEdit not provided', () => {
    render(<CommitmentCard commitment={mockCommitment} />);
    
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('shows cancelled status badge', () => {
    render(<CommitmentCard commitment={{ ...mockCommitment, status: 'cancelled' }} />);
    
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});
```

### Form Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommitmentForm } from './CommitmentForm';

describe('CommitmentForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<CommitmentForm onSubmit={onSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/name/i), 'Netflix');
    await userEvent.type(screen.getByLabelText(/provider/i), 'Netflix Inc');
    await userEvent.type(screen.getByLabelText(/cost/i), '15.99');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'streaming_subscription');
    await userEvent.selectOptions(screen.getByLabelText(/billing frequency/i), 'monthly');
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Netflix',
        provider: 'Netflix Inc',
        cost: 15.99,
        category: 'streaming_subscription',
        billing_frequency: 'monthly',
      }));
    });
  });

  it('shows validation error for empty name', async () => {
    const onSubmit = jest.fn();
    render(<CommitmentForm onSubmit={onSubmit} />);
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for negative cost', async () => {
    const onSubmit = jest.fn();
    render(<CommitmentForm onSubmit={onSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/name/i), 'Netflix');
    await userEvent.type(screen.getByLabelText(/cost/i), '-10');
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/cost must be positive/i)).toBeInTheDocument();
    });
    
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables submit button while submitting', async () => {
    const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<CommitmentForm onSubmit={onSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/name/i), 'Netflix');
    await userEvent.type(screen.getByLabelText(/cost/i), '15.99');
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
```

### Hook Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useCommitments } from './useCommitments';
import { api } from '@/lib/api';

jest.mock('@/lib/api');

describe('useCommitments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches commitments on mount', async () => {
    const mockCommitments = [
      { id: '1', name: 'Netflix', cost: 15.99 },
      { id: '2', name: 'Spotify', cost: 9.99 },
    ];
    
    (api.getCommitments as jest.Mock).mockResolvedValue(mockCommitments);

    const { result } = renderHook(() => useCommitments());

    expect(result.current.loading).toBe(true);
    expect(result.current.commitments).toEqual([]);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.commitments).toEqual(mockCommitments);
    expect(result.current.error).toBeNull();
    expect(api.getCommitments).toHaveBeenCalledTimes(1);
  });

  it('handles fetch error', async () => {
    const error = new Error('Network error');
    (api.getCommitments as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCommitments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBe('Network error');
    expect(result.current.commitments).toEqual([]);
  });

  it('refetches commitments', async () => {
    const mockCommitments = [{ id: '1', name: 'Netflix' }];
    (api.getCommitments as jest.Mock).mockResolvedValue(mockCommitments);

    const { result } = renderHook(() => useCommitments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(api.getCommitments).toHaveBeenCalledTimes(1);
    
    // Refetch
    await result.current.refetch();
    
    expect(api.getCommitments).toHaveBeenCalledTimes(2);
  });
});
```

### API Mocking

```typescript
// src/lib/api.test.ts
import { api } from './api';

describe('ApiClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getCommitments', () => {
    it('fetches commitments with auth token', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Netflix' }],
      };
      
      localStorage.setItem('auth_token', 'test-token');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.getCommitments();

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/commitments'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('throws error on failed request', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(api.getCommitments()).rejects.toThrow('Unauthorized');
    });
  });
});
```

## Test Commands

### Go Backend

```bash
# Run all tests
go test ./... -v

# Run tests with coverage
go test ./... -cover

# Run tests for specific package
go test ./internal/commitments/... -v

# Run specific test
go test ./internal/commitments -run TestCommitmentService_Create -v

# Run tests with race detector
go test ./... -race

# Generate coverage report
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### React Frontend

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- CommitmentCard.test.tsx

# Run tests matching pattern
npm test -- -t "CommitmentCard"
```

## Testing Best Practices

### Arrange-Act-Assert Pattern

```go
func TestSomething(t *testing.T) {
    // Arrange - set up test data and mocks
    mockRepo := new(MockRepository)
    service := NewService(mockRepo)
    input := CreateRequest{Name: "Test"}
    
    // Act - execute the code being tested
    result, err := service.Create(context.Background(), input)
    
    // Assert - verify the results
    assert.NoError(t, err)
    assert.Equal(t, "Test", result.Name)
}
```

### Test Isolation

- Each test should be independent
- Clean up test data after each test
- Don't rely on test execution order
- Use fresh mocks for each test

```go
func TestSomething(t *testing.T) {
    // Fresh mock for each test
    mockRepo := new(MockRepository)
    service := NewService(mockRepo)
    
    // Test logic...
    
    // Verify mock was called as expected
    mockRepo.AssertExpectations(t)
}
```

### Descriptive Test Names

```go
// GOOD - describes scenario and expected result
func TestCommitmentService_Create_ReturnsError_WhenCostIsNegative(t *testing.T)

// BAD - doesn't describe what's being tested
func TestCreate(t *testing.T)
```

### Testing Error Cases

Always test error paths:

```go
t.Run("returns error when repository fails", func(t *testing.T) {
    mockRepo := new(MockRepository)
    mockRepo.On("Create", mock.Anything, mock.Anything).
        Return(errors.New("database error"))
    
    service := NewService(mockRepo)
    
    result, err := service.Create(context.Background(), validInput)
    
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "failed to create commitment")
    assert.Nil(t, result)
})
```

### Testing Edge Cases

```go
tests := []struct {
    name  string
    input int
    want  int
}{
    {"zero value", 0, 0},
    {"negative value", -1, 0},
    {"boundary value", 100, 100},
    {"large value", 999999, 999999},
}
```

## Common Testing Pitfalls

### Go Backend

- **Not checking errors**: Always assert errors with `assert.Error()` or `assert.NoError()`
- **Ignoring mock expectations**: Call `mockRepo.AssertExpectations(t)` to verify mocks were called correctly
- **Testing implementation details**: Test behavior, not internal state
- **Flaky tests**: Avoid time-dependent tests, use fixed timestamps
- **Slow tests**: Mock external dependencies, use test database
- **Missing cleanup**: Always close in-memory test DB with `defer cleanupTestDB(db)`

### React Frontend

- **Testing implementation details**: Test what user sees, not component state
- **Using array index as key**: Use stable, unique IDs
- **Not waiting for async operations**: Use `waitFor()` for async assertions
- **Missing cleanup**: Use `afterEach(() => jest.clearAllMocks())`
- **Testing too much**: Focus on behavior, not every line of code
- **Ignoring accessibility**: Use `getByRole()` over `getByTestId()`

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - run: go test ./... -race -coverprofile=coverage.out
      - uses: actions/upload-artifact@v3
        with:
          name: backend-coverage
          path: coverage.out

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v3
        with:
          name: frontend-coverage
          path: coverage/
```

## Resources

- [Go Testing Documentation](https://pkg.go.dev/testing)
- [testify Documentation](https://pkg.go.dev/github.com/stretchr/testify)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Playground](https://testing-playground.com/) - Find optimal queries for tests
