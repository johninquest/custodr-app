# Database Schema — Contract Management Platform

## Overview

PostgreSQL 18 schema for the Contract Management Platform. The driver is `github.com/jackc/pgx/v5`; encryption at rest is handled at the filesystem level (LUKS/dm-crypt). All tables use `UUID` primary keys generated in the application layer (UUIDv7), and include audit timestamps stored as `TIMESTAMPTZ` in UTC.

### PostgreSQL Conventions

- **Primary keys**: `UUID` storing UUIDv7 values (generated in Go via `uuid.NewV7()`). UUIDv7 is time-ordered, which improves B-tree index locality compared to random UUIDv4.
- **Timestamps**: `TIMESTAMPTZ` in UTC. `created_at` set on INSERT, `updated_at` updated in application code on every UPDATE.
- **Dates**: `DATE` in `YYYY-MM-DD` form.
- **Money**: `INTEGER` cents. Never `REAL`/`DOUBLE PRECISION` (floating-point precision).
- **Enums**: `TEXT` with `CHECK` constraints. Native PostgreSQL enums are deliberately avoided for category/status-like columns because the value set is expected to change; `CHECK` keeps the contract extensible.
- **Booleans**: native `BOOLEAN`.
- **Foreign keys**: enforced by PostgreSQL; `ON DELETE` behavior is explicit per column.
- **Arrays/JSON**: use `JSONB` (see `reminder_preferences` and `audit_logs`).
- **UUID function**: the application layer supplies IDs; PostgreSQL stores `UUID` and casts via `::uuid`.

---

## Enum Types (CHECK-constrained TEXT)

Enum-like columns are enforced via `CHECK` constraints on `TEXT` columns. The valid values are documented here for reference and used in the CHECK constraints below.

### contract_status

Values: `active`, `cancelled`, `expired`, `paused`, `review_needed`

### billing_frequency

Values: `monthly`, `quarterly`, `semi_annual`, `annual`

### contract_category

Values: `insurance`, `electricity_contract`, `gas_contract`, `mobile_contract`, `streaming_subscription`, `other`

> **MVP scope note:** The starter set focuses on the categories most common to the average German/EU consumer. Values such as `software_subscription`, `internet_contract`, `gym_membership`, `banking_product`, `vehicle_obligation`, `healthcare_reminder`, `vaccination_reminder` are reserved for future expansion.

### reminder_type

Values: `renewal_date`, `cancellation_deadline`

### reminder_status

Values: `pending`, `sent`, `failed`

### consent_type

Values: `email_notifications`

### audit_entity_type

Values: `contract`, `contract_share`

### share_role

Values: `viewer`

---

## Tables

### users

Internal user table that maps external Firebase identities to internal user records.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  external_auth_provider TEXT NOT NULL DEFAULT 'firebase',
  external_subject_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT users_external_subject_id_unique UNIQUE (external_auth_provider, external_subject_id),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_external_subject_id ON users(external_auth_provider, external_subject_id) WHERE deleted_at IS NULL;
```

**Fields:**
- `id`: Internal UUIDv7 primary key (UUID, generated in application layer)
- `external_auth_provider`: Authentication provider (currently always 'firebase')
- `external_subject_id`: Firebase UID
- `email`: User email address (stored lowercase-normalized)
- `name`: Optional display name (minimal PII — only name + email are stored)
- `email_verified`: Whether email is verified by Firebase
- `created_at`: Account creation timestamp (TIMESTAMPTZ UTC)
- `updated_at`: Last update timestamp (TIMESTAMPTZ UTC, updated in application code)
- `deleted_at`: Soft delete timestamp (NULL if not deleted)

---

### contracts

Generic contract model that supports all contract categories (insurance, subscriptions, utilities, telecom, etc.).

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'insurance', 'electricity_contract', 'gas_contract',
    'mobile_contract', 'streaming_subscription', 'other'
  )),
  provider TEXT NOT NULL,
  start_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  cancellation_deadline DATE,
  cost INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  billing_frequency TEXT NOT NULL CHECK (billing_frequency IN (
    'monthly', 'quarterly', 'semi_annual', 'annual'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'cancelled', 'expired', 'paused', 'review_needed'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT contracts_cost_positive CHECK (cost >= 0),
  CONSTRAINT contracts_renewal_after_start CHECK (renewal_date > start_date),
  CONSTRAINT contracts_cancellation_before_renewal CHECK (
    cancellation_deadline IS NULL OR cancellation_deadline < renewal_date
  )
);

CREATE INDEX idx_contracts_user_id ON contracts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_user_status ON contracts(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_user_category ON contracts(user_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_renewal_date ON contracts(renewal_date) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_contracts_cancellation_deadline ON contracts(cancellation_deadline) WHERE deleted_at IS NULL AND status = 'active' AND cancellation_deadline IS NOT NULL;
```

