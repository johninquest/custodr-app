CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_reminder_id ON notifications(reminder_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_status ON notifications(status);
