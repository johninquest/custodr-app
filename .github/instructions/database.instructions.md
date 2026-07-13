---
description: 'PostgreSQL database development instructions for migrations, queries, and repository patterns'
applyTo: '**/migrations/**/*.sql,**/repositories/**/*.go,**/*.sql'
---

# Database Development Instructions

PostgreSQL database patterns for migrations, queries, and repository implementation following schema.md contract.

## Migration Guidelines

### Migration Tool

Use `golang-migrate` for database migrations:

```bash
# Create new migration
migrate create -ext sql -dir migrations -seq create_commitments

# Apply migrations
migrate -path migrations -database "postgres://user:pass@localhost:5432/commitmgr?sslmode=disable" up

# Rollback last migration
migrate -path migrations -database "postgres://user:pass@localhost:5432/commitmgr?sslmode=disable" down 1

# Check migration status
migrate -path migrations -database "postgres://user:pass@localhost:5432/commitmgr?sslmode=disable" version
```

### Migration File Naming

```
migrations/
├── 000001_create_users.up.sql
├── 000001_create_users.down.sql
├── 000002_create_commitments.up.sql
├── 000002_create_commitments.down.sql
├── 000003_create_reminders.up.sql
└── 000003_create_reminders.down.sql
```

### Migration Rules

1. **Always reversible**: Every `.up.sql` must have a corresponding `.down.sql`
2. **Test rollback**: Always test `.down.sql` migrations before deploying
3. **Never drop columns in same release as code removal**:
   - Release 1: Remove code that uses column
   - Release 2: Drop column in migration
4. **Backfill data**: When adding non-nullable columns, provide default values
5. **Create indexes concurrently** in production to avoid locks:
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```

### Migration Example

```sql
-- 000002_create_commitments.up.sql
CREATE TABLE commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category commitment_category NOT NULL,
  provider VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  cancellation_deadline DATE,
  cost DECIMAL(10, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  billing_frequency billing_frequency NOT NULL,
  status commitment_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT commitments_cost_positive CHECK (cost >= 0),
  CONSTRAINT commitments_renewal_after_start CHECK (renewal_date > start_date),
  CONSTRAINT commitments_cancellation_before_renewal CHECK (
    cancellation_deadline IS NULL OR cancellation_deadline < renewal_date
  )
);

