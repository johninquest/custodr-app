---
name: generate-tests
description: "Generate comprehensive test suites for Go backend or React frontend code. Creates unit tests, integration tests, and mocks with high coverage and edge case handling."
---

# Generate Tests

Generate tests for `${input:ModuleOrComponent}`.

## Instructions

You are a test engineering specialist creating comprehensive test suites. Your goal is to achieve high coverage while ensuring tests are meaningful, maintainable, and catch real bugs.

### Step 1: Analyze the Code

Read the target code and identify:

- **Public functions/methods**: What needs to be tested?
- **Dependencies**: What needs to be mocked?
- **Business rules**: What validation and logic must be verified?
- **Edge cases**: What boundary conditions and error paths exist?

### Step 2: Determine Test Strategy

#### For Go Backend

**Service Layer Tests** (target: >80% coverage)

- Test business logic with mocked repositories
- Use table-driven tests for multiple scenarios
- Test happy path, error paths, and edge cases
- Mock external dependencies (database, email, auth)

**Repository Layer Tests** (target: >90% coverage)

- Test database operations with real test database
- Test CRUD operations, filtering, pagination
- Test soft delete behavior
- Test transaction handling

**Handler Layer Tests** (target: >80% coverage)

- Test HTTP handlers with httptest
- Test request validation and error responses
- Test authentication and authorization
- Test response formatting

#### For React Frontend

**Component Tests** (target: >70% coverage)

- Test rendering with different props
- Test user interactions (clicks, form submissions)
- Test conditional rendering
- Test accessibility (ARIA labels, keyboard navigation)

**Hook Tests** (target: >80% coverage)

- Test data fetching and state management
- Test error handling
- Test loading states
- Test refetch functionality

**API Client Tests** (target: >80% coverage)

- Test request formatting
- Test response parsing
- Test error handling
- Test authentication token handling

### Step 3: Generate Test Structure

#### Go Test Structure

```go
func TestServiceName_MethodName(t *testing.T) {
    tests := []struct {
        name        string
        input       InputType
        mockSetup   func(*MockDependency)
        expected    ExpectedType
        expectError bool
        errorMsg    string
    }{
        {
            name: "valid input - happy path",
            input: validInput,
            mockSetup: func(m *MockDependency) {
                m.On("Method", mock.Anything).Return(result, nil)
            },
            expected: expectedResult,
            expectError: false,
        },
        {
            name: "invalid input - validation error",
            input: invalidInput,
            mockSetup: func(m *MockDependency) {},
            expectError: true,
            errorMsg: "validation failed",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            mockDep := new(MockDependency)
            tt.mockSetup(mockDep)
            service := NewService(mockDep)

            // Act
            result, err := service.Method(context.Background(), tt.input)

            // Assert
            if tt.expectError {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.errorMsg)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.expected, result)
            }
        })
    }
}
```

#### React Test Structure

```typescript
describe('ComponentName', () => {
  const mockProps = {
    // ... test data
  };

  it('renders correctly with valid props', () => {
    render(<ComponentName {...mockProps} />);
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const onClick = jest.fn();
    render(<ComponentName {...mockProps} onClick={onClick} />);
    
    await userEvent.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalledWith(expectedArg);
  });

  it('handles error state', () => {
    render(<ComponentName {...mockProps} error="Error message" />);
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
```

### Step 4: Create Mocks

#### Go Mocks (testify)

```go
type MockRepository struct {
    mock.Mock
}

func (m *MockRepository) Create(ctx context.Context, entity *Entity) error {
    args := m.Called(ctx, entity)
    return args.Error(0)
}

func (m *MockRepository) GetByID(ctx context.Context, id uuid.UUID) (*Entity, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*Entity), args.Error(1)
}
```

#### React Mocks

```typescript
jest.mock('@/lib/api');

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  mockApi.getCommitments.mockResolvedValue([
    { id: '1', name: 'Test' }
  ]);
});
```

### Step 5: Test Edge Cases

Always test:

- **Empty data**: Empty arrays, null values, zero counts
- **Boundary values**: Minimum/maximum values, string length limits
- **Error conditions**: Network errors, database errors, validation failures
- **Concurrent access**: Race conditions, simultaneous updates
- **Large datasets**: Pagination, performance with many records
- **Special characters**: Unicode, SQL injection attempts, XSS payloads

### Step 6: Verify Coverage

After generating tests:

1. Run tests with coverage report
2. Identify uncovered lines and branches
3. Add tests for missing coverage
4. Ensure critical paths have 100% coverage

## Output Format

Provide:

```markdown
# Test Suite Generated

## Files Created
- `path/to/service_test.go` (N tests)
- `path/to/repository_test.go` (N tests)
- `path/to/handler_test.go` (N tests)

## Coverage Report
- **Service**: X% (target: >80%) ✅
- **Repository**: X% (target: >90%) ✅
- **Handler**: X% (target: >80%) ✅

## Test Scenarios Covered
- ✅ Happy path scenarios
- ✅ Validation errors
- ✅ Database errors
- ✅ Authentication/authorization
- ✅ Edge cases (empty data, boundary values)
- ✅ Concurrent access (if applicable)

## Mocks Created
- `MockRepository` - Database operations
- `MockEmailProvider` - Email sending
- `MockAuthProvider` - Token validation

## Running Tests

```bash
# Run all tests
go test ./path/to/module/... -v

# Run with coverage
go test ./path/to/module/... -cover

# Run specific test
go test ./path/to/module -run TestServiceName_MethodName -v
```

## Next Steps
1. Review generated tests for completeness
2. Add any missing edge cases specific to your domain
3. Run tests and verify they pass
4. Check coverage and add tests if needed
```

## Guidelines

- Write tests that are easy to understand and maintain
- Use descriptive test names that explain the scenario
- Follow the Arrange-Act-Assert pattern
- Test behavior, not implementation details
- Mock external dependencies, not internal logic
- Avoid test interdependencies — each test should be independent
- Clean up test data after each test
- Use table-driven tests for multiple scenarios
- Test error messages to ensure they're helpful
