package reminders

import (
	"context"
	"time"
)

// Reminder represents a scheduled reminder
type Reminder struct {
	ID            string     `json:"id"`
	CommitmentID  string     `json:"commitment_id"`
	ReminderType  string     `json:"reminder_type"`
	ScheduledDate time.Time  `json:"scheduled_date"`
	SentAt        *time.Time `json:"sent_at,omitempty"`
	Status        string     `json:"status"`
	DaysBefore    int        `json:"days_before"`
	ErrorMessage  string     `json:"error_message,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ReminderPreference represents user reminder preferences
type ReminderPreference struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	ReminderWindows []int     `json:"reminder_windows"`
	EmailEnabled    bool      `json:"email_enabled"`
	Timezone        string    `json:"timezone"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Service handles reminder business logic
type Service interface {
	GetPreferences(ctx context.Context, userID string) (*ReminderPreference, error)
	UpdatePreferences(ctx context.Context, userID string, prefs *ReminderPreference) error
	List(ctx context.Context, userID string, filters map[string]string, page, limit int) ([]Reminder, error)
}

// Repository handles reminder persistence
type Repository interface {
	GetPreferences(ctx context.Context, userID string) (*ReminderPreference, error)
	UpdatePreferences(ctx context.Context, prefs *ReminderPreference) error
	List(ctx context.Context, userID string, filters map[string]string, offset, limit int) ([]Reminder, int, error)
}
