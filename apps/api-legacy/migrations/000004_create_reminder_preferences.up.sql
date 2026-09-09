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
