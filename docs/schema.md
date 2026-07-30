# Database Schema — Commitment Management Platform

## Overview

SQLite database schema for the Commitment Management Platform. The driver is `modernc.org/sqlite` (pure Go); encryption at rest is handled at the filesystem level (LUKS/dm-crypt). All tables use `TEXT` primary keys storing UUIDs generated in the application layer, and include audit timestamps stored as `TEXT` in ISO 8601 UTC.

### SQLite Conventions

- **Primary keys**: `TEXT` storing UUIDs (generated in Go via `uuid.NewString()`). SQLite has no `gen_random_uuid()`.
- **Timestamps**: `TEXT` in ISO 8601 UTC (`datetime('now')` produces this). `created_at` set on INSERT, `updated_at` updated in application code (SQLite has no trigger language comparable to PL/pgSQL).
- **Dates**: `TEXT` in `YYYY-MM-DD` format.
- **Money**: `INTEGER` cents. Never `REAL` (floating-point precision).
- **Enums**: `TEXT` with `CHECK` constraints. SQLite has no native enum types.
- **Booleans**: `INTEGER` 0/1 (SQLite has no native BOOLEAN).
- **Foreign keys**: Off by default — enable with `PRAGMA foreign_keys = ON;` on every connection.
- **Arrays**: Not supported. Use a separate table or JSON-in-TEXT (see `reminder_preferences`).

---

## Enum Types

SQLite has no native enum types. Enums are enforced via `CHECK` constraints on `TEXT` columns. The valid values are documented here for reference and used in CHECK constraints below.

### commitment_status

Values: `active`, `cancelled`, `expired`, `paused`, `review_needed`

### billing_frequency

Values: `monthly`, `quarterly`, `semi_annual`, `annual`

### commitment_category

Values: `insurance`, `streaming_subscription`, `software_subscription`, `mobile_contract`, `internet_contract`, `electricity_contract`, `gas_contract`, `gym_membership`, `banking_product`, `vehicle_obligation`, `healthcare_reminder`, `vaccination_reminder`, `other`

### reminder_type

Values: `renewal_date`, `cancellation_deadline`

### reminder_status

Values: `pending`, `sent`, `failed`

---

## Tables

### users

Internal user table that maps external Firebase identities to internal user records.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  external_auth_provider TEXT NOT NULL DEFAULT 'firebase',
  external_subject_id TEXT NOT NULL,
  email TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,

  CONSTRAINT users_external_subject_id_unique UNIQUE (external_auth_provider, external_subject_id),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_external_subject_id ON users(external_auth_provider, external_subject_id) WHERE deleted_at IS NULL;
```

**Fields:**
- `id`: Internal UUID primary key (TEXT, generated in application layer)
- `external_auth_provider`: Authentication provider (currently always 'firebase')
- `external_subject_id`: Firebase UID
- `email`: User email address
- `email_verified`: Whether email is verified by Firebase (0 or 1)
- `created_at`: Account creation timestamp (TEXT ISO 8601 UTC)
- `updated_at`: Last update timestamp (TEXT ISO 8601 UTC, updated in application code)
- `deleted_at`: Soft delete timestamp (NULL if not deleted)

---

### commitments

Generic commitment model that supports all commitment categories.

```sql
CREATE TABLE commitments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'insurance', 'streaming_subscription', 'software_subscription',
    'mobile_contract', 'internet_contract', 'electricity_contract',
    'gas_contract', 'gym_membership', 'banking_product',
    'vehicle_obligation', 'healthcare_reminder', 'vaccination_reminder', 'other'
  )),
  provider TEXT NOT NULL,
  start_date TEXT NOT NULL,
  renewal_date TEXT NOT NULL,
  cancellation_deadline TEXT,
  cost INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  billing_frequency TEXT NOT NULL CHECK (billing_frequency IN (
    'monthly', 'quarterly', 'semi_annual', 'annual'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'cancelled', 'expired', 'paused', 'review_needed'
  )),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,

  CONSTRAINT commitments_cost_positive CHECK (cost >= 0),
  CONSTRAINT commitments_renewal_after_start CHECK (renewal_date > start_date),
  CONSTRAINT commitments_cancellation_before_renewal CHECK (
    cancellation_deadline IS NULL OR cancellation_deadline < renewal_date
  )
);

