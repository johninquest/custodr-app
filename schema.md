# Database Schema — Commitment Management Platform

## Overview

PostgreSQL database schema for the Commitment Management Platform. All tables use UUID primary keys and include audit timestamps.

---

## Enum Types

### commitment_status

```sql
CREATE TYPE commitment_status AS ENUM (
  'active',
  'cancelled',
  'expired',
  'paused',
  'review_needed'
);
```

### billing_frequency

```sql
CREATE TYPE billing_frequency AS ENUM (
  'monthly',
  'quarterly',
  'semi_annual',
  'annual'
);
```

### commitment_category

```sql
CREATE TYPE commitment_category AS ENUM (
  'insurance',
  'streaming_subscription',
  'software_subscription',
  'mobile_contract',
  'internet_contract',
  'electricity_contract',
  'gas_contract',
  'gym_membership',
  'banking_product',
  'vehicle_obligation',
  'healthcare_reminder',
  'vaccination_reminder',
  'other'
);
```

### reminder_type

```sql
CREATE TYPE reminder_type AS ENUM (
  'renewal_date',
  'cancellation_deadline'
);
```

### reminder_status

```sql
CREATE TYPE reminder_status AS ENUM (
  'pending',
  'sent',
  'failed'
);
```

---

## Tables

### users

Internal user table that maps external Firebase identities to internal user records.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_auth_provider VARCHAR(50) NOT NULL DEFAULT 'firebase',
  external_subject_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT users_external_subject_id_unique UNIQUE (external_auth_provider, external_subject_id),
  CONSTRAINT users_email_unique UNIQUE (email)
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_external_subject_id ON users(external_auth_provider, external_subject_id) WHERE deleted_at IS NULL;
```

**Fields:**
- `id`: Internal UUID primary key
- `external_auth_provider`: Authentication provider (currently always 'firebase')
- `external_subject_id`: Firebase UID
- `email`: User email address
- `email_verified`: Whether email is verified by Firebase
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `deleted_at`: Soft delete timestamp (NULL if not deleted)

---

### commitments

Generic commitment model that supports all commitment categories.

```sql
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
CREATE INDEX idx_commitments_user_category ON commitments(user_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_renewal_date ON commitments(renewal_date) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_commitments_cancellation_deadline ON commitments(cancellation_deadline) WHERE deleted_at IS NULL AND status = 'active' AND cancellation_deadline IS NOT NULL;
```

**Fields:**
- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `name`: Commitment name (e.g., "Netflix Premium")
- `category`: Commitment category enum
- `provider`: Service provider name
- `start_date`: Contract start date
- `renewal_date`: Next renewal date
- `cancellation_deadline`: Last date to cancel without penalty (optional)
- `cost`: Amount per billing period
- `currency`: ISO 4217 currency code (default: EUR)
- `billing_frequency`: How often billing occurs
- `status`: Current commitment status
- `notes`: Optional user notes
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp
- `deleted_at`: Soft delete timestamp

**Constraints:**
- Cost must be non-negative
- Renewal date must be after start date
- Cancellation deadline must be before renewal date (if provided)

---

### reminder_preferences

User-configurable reminder settings.

```sql
CREATE TABLE reminder_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_windows INTEGER[] NOT NULL DEFAULT '{90, 60, 30, 14, 7, 1}',
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Berlin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT reminder_preferences_user_id_unique UNIQUE (user_id),
  CONSTRAINT reminder_preferences_windows_valid CHECK (
    reminder_windows <@ '{1, 7, 14, 30, 60, 90}'
  )
);