**Fields:**
- `id`: UUIDv7 primary key (UUID)
- `user_id`: Foreign key to users table (owner)
- `name`: Contract name (e.g., "Netflix Premium")
- `category`: Contract category (TEXT with CHECK constraint)
- `provider`: Service provider name
- `start_date`: Contract start date (DATE, YYYY-MM-DD)
- `renewal_date`: Next renewal date (DATE, YYYY-MM-DD)
- `cancellation_deadline`: Last date to cancel without penalty (optional, DATE YYYY-MM-DD)
- `cost`: Amount per billing period in **integer cents** (e.g., 1599 = €15.99)
- `currency`: ISO 4217 currency code (default: EUR)
- `billing_frequency`: How often billing occurs (TEXT with CHECK constraint)
- `status`: Current contract status (TEXT with CHECK constraint)
- `notes`: Optional user notes
- `created_at`: Record creation timestamp (TIMESTAMPTZ UTC)
- `updated_at`: Last update timestamp (TIMESTAMPTZ UTC, updated in application code)
- `deleted_at`: Soft delete timestamp

**Constraints:**
- Cost must be non-negative (in cents)
- Renewal date must be after start date
- Cancellation deadline must be before renewal date (if provided)

---

### contract_shares

Per-contract, email-keyed read-only sharing. A row grants a grantee (identified by email, since login is Google-only and email is the stable identity) view access to a single contract. Access resolves lazily at login by matching `grantee_email` to the authenticated user's email.

```sql
CREATE TABLE contract_shares (
  id UUID PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  grantee_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer')),
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,

  CONSTRAINT contract_shares_contract_grantee_unique UNIQUE (contract_id, grantee_email)
);

CREATE INDEX idx_contract_shares_grantee_email ON contract_shares(grantee_email) WHERE revoked_at IS NULL;
CREATE INDEX idx_contract_shares_contract_id ON contract_shares(contract_id) WHERE revoked_at IS NULL;
```

**Fields:**
- `id`: UUIDv7 primary key (UUID)
- `contract_id`: Foreign key to the shared contract
- `grantee_email`: Email of the grantee (lowercase-normalized; no user record required at grant time)
- `role`: Access role (MVP: `viewer` only)
- `granted_by`: UUID of the user who created the share
- `granted_at`: When access was granted
- `revoked_at`: When access was revoked (NULL = active)

**Access resolution:** a user's visible contracts are `contracts WHERE user_id = me` UNION `contracts JOIN contract_shares WHERE grantee_email = lower(my_email) AND revoked_at IS NULL`. Shares are read-only.

---

### reminder_preferences

User-configurable reminder settings. `reminder_windows` is stored as `JSONB` and parsed in the application layer.

```sql
CREATE TABLE reminder_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_windows JSONB NOT NULL DEFAULT '[90, 60, 30, 14, 7, 1]',
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reminder_preferences_user_id_unique UNIQUE (user_id)
);

CREATE INDEX idx_reminder_preference_user_id ON reminder_preferences(user_id);
```

