CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('renewal_date', 'cancellation_deadline')),
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  days_before INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reminders_unique_schedule UNIQUE (contract_id, reminder_type, days_before)
);

CREATE INDEX idx_reminders_contract_id ON reminders(contract_id);
CREATE INDEX idx_reminders_scheduled_date ON reminders(scheduled_date) WHERE status = 'pending';
CREATE INDEX idx_reminders_status ON reminders(status);
