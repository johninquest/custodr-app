CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  commitment_id TEXT NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('renewal_date', 'cancellation_deadline')),
  scheduled_date TEXT NOT NULL,
  sent_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  days_before INTEGER NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT reminders_unique_schedule UNIQUE (commitment_id, reminder_type, days_before)
);

CREATE INDEX idx_reminders_commitment_id ON reminders(commitment_id);
CREATE INDEX idx_reminders_scheduled_date ON reminders(scheduled_date) WHERE status = 'pending';
CREATE INDEX idx_reminders_status ON reminders(status);