**Fields:**
- `id`: UUIDv7 primary key (UUID)
- `user_id`: Foreign key to users table (one-to-one relationship)
- `reminder_windows`: JSON array of days before deadline to send reminders (e.g., `[90, 60, 30, 14, 7, 1]`). Valid values: 1, 7, 14, 30, 60, 90 — enforced in application layer.
- `email_enabled`: Whether email reminders are enabled (operational toggle; distinct from the legal `consents` record)
- `timezone`: User's timezone for reminder scheduling
- `created_at`: Record creation timestamp (TIMESTAMPTZ UTC)
- `updated_at`: Last update timestamp (TIMESTAMPTZ UTC)

**Constraints:**
- One preference record per user
- Reminder windows must be from valid set: 1, 7, 14, 30, 60, 90 days (enforced in application layer)

---

### reminders

Scheduled reminder records.

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('renewal_date', 'cancellation_deadline')),
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  days_before INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reminders_unique_schedule UNIQUE (contract_id, reminder_type, days_before)
);

CREATE INDEX idx_reminders_contract_id ON reminders(contract_id);
CREATE INDEX idx_reminders_scheduled_date ON reminders(scheduled_date) WHERE status = 'pending';
CREATE INDEX idx_reminders_status ON reminders(status);
```

**Fields:**
- `id`: UUIDv7 primary key (UUID)
- `contract_id`: Foreign key to contracts table
- `reminder_type`: Type of reminder (TEXT with CHECK constraint)
- `scheduled_date`: Date when reminder should be sent (DATE, YYYY-MM-DD)
- `sent_at`: Timestamp when reminder was actually sent (TIMESTAMPTZ UTC)
- `status`: Current reminder status (TEXT with CHECK constraint)
- `days_before`: Days before deadline (e.g., 30 for 30-day reminder)
- `error_message`: Error details if status is 'failed'
- `created_at`: Record creation timestamp (TIMESTAMPTZ UTC)
- `updated_at`: Last update timestamp (TIMESTAMPTZ UTC)

**Constraints:**
- Unique combination of contract, type, and days_before (prevents duplicate reminders)

---

### consents

Legal audit record of opt-in consent (Einwilligungserklärung). Distinct from the operational `reminder_preferences.email_enabled` toggle: `consents` documents the *lawful basis* and is versioned + withdrawable.

```sql
CREATE TABLE consents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('email_notifications')),
  version TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ
);

CREATE INDEX idx_consents_user_type ON consents(user_id, consent_type);
```

**Fields:**
- `id`: UUIDv7 primary key (UUID)
- `user_id`: Foreign key to users table
- `consent_type`: Type of consent (MVP: `email_notifications` only)
- `version`: Consent text version the user agreed to (e.g. `2026-09-05`)
- `granted_at`: When consent was granted
- `withdrawn_at`: When consent was withdrawn (NULL = still active)

**Constraints:**
- Consent is append-only from the application's perspective; withdrawal sets `withdrawn_at` rather than deleting the row.

---

### notifications

Log of sent notifications (email, future: push, SMS).

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_reminder_id ON notifications(reminder_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_status ON notifications(status);
```

**Fields:**
- `id`: UUIDv7 primary key (UUID)
- `user_id`: Foreign key to users table
- `reminder_id`: Foreign key to reminders table (nullable for non-reminder notifications)
- `notification_type`: Type of notification (e.g., 'email_reminder', 'email_welcome')
- `recipient`: Email address or other recipient identifier
- `subject`: Email subject line
- `sent_at`: Timestamp when notification was sent (TIMESTAMPTZ UTC)
- `status`: Delivery status (e.g., 'sent', 'delivered', 'bounced', 'failed')
- `provider_message_id`: Message ID from email provider (Mailjet/Postmark)
- `error_message`: Error details if delivery failed
- `created_at`: Record creation timestamp (TIMESTAMPTZ UTC)

---

### audit_logs

Field-level, append-only activity log per contract. Records before/after values (JSONB) for contract changes and share grants/revocations.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contract', 'contract_share')),
  entity_id UUID NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  field TEXT,
  before_value JSONB,
  after_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC) WHERE deleted_at IS NULL;
