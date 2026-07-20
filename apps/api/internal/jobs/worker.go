package jobs

import (
	"context"
	"time"

	"github.com/commit-mgr/api/internal/shared/logger"
)

// Worker handles background job processing
type Worker struct {
	logger *logger.Logger
}

// NewWorker creates a new worker instance
func NewWorker(log *logger.Logger) *Worker {
	return &Worker{
		logger: log,
	}
}

// Start starts the background worker
func (w *Worker) Start(ctx context.Context) error {
	w.logger.Info("Background worker started")

	// TODO: Implement reminder processing job
	// Schedule: Daily at 08:00 CET
	// Query pending reminders where scheduled_date <= today
	// Send emails via notification service
	// Update reminder status

	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Background worker stopped")
			return nil
		case <-ticker.C:
			w.logger.Debug("Worker tick")
			// TODO: Process pending reminders
		}
	}
}