-- Index
CREATE INDEX idx_reminder_preferences_user_id ON reminder_preferences(user_id);
```

**Fields:**
- `id`: UUID primary key
- `user_id`: Foreign key to users table (one-to-one relationship)
- `reminder_windows`: Array of days before deadline to send reminders
- `email_enabled`: Whether email reminders are enabled
- `timezone`: User's timezone for reminder scheduling
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Constraints:**
- One preference record per user
- Reminder windows must be from valid set: 1, 7, 14, 30, 60, 90 days

---

### reminders

Scheduled reminder records.

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  reminder_type reminder_type NOT NULL,
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status reminder_status NOT NULL DEFAULT 'pending',
  days_before INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT reminders_unique_schedule UNIQUE (commitment_id, reminder_type, days_before)
);

-- Indexes
CREATE INDEX idx_reminders_commitment_id ON reminders(commitment_id);
CREATE INDEX idx_reminders_scheduled_date ON reminders(scheduled_date) WHERE status = 'pending';
CREATE INDEX idx_reminders_status ON reminders(status);
```

**Fields:**
- `id`: UUID primary key
- `commitment_id`: Foreign key to commitments table
- `reminder_type`: Type of reminder (renewal or cancellation)
- `scheduled_date`: Date when reminder should be sent
- `sent_at`: Timestamp when reminder was actually sent
- `status`: Current reminder status
- `days_before`: Days before deadline (e.g., 30 for 30-day reminder)
- `error_message`: Error details if status is 'failed'
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Constraints:**
- Unique combination of commitment, type, and days_before (prevents duplicate reminders)

---

### notifications