-- Indexes
CREATE INDEX idx_commitments_user_id ON commitments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_user_status ON commitments(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_renewal_date ON commitments(renewal_date) WHERE deleted_at IS NULL AND status = 'active';

-- Trigger for updated_at
CREATE TRIGGER update_commitments_updated_at BEFORE UPDATE ON commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 000002_create_commitments.down.sql
DROP TABLE IF EXISTS commitments;
```

## Query Patterns

### Parameterized Queries

**ALWAYS** use parameterized queries to prevent SQL injection:

```go
// GOOD - parameterized query
query := `
  SELECT id, name, cost 
  FROM commitments 
  WHERE user_id = $1 AND status = $2
`
rows, err := db.QueryContext(ctx, query, userID, status)

// BAD - string concatenation (SQL injection vulnerability)
query := "SELECT id, name, cost FROM commitments WHERE user_id = '" + userID + "'"
```

### Explicit Column Selection

**NEVER** use `SELECT *` — always specify columns explicitly:

```go
// GOOD - explicit columns
query := `
  SELECT id, user_id, name, category, provider, start_date, renewal_date,
         cancellation_deadline, cost, currency, billing_frequency, status, notes,
         created_at, updated_at
  FROM commitments
  WHERE user_id = $1 AND deleted_at IS NULL
`

// BAD - SELECT *
query := "SELECT * FROM commitments WHERE user_id = $1"
```

### Soft Delete Filtering

**ALWAYS** filter by `deleted_at IS NULL` in queries:

```go
// GOOD - filter soft-deleted records
query := `
  SELECT id, name, cost
  FROM commitments
  WHERE user_id = $1 AND deleted_at IS NULL
`

// BAD - includes soft-deleted records
query := "SELECT id, name, cost FROM commitments WHERE user_id = $1"
```

### Dynamic Filtering

Build queries dynamically for optional filters:

```go
func (r *repository) ListByUserID(ctx context.Context, userID uuid.UUID, params ListParams) ([]Commitment, error) {
  query := `
    SELECT id, user_id, name, category, provider, start_date, renewal_date,
           cancellation_deadline, cost, currency, billing_frequency, status, notes,
           created_at, updated_at
    FROM commitments
    WHERE user_id = $1 AND deleted_at IS NULL
  `

  args := []interface{}{userID}
  argIndex := 2

  if params.Status != "" {
    query += fmt.Sprintf(" AND status = $%d", argIndex)
    args = append(args, params.Status)
    argIndex++
  }

  if params.Category != "" {
    query += fmt.Sprintf(" AND category = $%d", argIndex)
    args = append(args, params.Category)
    argIndex++
  }

  // Pagination
  query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
  args = append(args, params.Limit, (params.Page-1)*params.Limit)

  var commitments []Commitment
  err := r.db.SelectContext(ctx, &commitments, query, args...)
  if err != nil {
    return nil, fmt.Errorf("failed to query commitments: %w", err)
  }

  return commitments, nil
}
```

### Pagination

Use `LIMIT` and `OFFSET` for pagination:

```go
// Calculate offset from page number
offset := (params.Page - 1) * params.Limit

query := `
  SELECT id, name, cost
  FROM commitments
  WHERE user_id = $1 AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
`
rows, err := db.QueryContext(ctx, query, userID, params.Limit, offset)
```

### Count Queries

For pagination, count total records:

```go
func (r *repository) CountByUserID(ctx context.Context, userID uuid.UUID, params ListParams) (int, error) {
  query := `
    SELECT COUNT(*)
    FROM commitments
    WHERE user_id = $1 AND deleted_at IS NULL
  `

  args := []interface{}{userID}
  argIndex := 2

  if params.Status != "" {
    query += fmt.Sprintf(" AND status = $%d", argIndex)
    args = append(args, params.Status)
    argIndex++
  }

  var count int
  err := r.db.GetContext(ctx, &count, query, args...)
  if err != nil {
    return 0, fmt.Errorf("failed to count commitments: %w", err)
  }

  return count, nil
}
```

## Transaction Management

### When to Use Transactions

Use transactions for:
- Multi-table operations (create commitment + reminders)
- Operations that must succeed or fail together
- Consistency requirements across multiple writes

### Transaction Pattern

```go
func (s *Service) CreateWithReminders(ctx context.Context, req CreateRequest) error {
  // Begin transaction
  tx, err := s.db.BeginTx(ctx, nil)
  if err != nil {
    return fmt.Errorf("failed to begin transaction: %w", err)
  }
  defer tx.Rollback() // Safe to call even after Commit()

  // Create commitment
  commitment, err := s.repo.CreateTx(ctx, tx, req.Commitment)
  if err != nil {
    return err // Rollback will be called by defer
  }

  // Create reminders
  for _, reminder := range req.Reminders {
    reminder.CommitmentID = commitment.ID
    if err := s.reminderRepo.CreateTx(ctx, tx, reminder); err != nil {
      return err // Rollback will be called by defer
    }
  }

  // Commit transaction
  if err := tx.Commit(); err != nil {
    return fmt.Errorf("failed to commit transaction: %w", err)
  }

  return nil
}
```

### Repository Transaction Methods

```go
func (r *repository) CreateTx(ctx context.Context, tx *sql.Tx, commitment *Commitment) error {
  query := `
    INSERT INTO commitments (
      id, user_id, name, category, provider, start_date, renewal_date,
      cancellation_deadline, cost, currency, billing_frequency, status, notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    )
  `

  _, err := tx.ExecContext(ctx, query,
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
```

## Index Strategy

### Index Types

1. **Primary Key**: Automatically indexed
2. **Foreign Keys**: Always index foreign key columns
3. **Frequently Queried Columns**: Index columns used in WHERE clauses
4. **Composite Indexes**: For common query patterns (e.g., `user_id + status`)
5. **Partial Indexes**: With `WHERE deleted_at IS NULL` to exclude soft-deleted records

### Index Examples

```sql
-- Foreign key index
CREATE INDEX idx_commitments_user_id ON commitments(user_id) WHERE deleted_at IS NULL;

-- Composite index for common query pattern
CREATE INDEX idx_commitments_user_status ON commitments(user_id, status) WHERE deleted_at IS NULL;

-- Date-based index for upcoming deadlines
CREATE INDEX idx_commitments_renewal_date ON commitments(renewal_date) 
  WHERE deleted_at IS NULL AND status = 'active';

-- Partial index for active commitments only
CREATE INDEX idx_commitments_active ON commitments(user_id) 
  WHERE deleted_at IS NULL AND status = 'active';
```

### Index Naming Convention

- Single column: `idx_tablename_columnname`
- Composite: `idx_tablename_column1_column2`
- Partial: Include `WHERE` clause in index definition

### When to Add Indexes

Add indexes for:
- Columns in WHERE clauses
- Columns in JOIN conditions
- Columns in ORDER BY clauses
- Foreign key columns
- Columns with high cardinality (many unique values)

Avoid indexes on:
- Low cardinality columns (boolean, status with few values)
- Tables with more writes than reads
- Very wide columns (large text fields)

## Query Performance

### EXPLAIN ANALYZE

Use `EXPLAIN ANALYZE` to verify query performance:

```sql
EXPLAIN ANALYZE
SELECT id, name, cost
FROM commitments
WHERE user_id = '123' AND status = 'active' AND deleted_at IS NULL;
```

Look for:
- **Seq Scan** (bad): Full table scan — add index
- **Index Scan** (good): Using index
- **Bitmap Heap Scan** (good): Using multiple indexes
- High **actual time** values: Query is slow

### N+1 Query Problem

**BAD** - N+1 queries (one query per commitment):

```go
commitments, _ := repo.ListByUserID(ctx, userID)
for _, c := range commitments {
  reminders, _ := reminderRepo.ListByCommitmentID(ctx, c.ID) // N queries!
  c.Reminders = reminders
}
```

**GOOD** - Single query with JOIN or batch query:

```go
// Option 1: JOIN
query := `
  SELECT c.id, c.name, r.id as reminder_id, r.scheduled_date
  FROM commitments c
  LEFT JOIN reminders r ON r.commitment_id = c.id
  WHERE c.user_id = $1 AND c.deleted_at IS NULL
`

// Option 2: Batch query
commitments, _ := repo.ListByUserID(ctx, userID)
commitmentIDs := make([]uuid.UUID, len(commitments))
for i, c := range commitments {
  commitmentIDs[i] = c.ID
}
reminders, _ := reminderRepo.ListByCommitmentIDs(ctx, commitmentIDs) // 1 query
```

## Data Types

### UUID

Use `uuid.UUID` from `github.com/google/uuid`:

```go
import "github.com/google/uuid"

type Commitment struct {
  ID     uuid.UUID `json:"id" db:"id"`
  UserID uuid.UUID `json:"user_id" db:"user_id"`
}

// Generate new UUID
commitment.ID = uuid.New()
```

### Decimal (Money)

Use `decimal.Decimal` from `github.com/shopspring/decimal` for monetary amounts:

```go
import "github.com/shopspring/decimal"

type Commitment struct {
  Cost decimal.Decimal `json:"cost" db:"cost"`
}

// Create decimal
commitment.Cost = decimal.NewFromFloat(15.99)

// Arithmetic
total := commitment.Cost.Mul(decimal.NewFromInt(12)) // Annual cost
```

**NEVER** use `float64` for money — floating-point precision issues.

### Time

Use `time.Time` for timestamps:

```go
type Commitment struct {
  CreatedAt time.Time  `json:"created_at" db:"created_at"`
  StartDate time.Time  `json:"start_date" db:"start_date"`
}

// Parse date from string
startDate, err := time.Parse("2006-01-02", "2024-01-15")

// Format for JSON (ISO 8601)
json.Marshal(commitment.CreatedAt) // "2024-01-15T10:00:00Z"
```

### Nullable Fields

Use pointers for nullable database fields:

```go
type Commitment struct {
  CancellationDeadline *time.Time `json:"cancellation_deadline" db:"cancellation_deadline"`
  Notes                *string    `json:"notes" db:"notes"`
}

// Check for nil
if commitment.CancellationDeadline != nil {
  fmt.Println("Deadline:", *commitment.CancellationDeadline)
}
```

## Soft Delete Pattern

### Implementation

```go
// Soft delete - set deleted_at timestamp
func (r *repository) Delete(ctx context.Context, id uuid.UUID) error {
  query := `UPDATE commitments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
  
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

// Hard delete - for GDPR data deletion requests
func (r *repository) HardDelete(ctx context.Context, id uuid.UUID) error {
  query := `DELETE FROM commitments WHERE id = $1`
  
  _, err := r.db.ExecContext(ctx, query, id)
  if err != nil {
    return fmt.Errorf("failed to hard delete commitment: %w", err)
  }

  return nil
}
```

### Query Filtering

Always filter soft-deleted records:

```go
// Include in all queries
WHERE deleted_at IS NULL

// Include in all indexes
CREATE INDEX idx_name ON table(column) WHERE deleted_at IS NULL;
```

## Audit Timestamps

### Automatic updated_at

Use PostgreSQL trigger to automatically update `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to each table
CREATE TRIGGER update_commitments_updated_at BEFORE UPDATE ON commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Manual created_at

Set `created_at` on INSERT, never update:

```sql
INSERT INTO commitments (id, name, created_at, updated_at)
VALUES ($1, $2, NOW(), NOW())
```

## Security

### Row Level Security (Future)

For multi-tenant scenarios:

```sql
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY commitments_user_policy ON commitments
  USING (user_id = current_setting('app.current_user_id')::UUID);
```

### Connection Security

- Use TLS for all database connections
- Store credentials in environment variables
- Use connection pooling with `pgxpool`
- Limit connection pool size (20 connections)

### Access Control

- **Application user**: Limited permissions (SELECT, INSERT, UPDATE, DELETE)
- **Migration user**: DDL permissions (CREATE, ALTER, DROP)
- **Read-only user**: For analytics and reporting
- **No superuser**: Application never uses superuser credentials

## GDPR Compliance

### Data Minimization

- Only collect data necessary for commitment management
- No document storage in MVP (structured data only)
- Email addresses used only for authentication and notifications

### Right to Erasure

Implement user data deletion:

```go
func (s *UserService) DeleteUser(ctx context.Context, userID uuid.UUID) error {
  // Hard delete user and all related data (CASCADE)
  query := `DELETE FROM users WHERE id = $1`
  
  _, err := s.db.ExecContext(ctx, query, userID)
  if err != nil {
    return fmt.Errorf("failed to delete user: %w", err)
  }

  return nil
}
```

### Data Portability

Export user data as JSON:

```sql
SELECT row_to_json(t)
FROM (
  SELECT u.*, 
    (SELECT array_to_json(array_agg(row_to_json(c.*)))
     FROM commitments c WHERE c.user_id = u.id AND c.deleted_at IS NULL) as commitments,
    (SELECT row_to_json(rp.*)
     FROM reminder_preferences rp WHERE rp.user_id = u.id) as preferences
  FROM users u WHERE u.id = $1
) t;
```

## Common Pitfalls to Avoid

- Using `SELECT *` instead of explicit columns
- Forgetting `WHERE deleted_at IS NULL` in queries
- String concatenation in SQL queries (SQL injection)
- Using `float64` for monetary amounts (precision issues)
- N+1 queries (use JOINs or batch queries)
- Missing indexes on frequently queried columns
- Not using transactions for multi-table operations
- Forgetting to rollback transactions on error
- Not checking `RowsAffected()` after UPDATE/DELETE
- Using `time.Now()` instead of database `NOW()` for timestamps
- Not handling nullable fields with pointers
- Missing foreign key indexes

## Build and Verification

### Migration Commands

```bash
# Create migration
migrate create -ext sql -dir migrations -seq migration_name

# Apply migrations
migrate -path migrations -database "$DATABASE_URL" up

# Rollback
migrate -path migrations -database "$DATABASE_URL" down 1

# Check version
migrate -path migrations -database "$DATABASE_URL" version
```

### Query Testing

```bash
# Connect to database
psql "$DATABASE_URL"

# Run EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT ...;

# Check indexes
\di+ commitments

# Check table size
SELECT pg_size_pretty(pg_total_relation_size('commitments'));
```