CREATE INDEX idx_commitments_user_id ON commitments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_user_status ON commitments(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_user_category ON commitments(user_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_renewal_date ON commitments(renewal_date) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_commitments_cancellation_deadline ON commitments(cancellation_deadline) WHERE deleted_at IS NULL AND status = 'active' AND cancellation_deadline IS NOT NULL;
```

**Fields:**
- `id`: UUID primary key (TEXT)
- `user_id`: Foreign key to users table
- `name`: Commitment name (e.g., "Netflix Premium")
- `category`: Commitment category (TEXT with CHECK constraint)
- `provider`: Service provider name
- `start_date`: Contract start date (TEXT, YYYY-MM-DD)
- `renewal_date`: Next renewal date (TEXT, YYYY-MM-DD)
- `cancellation_deadline`: Last date to cancel without penalty (optional, TEXT YYYY-MM-DD)
- `cost`: Amount per billing period in **integer cents** (e.g., 1599 = €15.99)
- `currency`: ISO 4217 currency code (default: EUR)
- `billing_frequency`: How often billing occurs (TEXT with CHECK constraint)
- `status`: Current commitment status (TEXT with CHECK constraint)
- `notes`: Optional user notes
- `created_at`: Record creation timestamp (TEXT ISO 8601 UTC)
- `updated_at`: Last update timestamp (TEXT ISO 8601 UTC, updated in application code)
- `deleted_at`: Soft delete timestamp

**Constraints:**
- Cost must be non-negative (in cents)
- Renewal date must be after start date
- Cancellation deadline must be before renewal date (if provided)

---

### reminder_preferences

User-configurable reminder settings. SQLite has no array type — `reminder_windows` is stored as JSON text and parsed in the application layer.

```sql
CREATE TABLE reminder_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_windows TEXT NOT NULL DEFAULT '[90, 60, 30, 14, 7, 1]',
  email_enabled INTEGER NOT NULL DEFAULT 1 CHECK (email_enabled IN (0, 1)),
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT reminder_preferences_user_id_unique UNIQUE (user_id),
  CONSTRAINT reminder_preferences_windows_valid CHECK (
    reminder_windows IS json AND json_valid(reminder_windows)
  )
);

CREATE INDEX idx_reminder_preference_user_id ON reminder_preferences(user_id);
```

**Fields:**
- `id`: UUID primary key (TEXT)
- `user_id`: Foreign key to users table (one-to-one relationship)
- `reminder_windows`: JSON array of days before deadline to send reminders (e.g., `[90, 60, 30, 14, 7, 1]`). Valid values: 1, 7, 14, 30, 60, 90 — enforced in application layer.
- `email_enabled`: Whether email reminders are enabled (0 or 1)
- `timezone`: User's timezone for reminder scheduling
- `created_at`: Record creation timestamp (TEXT ISO 8601 UTC)
- `updated_at`: Last update timestamp (TEXT ISO 8601 UTC)

**Constraints:**
- One preference record per user
- Reminder windows must be from valid set: 1, 7, 14, 30, 60, 90 days (enforced in application layer; SQLite JSON1 extension validates that the column holds valid JSON)

---

### reminders

Scheduled reminder records.

```sql
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  commitment_id TEXT NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('renewal_date', 'cancellation_deadline')),
  scheduled_date TEXT NOT NULL,
  sent_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  days_before INTEGER NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT reminders_unique_schedule UNIQUE (commitment_id, reminder_type, days_before)
);

CREATE INDEX idx_reminders_commitment_id ON reminders(commitment_id);
CREATE INDEX idx_reminders_scheduled_date ON reminders(scheduled_date) WHERE status = 'pending';
CREATE INDEX idx_reminders_status ON reminders(status);
```

**Fields:**
- `id`: UUID primary key (TEXT)
- `commitment_id`: Foreign key to commitments table
- `reminder_type`: Type of reminder (TEXT with CHECK constraint)
- `scheduled_date`: Date when reminder should be sent (TEXT, YYYY-MM-DD)
- `sent_at`: Timestamp when reminder was actually sent (TEXT ISO 8601 UTC)
- `status`: Current reminder status (TEXT with CHECK constraint)
- `days_before`: Days before deadline (e.g., 30 for 30-day reminder)
- `error_message`: Error details if status is 'failed'
- `created_at`: Record creation timestamp (TEXT ISO 8601 UTC)
- `updated_at`: Last update timestamp (TEXT ISO 8601 UTC)

**Constraints:**
- Unique combination of commitment, type, and days_before (prevents duplicate reminders)

---

### notifications

Log of sent notifications (email, future: push, SMS).

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_id TEXT REFERENCES reminders(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_reminder_id ON notifications(reminder_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_status ON notifications(status);
```

