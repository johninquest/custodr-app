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
