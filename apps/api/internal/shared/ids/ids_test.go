package ids

import (
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew_ReturnsParseableUUID(t *testing.T) {
	// Act
	id := New()

	// Assert
	parsed, err := uuid.Parse(id)
	require.NoError(t, err, "New() must return a string parseable as a UUID, got %q", id)
	assert.Equal(t, parsed.String(), id, "string form must be the canonical UUID representation")
	assert.Equal(t, uuid.RFC4122, parsed.Variant(), "variant nibble must be RFC 4122 (RFC 9562)")
}

func TestNew_VersionNibbleIs7(t *testing.T) {
	// Table-driven over many invocations: every ID must carry version 7.
	const iterations = 100

	for i := 0; i < iterations; i++ {
		t.Run(fmt.Sprintf("iteration_%03d", i), func(t *testing.T) {
			// Act
			parsed, err := uuid.Parse(New())

			// Assert
			require.NoError(t, err)
			assert.Equal(t, uuid.Version(7), parsed.Version(),
				"version nibble must be 7 (UUIDv7), got %d", parsed.Version())
		})
	}
}

func TestNew_UniqueAcrossManyInvocations(t *testing.T) {
	// Arrange
	const count = 1000
	seen := make(map[string]struct{}, count)

	// Act
	for i := 0; i < count; i++ {
		seen[New()] = struct{}{}
	}

	// Assert
	assert.Len(t, seen, count, "every invocation of New() must produce a distinct ID")
}

func TestNew_ReturnsNonEmptyString(t *testing.T) {
	// Act
	id := New()

	// Assert
	assert.NotEmpty(t, id, "New() must never return an empty string")
}
