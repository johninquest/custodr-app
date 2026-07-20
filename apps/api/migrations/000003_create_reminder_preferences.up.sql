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