```

**Fields:**
- `id`: UUIDv7 primary key (UUID)
- `entity_type`: What changed (`contract` or `contract_share`)
- `entity_id`: UUID of the contract (or share) that changed
- `actor_user_id`: User who performed the action (SET NULL on user erasure)
- `action`: `created`, `updated`, `soft_deleted`, `hard_deleted`, `shared`, `revoked`
- `field`: Which field changed (NULL for non-field actions)
- `before_value` / `after_value`: JSONB values of the changed field (NULL where not applicable)
- `created_at`: When the action occurred
- `deleted_at`: Soft-delete state (mirrors the contract's soft/hard delete model)

**Integrity & retention:**
- Append-only from the application layer (no UPDATE/DELETE paths are exposed).
- Normal "delete contract" soft-deletes the contract *and* its audit rows (both recoverable). Hard/GDPR erasure physically cascades.
- Retention is bounded and configurable (user-stated 10-year soft cap, pending legal/DPA confirmation).

---

## Soft Delete Strategy

Main tables (`users`, `contracts`) and `audit_logs` use soft delete via the `deleted_at` timestamp column.

**Rules:**
- Set `deleted_at = now()` to soft delete a record
- Queries should filter with `WHERE deleted_at IS NULL`
- Soft-deleted records are retained for audit and GDPR compliance
- Hard delete only for GDPR data deletion requests

**Implementation:**
- Application layer must add `WHERE deleted_at IS NULL` to all queries
- Partial indexes use `WHERE deleted_at IS NULL` for performance
- Repository layer should provide both `Delete()` (soft) and `HardDelete()` methods
- Foreign keys are enforced by PostgreSQL; `ON DELETE CASCADE`/`SET NULL` is explicit per column

**Contract-specific:** normal "delete contract" soft-deletes the contract *and* its `audit_logs` rows (both recoverable). Hard/GDPR erasure physically cascades (`ON DELETE CASCADE`).

---

## Audit Timestamps

All tables include audit timestamps stored as `TIMESTAMPTZ` in UTC:

- `created_at`: Set to `now()` on INSERT, never updated
- `updated_at`: Set to `now()` on INSERT, updated to `now()` on every UPDATE

**Implementation:**
`updated_at` is updated in application code (matching the existing SQLite approach; a trigger could later centralize this):

```go
func (r *repository) Update(ctx context.Context, c *Contract) error {
    query := `
        UPDATE contracts
        SET name = $1, category = $2, provider = $3, cost = $4, updated_at = now()
        WHERE id = $5 AND deleted_at IS NULL
    `
    result, err := r.db.ExecContext(ctx, query, c.Name, c.Category, c.Provider, c.Cost, c.ID)
    if err != nil {
        return fmt.Errorf("failed to update contract: %w", err)
    }
    // ... check rows affected ...
    return nil
}
```

---

## Indexes Strategy

### Primary Indexes

1. **Foreign keys**: All foreign key columns are indexed
2. **Frequently queried columns**: `email`, `status`, `category`, `grantee_email`
3. **Date-based queries**: `renewal_date`, `cancellation_deadline`, `scheduled_date`, `created_at`
4. **Composite indexes**: For common query patterns (e.g., `user_id + status`)

### Partial Indexes

PostgreSQL supports partial indexes with `WHERE` clauses. Use `WHERE deleted_at IS NULL` to:
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

Use `golang-migrate` with the `pgx` PostgreSQL driver (`github.com/golang-migrate/migrate/v4/database/pgx`).

### Migration File Naming

```
migrations/
├── 000001_create_users.up.sql
├── 000001_create_users.down.sql
├── 000002_create_contracts.up.sql
├── 000002_create_contracts.down.sql
├── 000003_create_contract_shares.up.sql
├── 000003_create_contract_shares.down.sql
├── 000004_create_reminder_preferences.up.sql
├── 000004_create_reminder_preferences.down.sql
├── 000005_create_reminders.up.sql
├── 000005_create_reminders.down.sql
├── 000006_create_consents.up.sql
├── 000006_create_consents.down.sql
├── 000007_create_notifications.up.sql
├── 000007_create_notifications.down.sql
├── 000008_create_audit_logs.up.sql
└── 000008_create_audit_logs.down.sql
```

### Migration Rules

1. **Always reversible**: Every `.up.sql` must have a corresponding `.down.sql`
2. **Never drop columns in same release as code removal**:
   - Release 1: Remove code that uses column
   - Release 2: Drop column in migration
3. **Test rollback**: Always test `.down.sql` migrations before deploying
4. **Backfill data**: When adding non-nullable columns, provide default values or backfill existing rows
5. **Foreign keys**: PostgreSQL enforces foreign keys automatically — no per-connection PRAGMA is needed.

---

## Backup Strategy

### Daily Backups

- **Frequency**: Daily at 2:00 AM CET
- **Method**: Use `pg_dump` for a consistent logical backup. Encrypt the backup (e.g. `age`/`gpg`) before uploading off-host.
- **Retention**: 30 days
- **Storage**: Encrypted off-host storage (Hetzner Storage Box)

### Backup Command

```bash
# Logical backup of the app database
pg_dump "postgres://user:pass@localhost:5432/custodr" | age -r <recipient> > /backups/custodr_$(date +%Y%m%d).sql.age
```

### Restore Testing

- **Frequency**: Weekly automated restore tests
- **Process**: Restore to a test database, verify data integrity
- **Alerting**: Notify on restore failure

---

## Performance Considerations

### Query Optimization

1. **Avoid SELECT ***: Always specify columns explicitly
2. **Use parameterized queries**: Prevent SQL injection (`$1`, `$2` placeholders with pgx)
3. **Batch operations**: Use multi-row `INSERT ... VALUES (...), (...), ...` for bulk inserts
4. **Pagination**: Use `LIMIT` and `OFFSET` for large result sets
5. **EXPLAIN ANALYZE**: Review query plans for complex queries

### Concurrency Model

PostgreSQL supports **MVCC** (multi-version concurrency control): concurrent readers do not block writers and vice versa, well beyond MVP load.

- **Connection pooling**: Use `pgxpool` for a pooled connection set.
- The `api` and `worker` containers connect to the same `postgres` service.

### Monitoring

Track these metrics:
- Query execution time
- Connection pool utilization
- Database size growth
- Slow query log entries

---

## Security

### Encryption at Rest

Encryption is applied at the filesystem level, not the database driver level:

- **At rest**: The data volume is encrypted with LUKS/dm-crypt on the Hetzner VPS host. The PostgreSQL data directory inherits this protection.
- **In transit**: PostgreSQL connections within the compose network; for remote access (not in MVP), use TLS at the transport layer.
- **Backups**: Backup files are encrypted (e.g. `age`/`gpg`) before being uploaded to off-host storage. Store the backup encryption key separately.

### Access Control

- **Application**: Connects to PostgreSQL with a dedicated application role (least privilege) — not superuser.
- **Migrations**: Run with a role that has DDL privileges (or the application role if granted).
- **No superuser for the app**: The application role holds only the privileges it needs.

---

## GDPR Compliance

### Data Minimization

- Only collect data necessary for contract management (name + email; no phone/address in MVP)
- No document storage in MVP (structured data only)
- Email addresses used only for authentication and notifications
- Consent is documented in the `consents` table (versioned, withdrawable)

### Right to Erasure

Implement user data deletion. Cascading deletes handle related records:

```sql
-- Hard delete user and all related data (cascades to contracts, reminders,
-- preferences, notifications, consents; audit_logs.actor_user_id → SET NULL)
DELETE FROM users WHERE id = $1;
```

### Data Portability

Export user data as JSON (assembled in the application layer from multiple queries):

```go
// Application-layer export — query users, contracts, reminder_preferences,
// consents separately and assemble JSON in Go.
```

### Data Retention

- **Active users**: Retain all data
- **Deleted users**: Hard delete after 30 days (grace period)
- **Notifications**: Retain for 1 year for audit purposes
- **Audit logs**: Bounded, configurable retention (user-stated 10-year soft cap, pending legal/DPA confirmation)
