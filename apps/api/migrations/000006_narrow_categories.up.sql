-- Narrow commitment_category to the 5 MVP starter categories + fallback.
-- SQLite cannot alter a CHECK constraint in place: rebuild the table.
-- Rows using removed categories are remapped to 'other' (preserving data).
--
-- Foreign keys must be disabled for the rebuild window (SQLite documented
-- procedure): with foreign_keys ON, DROP TABLE commitments performs an
-- implicit DELETE whose ON DELETE CASCADE would silently wipe reminders.
-- The PRAGMA cannot live in this file: the migration runner executes the
-- file as a single batch inside an implicit transaction, and PRAGMA
-- foreign_keys is a no-op inside a transaction. The runner
-- (internal/shared/database.Migrate) disables it around m.Up() instead.

CREATE TABLE commitments_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'insurance', 'electricity_contract', 'gas_contract',
    'mobile_contract', 'streaming_subscription', 'other'
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

INSERT INTO commitments_new (
  id, user_id, name, category, provider, start_date, renewal_date,
  cancellation_deadline, cost, currency, billing_frequency, status,
  notes, created_at, updated_at, deleted_at
)
SELECT
  id, user_id, name,
  CASE
    WHEN category IN (
      'insurance', 'electricity_contract', 'gas_contract',
      'mobile_contract', 'streaming_subscription'
    ) THEN category
    ELSE 'other'
  END,
  provider, start_date, renewal_date,
  cancellation_deadline, cost, currency, billing_frequency, status,
  notes, created_at, updated_at, deleted_at
FROM commitments;

DROP TABLE commitments;
ALTER TABLE commitments_new RENAME TO commitments;

CREATE INDEX idx_commitments_user_id ON commitments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_user_status ON commitments(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_user_category ON commitments(user_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_commitments_renewal_date ON commitments(renewal_date) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_commitments_cancellation_deadline ON commitments(cancellation_deadline) WHERE deleted_at IS NULL AND status = 'active' AND cancellation_deadline IS NOT NULL;
