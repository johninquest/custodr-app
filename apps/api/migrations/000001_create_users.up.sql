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