Log of sent notifications (email, future: push, SMS).

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  notification_type VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  provider_message_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_reminder_id ON notifications(reminder_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_status ON notifications(status);
```

**Fields:**
- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `reminder_id`: Foreign key to reminders table (nullable for non-reminder notifications)
- `notification_type`: Type of notification (e.g., 'email_reminder', 'email_welcome')
- `recipient`: Email address or other recipient identifier
- `subject`: Email subject line
- `sent_at`: Timestamp when notification was sent
- `status`: Delivery status (e.g., 'sent', 'delivered', 'bounced', 'failed')
- `provider_message_id`: Message ID from email provider (Mailjet/Postmark)
- `error_message`: Error details if delivery failed
- `created_at`: Record creation timestamp

---

## Soft Delete Strategy

All main tables (`users`, `commitments`) use soft delete via the `deleted_at` timestamp column.

**Rules:**
- Set `deleted_at = NOW()` to soft delete a record
- Queries should filter with `WHERE deleted_at IS NULL`
- Soft-deleted records are retained for audit and GDPR compliance
- Hard delete only for GDPR data deletion requests

**Implementation:**
- Application layer must add `WHERE deleted_at IS NULL` to all queries
- Indexes should include `WHERE deleted_at IS NULL` for performance
- Repository layer should provide both `Delete()` (soft) and `HardDelete()` methods

---

## Audit Timestamps

All tables include audit timestamps:

- `created_at`: Set to `NOW()` on INSERT, never updated
- `updated_at`: Set to `NOW()` on INSERT, updated to `NOW()` on every UPDATE

**Implementation:**
Use PostgreSQL triggers to automatically update `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to each table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commitments_updated_at BEFORE UPDATE ON commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_preferences_updated_at BEFORE UPDATE ON reminder_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Indexes Strategy

### Primary Indexes

1. **Foreign keys**: All foreign key columns are indexed
2. **Frequently queried columns**: `email`, `status`, `category`
3. **Date-based queries**: `renewal_date`, `cancellation_deadline`, `scheduled_date`
4. **Composite indexes**: For common query patterns (e.g., `user_id + status`)

### Partial Indexes

Use partial indexes with `WHERE deleted_at IS NULL` to:
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

Use `golang-migrate` for database migrations.

### Migration File Naming

```
000001_create_users.up.sql
000001_create_users.down.sql
000002_create_commitments.up.sql
000002_create_commitments.down.sql
```

### Migration Rules

1. **Always reversible**: Every `.up.sql` must have a corresponding `.down.sql`
2. **Never drop columns in same release as code removal**: 
   - Release 1: Remove code that uses column
   - Release 2: Drop column in migration
3. **Test rollback**: Always test `.down.sql` migrations before deploying
4. **Backfill data**: When adding non-nullable columns, provide default values or backfill existing rows
5. **Index creation**: Create indexes concurrently in production to avoid locks:
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```

---

## Backup Strategy

### Daily Backups

- **Frequency**: Daily at 2:00 AM CET
- **Method**: `pg_dump` with custom format
- **Retention**: 30 days
- **Storage**: Encrypted S3-compatible storage (Hetzner Storage Box)

### Backup Command

```bash
pg_dump -Fc -Z 9 -f backup_$(date +%Y%m%d).dump commitmgr_db
```

### Restore Testing

- **Frequency**: Weekly automated restore tests
- **Process**: Restore to test database, verify data integrity
- **Alerting**: Notify on restore failure

---

## Performance Considerations

### Query Optimization

1. **Avoid SELECT ***: Always specify columns explicitly
2. **Use prepared statements**: Prevent SQL injection and improve performance
3. **Batch operations**: Use `INSERT ... VALUES (...), (...), ...` for bulk inserts
4. **Pagination**: Use `LIMIT` and `OFFSET` for large result sets
5. **EXPLAIN ANALYZE**: Review query plans for complex queries

### Connection Pooling

- Use `pgxpool` for connection pooling in Go
- **Pool size**: 20 connections (adjust based on load)
- **Timeout**: 30 seconds for connection acquisition

### Monitoring

Track these metrics:
- Query execution time (p50, p95, p99)
- Connection pool utilization
- Index usage statistics
- Table bloat and vacuum status

---

## Security

### Row Level Security (Future)

For multi-tenant scenarios, implement RLS:

```sql
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY commitments_user_policy ON commitments
  USING (user_id = current_setting('app.current_user_id')::UUID);
```

### Data Encryption

- **At rest**: PostgreSQL data directory encrypted via filesystem (LUKS)
- **In transit**: TLS 1.3 for all database connections
- **Backups**: AES-256 encryption before upload to storage

### Access Control

- **Application user**: Limited permissions (SELECT, INSERT, UPDATE, DELETE)
- **Migration user**: DDL permissions (CREATE, ALTER, DROP)
- **Read-only user**: For analytics and reporting
- **No superuser**: Application never uses superuser credentials

---

## GDPR Compliance

### Data Minimization

- Only collect data necessary for commitment management
- No document storage in MVP (structured data only)
- Email addresses used only for authentication and notifications

### Right to Erasure

Implement user data deletion:

```sql
-- Hard delete user and all related data
DELETE FROM users WHERE id = $1;
-- CASCADE deletes commitments, reminders, preferences, notifications
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

### Data Retention

- **Active users**: Retain all data
- **Deleted users**: Hard delete after 30 days (grace period)
- **Notifications**: Retain for 1 year for audit purposes
- **Reminders**: Retain for 1 year after sent

---

## Schema Versioning

Track schema version in `schema_migrations` table (managed by golang-migrate):

```sql
CREATE TABLE schema_migrations (
  version BIGINT PRIMARY KEY,
  dirty BOOLEAN NOT NULL
);
```

---

## Future Considerations

### Partitioning

For large datasets, consider partitioning:
- `commitments` by `user_id` (hash partitioning)
- `notifications` by `sent_at` (range partitioning by month)

### Materialized Views

For dashboard aggregations:

```sql
CREATE MATERIALIZED VIEW mv_dashboard_summary AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  SUM(cost) FILTER (WHERE billing_frequency = 'monthly') as monthly_cost
FROM commitments
WHERE deleted_at IS NULL
GROUP BY user_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_summary;
```

### Full-Text Search

For commitment search:

```sql
ALTER TABLE commitments ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') ||
    setweight(to_tsvector('english', provider), 'B') ||
    setweight(to_tsvector('english', notes), 'C')
  ) STORED;

CREATE INDEX idx_commitments_search ON commitments USING GIN(search_vector);
```
