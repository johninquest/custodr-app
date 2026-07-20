package notifications

import (
	"context"
	"time"
)

// Notification represents a sent notification
type Notification struct {
	ID                string    `json:"id"`
	UserID            string    `json:"user_id"`
	ReminderID        *string   `json:"reminder_id,omitempty"`
	NotificationType  string    `json:"notification_type"`
	Recipient         string    `json:"recipient"`
	Subject           string    `json:"subject,omitempty"`
	SentAt            time.Time `json:"sent_at"`
	Status            string    `json:"status"`
	ProviderMessageID string    `json:"provider_message_id,omitempty"`
	ErrorMessage      string    `json:"error_message,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

// EmailProvider sends emails
type EmailProvider interface {
	SendEmail(ctx context.Context, to, subject, body string) (string, error) // returns messageID, error
}

// Service handles notification business logic
type Service interface {
	SendReminderEmail(ctx context.Context, userID, commitmentID, reminderType string, scheduledDate time.Time) error
}