**Fields:**
- `id`: UUID primary key (TEXT)
- `user_id`: Foreign key to users table
- `reminder_id`: Foreign key to reminders table (nullable for non-reminder notifications)
- `notification_type`: Type of notification (e.g., 'email_reminder', 'email_welcome')
- `recipient`: Email address or other recipient identifier
- `subject`: Email subject line
- `sent_at`: Timestamp when notification was sent (TEXT ISO 8601 UTC)
- `status`: Delivery status (e.g., 'sent', 'delivered', 'bounced', 'failed')
- `provider_message_id`: Message ID from email provider (Mailjet/Postmark)
- `error_message`: Error details if delivery failed
- `created_at`: Record creation timestamp (TEXT ISO 8601 UTC)

---

## Soft Delete Strategy

All main tables (`users`, `commitments`) use soft delete via the `deleted_at` timestamp column.

**Rules:**
- Set `deleted_at = datetime('now')` to soft delete a record
- Queries should filter with `WHERE deleted_at IS NULL`
- Soft-deleted records are retained for audit and GDPR compliance
- Hard delete only for GDPR data deletion requests

**Implementation:**
- Application layer must add `WHERE deleted_at IS NULL` to all queries
- Partial indexes use `WHERE deleted_at IS NULL` for performance
- Repository layer should provide both `Delete()` (soft) and `HardDelete()` methods
- **Foreign keys must be enabled** (`PRAGMA foreign_keys = ON;`) for `ON DELETE CASCADE` to work

---

## Audit Timestamps

All tables include audit timestamps stored as `TEXT` in ISO 8601 UTC:

- `created_at`: Set to `datetime('now')` on INSERT, never updated
- `updated_at`: Set to `datetime('now')` on INSERT, updated to `datetime('now')` on every UPDATE

**Implementation:**
SQLite has no trigger language comparable to PL/pgSQL. Update `updated_at` in application code:

```go
func (r *repository) Update(ctx context.Context, c *Commitment) error {
    query := `
        UPDATE commitments
        SET name = ?, category = ?, provider = ?, cost = ?, updated_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL
    `
    result, err := r.db.ExecContext(ctx, query, c.Name, c.Category, c.Provider, c.Cost, c.ID)
    if err != nil {
        return fmt.Errorf("failed to update commitment: %w", err)
    }
    // ... check rows affected ...
    return nil
}
```

---

## Indexes Strategy

### Primary Indexes

1. **Foreign keys**: All foreign key columns are indexed
2. **Frequently queried columns**: `email`, `status`, `category`
3. **Date-based queries**: `renewal_date`, `cancellation_deadline`, `scheduled_date`
4. **Composite indexes**: For common query patterns (e.g., `user_id + status`)

### Partial Indexes

SQLite supports partial indexes with `WHERE` clauses. Use `WHERE deleted_at IS NULL` to:
- Reduce index size
- Improve query performance
- Exclude soft-deleted records from index scans

### Index Naming Convention

- Single column: `idx_tablename_columnname`
- Composite: `idx_tablename_column1_column2`
- Partial: Include `WHERE` clause in index definition

---

## Migration Strategy

### Migration Tool

Use `golang-migrate` with the `sqlite3` driver.

### Migration File Naming

```
migrations/
├── 000001_create_users.up.sql
├── 000001_create_users.down.sql
├── 000002_create_commitments.up.sql
├── 000002_create_commitments.down.sql
├── 000003_create_reminder_preferences.up.sql
├── 000003_create_reminder_preferences.down.sql
├── 000004_create_reminders.up.sql
├── 000004_create_reminders.down.sql
├── 000005_create_notifications.up.sql
└── 000005_create_notifications.down.sql
```

### Migration Rules

