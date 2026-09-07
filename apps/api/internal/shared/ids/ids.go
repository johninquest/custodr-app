// Package ids centralizes ID generation for all domain modules.
//
// All primary keys are UUIDv7 (RFC 9562): time-ordered, which improves
// B-tree index locality compared to random UUIDv4 values.
package ids

import "github.com/google/uuid"

// New returns a new UUIDv7 as a string, for use as a TEXT primary key.
func New() string {
	id, err := uuid.NewV7()
	if err != nil {
		// uuid.NewV7 only fails if the system source of randomness fails,
		// which is unrecoverable. Fall back to the package-level generator
		// (which panics on the same condition) rather than returning "".
		return uuid.Must(uuid.NewRandom()).String()
	}
	return id.String()
}
