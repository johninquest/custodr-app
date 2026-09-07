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
