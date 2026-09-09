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