1. **Always reversible**: Every `.up.sql` must have a corresponding `.down.sql`
2. **Never drop columns in same release as code removal**:
   - Release 1: Remove code that uses column
   - Release 2: Drop column in migration
3. **Test rollback**: Always test `.down.sql` migrations before deploying
4. **Backfill data**: When adding non-nullable columns, provide default values or backfill existing rows
5. **Foreign keys**: Each migration that creates tables with foreign keys must enable `PRAGMA foreign_keys = ON;` — SQLite does not persist this setting across connections.

---

## Backup Strategy

### Daily Backups

- **Frequency**: Daily at 2:00 AM CET
- **Method**: Use `sqlite3 <db> ".backup '<backup_path>'"` for a consistent online backup, or stop the writer briefly and copy the file. Encrypt the backup (e.g. `age`/`gpg`) before uploading off-host.
- **Retention**: 30 days
- **Storage**: Encrypted off-host storage (Hetzner Storage Box)

### Backup Command

```bash
# Online backup (safe with concurrent readers/writer)
sqlite3 /data/custodr.db ".backup '/backups/custodr_$(date +%Y%m%d).db'"

# Or use VACUUM INTO (SQLite 3.27+)
sqlite3 /data/custodr.db "VACUUM INTO '/backups/custodr_$(date +%Y%m%d).db'"
```

### Restore Testing

- **Frequency**: Weekly automated restore tests
- **Process**: Restore to a test database, verify data integrity
- **Alerting**: Notify on restore failure

---

## Performance Considerations

### Query Optimization

1. **Avoid SELECT ***: Always specify columns explicitly
2. **Use parameterized queries**: Prevent SQL injection (`?` placeholders, not `$1`)
3. **Batch operations**: Use multi-row `INSERT ... VALUES (...), (...), ...` for bulk inserts
4. **Pagination**: Use `LIMIT` and `OFFSET` for large result sets
5. **EXPLAIN QUERY PLAN**: Review query plans for complex queries

### Concurrency Model

SQLite supports **concurrent readers + a single writer**. This fits MVP load.

- **WAL mode**: Enable Write-Ahead Logging for better read concurrency:
  ```sql
  PRAGMA journal_mode = WAL;
  ```
- **Busy timeout**: Set a busy timeout to handle write contention:
  ```sql
  PRAGMA busy_timeout = 5000;
  ```
- **Connection pooling**: Use a single writer connection or a small pool with `busy_timeout`. The `api` and `worker` containers share the same database file on a mounted volume.

### Monitoring

Track these metrics:
- Query execution time
- SQLite busy/locked events (indicates write contention)
- Database file size growth
- WAL file size

---

## Security

### Encryption at Rest

Encryption is applied at the filesystem level, not the database driver level:

- **At rest**: The data volume is encrypted with LUKS/dm-crypt on the Hetzner VPS host. The SQLite file inherits this protection.
- **In transit**: Not applicable within a single host (SQLite is a file). For remote access (not in MVP), use TLS at the transport layer.
- **Backups**: Backup files are encrypted (e.g. `age`/`gpg`) before being uploaded to off-host storage. Store the backup encryption key separately.

### Access Control

- **Application**: Connects directly to the SQLite file. No separate user/role model — SQLite has no built-in RBAC.
- **Migrations**: Same connection as the application (no separate migration user).
- **No superuser**: SQLite has no superuser concept; access is governed by filesystem permissions.

---

## GDPR Compliance

### Data Minimization

- Only collect data necessary for commitment management
- No document storage in MVP (structured data only)
- Email addresses used only for authentication and notifications

### Right to Erasure

Implement user data deletion. With `PRAGMA foreign_keys = ON;`, cascading deletes handle related records:

```sql
-- Hard delete user and all related data (cascades to commitments, reminders, preferences, notifications)
DELETE FROM users WHERE id = ?;
```

### Data Portability

Export user data as JSON (assembled in the application layer from multiple queries):

```go
// Application-layer export — SQLite has no row_to_json aggregation.
// Query users, commitments, and reminder_preferences separately and assemble JSON in Go.
```

### Data Retention

- **Active users**: Retain all data
- **Deleted users**: Hard delete after 30 days (grace period)
- **Notifications**: Retain for 1 year for audit purposes
