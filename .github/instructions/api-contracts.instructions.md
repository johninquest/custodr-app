---
description: "Use when implementing API endpoints, database queries, or data models. Ensures code matches api_spec.md and schema.md contracts."
applyTo: "**/handlers/**/*.go,**/services/**/*.go,**/repositories/**/*.go,**/models/**/*.go,**/api/**/*.ts,**/api/**/*.tsx"
---

# API Contract Compliance

## Contract Files

Before implementing any API endpoint or database operation, cross-reference these contract files:

- **API Contract**: [api_spec.md](../../api_spec.md) — Endpoints, request/response formats, validation rules, error codes
- **Database Schema**: [schema.md](../../schema.md) — SQLite tables, columns, constraints, indexes, relationships

## Implementation Rules

### API Endpoints

1. **Request Validation**: Validate all request payloads against api_spec.md validation rules
   - Use struct tags for validation (e.g., `validate:"required,min=1,max=255"`)
   - Return 400 Bad Request with detailed field-level errors

2. **Response Format**: Match response structure exactly as defined in api_spec.md
   - Include all required fields
   - Use correct data types (UUID, ISO 8601 dates, decimal amounts)
   - Follow pagination format with `page`, `limit`, `total`, `total_pages`

3. **Error Handling**: Use standard error response format from api_spec.md
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Request validation failed",
       "details": [...]
     }
   }
   ```

4. **HTTP Status Codes**: Use correct status codes as specified
   - 200 OK for successful GET/PUT
   - 201 Created for successful POST
   - 204 No Content for successful DELETE
   - 400/401/404/500 for errors

5. **Authentication**: All endpoints except `/auth/*` require Firebase token validation
   - Extract user ID from validated token
   - Filter queries by user_id to prevent cross-user data access

### Database Operations

1. **Schema Compliance**: Match schema.md table definitions exactly
   - Use correct column names and data types
   - Respect constraints (NOT NULL, CHECK, UNIQUE)
   - Use `TEXT` primary keys storing UUIDs generated in the application layer

2. **Soft Deletes**: Use `deleted_at` timestamp for soft deletes
   - Always filter queries with `WHERE deleted_at IS NULL`
   - Set `deleted_at = NOW()` for soft delete operations
   - Provide both `Delete()` (soft) and `HardDelete()` methods

3. **Audit Timestamps**: Maintain `created_at` and `updated_at`
   - Set `created_at` on INSERT (never update)
   - Update `updated_at` on every UPDATE in application code (SQLite has no PL/pgSQL triggers)

4. **Indexes**: Use indexed columns for query performance
   - Filter by `user_id` for all user-scoped queries
   - Use composite indexes for common patterns (e.g., `user_id + status`)
   - Include `WHERE deleted_at IS NULL` in partial indexes

5. **Transactions**: Use transactions for multi-table operations
   - Wrap related operations in a single transaction
   - Use `defer tx.Rollback()` for safety
   - Commit only after all operations succeed

### Data Models

1. **Struct Tags**: Use appropriate tags for JSON and database mapping
   ```go
   type Commitment struct {
     ID        uuid.UUID  `json:"id" db:"id"`
     UserID    uuid.UUID  `json:"user_id" db:"user_id"`
     Name      string     `json:"name" db:"name" validate:"required,min=1,max=255"`
     CreatedAt time.Time  `json:"created_at" db:"created_at"`
   }
   ```

2. **Date/Time Types**: Use correct Go types
   - `time.Time` for timestamps, stored as `TEXT` ISO 8601 UTC in SQLite
   - `string` for dates (YYYY-MM-DD)
   - Format as ISO 8601 in JSON responses

4. **Money Types**: Store monetary amounts as integer cents in SQLite
   - Avoid floating-point precision issues
   - Format with 2 decimal places in JSON for display

5. **Enum Types**: Define Go constants for database enums. SQLite stores enums as `TEXT` with `CHECK` constraints.
   ```go
   type CommitmentStatus string

   const (
     StatusActive       CommitmentStatus = "active"
     StatusCancelled    CommitmentStatus = "cancelled"
     StatusExpired      CommitmentStatus = "expired"
   )
   ```

## Validation Checklist

Before completing implementation, verify:

- [ ] Request validation matches api_spec.md rules
- [ ] Response structure matches api_spec.md format exactly
- [ ] Error responses use standard format with correct codes
- [ ] HTTP status codes match specification
- [ ] Database queries filter by `user_id` for security
- [ ] Soft delete logic includes `WHERE deleted_at IS NULL`
- [ ] Audit timestamps are maintained correctly
- [ ] All required fields are present in responses
- [ ] Data types match schema.md definitions
- [ ] Constraints are enforced (validation + database level)

## Common Pitfalls

1. **Missing user_id filter**: Always filter by authenticated user to prevent data leakage
2. **Forgetting soft delete filter**: Add `WHERE deleted_at IS NULL` to all queries
3. **Incorrect date format**: Use ISO 8601 (YYYY-MM-DD for dates, YYYY-MM-DDTHH:MM:SSZ for timestamps)
4. **Floating-point for money**: Use `decimal.Decimal` instead of `float64` for cost fields
5. **Missing validation**: Validate all input fields, not just required ones
6. **Inconsistent error format**: Always use standard error response structure
7. **Pagination errors**: Calculate `total_pages` correctly: `ceil(total / limit)`
8. **Timezone issues**: Store timestamps as `TEXT` ISO 8601 UTC in SQLite, convert to user timezone in application layer

## Testing Requirements

When implementing endpoints, create tests that verify:

1. **Request validation**: Test invalid inputs return 400 with correct error details
2. **Authentication**: Test missing/invalid tokens return 401
3. **Authorization**: Test users can only access their own data
4. **Success cases**: Test valid requests return correct status and response format
5. **Error cases**: Test database errors return 500 with standard error format
6. **Soft deletes**: Test deleted records are excluded from queries
7. **Pagination**: Test page/limit parameters work correctly

## Contract Updates

If you need to modify the API or database schema:

1. **Update contract files first**: Modify api_spec.md or schema.md
2. **Review impact**: Identify all affected endpoints and queries
3. **Update implementation**: Modify code to match new contract
4. **Update tests**: Ensure tests validate new contract
5. **Document changes**: Add changelog entry for breaking changes

Never implement code that deviates from contracts without updating the contract files first.
