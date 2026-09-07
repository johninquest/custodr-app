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
