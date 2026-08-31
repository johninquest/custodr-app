// Package migrations_test verifies the SQL migration files against a real
// SQLite database (modernc.org/sqlite) driven by golang-migrate — the same
// engine used in production by internal/shared/database.
//
// No production code is involved: the test opens its own throwaway database
// in a temp directory and applies the migration files from this directory.
package migrations_test

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	sqlitemigrate "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
)

// newTestDB opens a throwaway SQLite database in a temp directory with a
// single connection (required so PRAGMA foreign_keys and transactions behave
// predictably) and returns it together with a migrator over this directory.
func newTestDB(t *testing.T) (*sql.DB, *migrate.Migrate) {
	t.Helper()

	dbPath := filepath.ToSlash(filepath.Join(t.TempDir(), "test.db"))
	db, err := sql.Open("sqlite", dbPath)
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	_, err = db.Exec("PRAGMA foreign_keys = ON;")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	driver, err := sqlitemigrate.WithInstance(db, &sqlitemigrate.Config{})
	require.NoError(t, err)

	wd, err := os.Getwd()
	require.NoError(t, err)
	sourceURL := "file://" + filepath.ToSlash(wd)

	m, err := migrate.NewWithDatabaseInstance(sourceURL, "sqlite", driver)
	require.NoError(t, err)

	return db, m
}

// migrateSteps applies (or reverts) n migration steps and fails the test on
// any error other than "no change". It mirrors the production runner
// (internal/shared/database.Migrate): foreign keys are disabled around the
// migration and re-enabled afterwards, because table-rebuild migrations
// (000006) drop tables that other tables reference, and PRAGMA foreign_keys
// cannot be toggled from inside the migration file itself.
func migrateSteps(t *testing.T, m *migrate.Migrate, db *sql.DB, n int) {
	t.Helper()
	_, err := db.Exec("PRAGMA foreign_keys = OFF;")
	require.NoError(t, err)
	err = m.Steps(n)
	_, err2 := db.Exec("PRAGMA foreign_keys = ON;")
	require.NoError(t, err2)
	if err != nil && err != migrate.ErrNoChange {
		t.Fatalf("migrate.Steps(%d) failed: %v", n, err)
	}
}

// seedUser inserts one user and returns its ID (commitments reference users).
func seedUser(t *testing.T, db *sql.DB) string {
	t.Helper()
	userID := "user-" + filepath.Base(t.Name())
	_, err := db.Exec(
		`INSERT INTO users (id, external_auth_provider, external_subject_id, email)
		 VALUES (?, 'firebase', ?, ?)`,
		userID, userID, userID+"@example.com",
	)
	require.NoError(t, err)
	return userID
}

// seedCommitment inserts a commitment row with the given category.
func seedCommitment(t *testing.T, db *sql.DB, userID, category, name string) {
	t.Helper()
	_, err := db.Exec(
		`INSERT INTO commitments (id, user_id, name, category, provider,
			start_date, renewal_date, cost, currency, billing_frequency, status)
		 VALUES (?, ?, ?, ?, ?, '2025-01-01', '2026-01-01', 1599, 'EUR', 'monthly', 'active')`,
		"c-"+name, userID, name, category, name,
	)
	require.NoError(t, err)
}

// commitmentCategory reads back the category of a commitment by name.
func commitmentCategory(t *testing.T, db *sql.DB, name string) string {
	t.Helper()
	var category string
	err := db.QueryRow(`SELECT category FROM commitments WHERE name = ?`, name).Scan(&category)
	require.NoError(t, err)
	return category
}

// seedReminder inserts a reminder row referencing a commitment.
func seedReminder(t *testing.T, db *sql.DB, commitmentID string) {
	t.Helper()
	_, err := db.Exec(
		`INSERT INTO reminders (id, commitment_id, reminder_type, scheduled_date, status, days_before)
		 VALUES (?, ?, 'renewal_date', '2025-12-01', 'pending', 30)`,
		"r-"+commitmentID, commitmentID,
	)
	require.NoError(t, err)
}

// reminderExists reports whether a reminder row survived.
func reminderExists(t *testing.T, db *sql.DB, commitmentID string) bool {
	t.Helper()
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM reminders WHERE commitment_id = ?`, commitmentID).Scan(&count)
	require.NoError(t, err)
	return count > 0
}

func TestMigration000006_Up_RemapsLegacyCategoriesToOther(t *testing.T) {
	// Arrange: migrate to version 5 (pre-narrowing schema) and seed rows that
	// use legacy categories removed by migration 000006, plus one row that
	// already uses a category valid in the narrowed schema.
	db, m := newTestDB(t)
	migrateSteps(t, m, db, 5)

	userID := seedUser(t, db)
	legacyCategories := []string{
		"software_subscription",
		"internet_contract",
		"gym_membership",
		"banking_product",
		"vehicle_obligation",
		"healthcare_reminder",
		"vaccination_reminder",
	}
	for i, c := range legacyCategories {
		seedCommitment(t, db, userID, c, "legacy-"+c)
		_ = i
	}
	seedCommitment(t, db, userID, "insurance", "kept-insurance")
	seedCommitment(t, db, userID, "other", "kept-other")

	// Act: apply migration 000006.
	migrateSteps(t, m, db, 1)

	// Assert: every legacy row survived and was remapped to 'other'.
	for _, c := range legacyCategories {
		assert.Equal(t, "other", commitmentCategory(t, db, "legacy-"+c),
			"legacy category %q must be remapped to 'other'", c)
	}
	assert.Equal(t, "insurance", commitmentCategory(t, db, "kept-insurance"),
		"already-valid categories must be preserved verbatim")
	assert.Equal(t, "other", commitmentCategory(t, db, "kept-other"),
		"already-valid categories must be preserved verbatim")
}

func TestMigration000006_Up_EnforcesNarrowedCategoryCheck(t *testing.T) {
	// Arrange: fully migrated database.
	db, m := newTestDB(t)
	migrateSteps(t, m, db, 6)
	userID := seedUser(t, db)

	// Act + Assert: legacy categories are rejected by the narrowed CHECK.
	for _, c := range []string{"software_subscription", "gym_membership", "vaccination_reminder"} {
		_, err := db.Exec(
			`INSERT INTO commitments (id, user_id, name, category, provider,
				start_date, renewal_date, cost, currency, billing_frequency, status)
			 VALUES (?, ?, ?, ?, ?, '2025-01-01', '2026-01-01', 1599, 'EUR', 'monthly', 'active')`,
			"reject-"+c, userID, "reject-"+c, c, "reject-"+c,
		)
		assert.Error(t, err, "category %q must violate the narrowed CHECK constraint", c)
	}

	// All 6 narrowed-schema categories are still accepted.
	for _, c := range []string{
		"insurance", "electricity_contract", "gas_contract",
		"mobile_contract", "streaming_subscription", "other",
	} {
		_, err := db.Exec(
			`INSERT INTO commitments (id, user_id, name, category, provider,
				start_date, renewal_date, cost, currency, billing_frequency, status)
			 VALUES (?, ?, ?, ?, ?, '2025-01-01', '2026-01-01', 1599, 'EUR', 'monthly', 'active')`,
			"accept-"+c, userID, "accept-"+c, c, "accept-"+c,
		)
		assert.NoError(t, err, "category %q must be accepted by the narrowed CHECK constraint", c)
	}
}

func TestMigration000006_Down_RestoresWideSchemaAndPreservesRows(t *testing.T) {
	// Arrange: fully migrated database with a legacy row already remapped.
	db, m := newTestDB(t)
	migrateSteps(t, m, db, 6)
	userID := seedUser(t, db)
	seedCommitment(t, db, userID, "insurance", "down-insurance")
	seedCommitment(t, db, userID, "other", "down-other")

	// Act: revert migration 000006.
	migrateSteps(t, m, db, -1)

	// Assert: rows survive the rebuild.
	assert.Equal(t, "insurance", commitmentCategory(t, db, "down-insurance"))
	assert.Equal(t, "other", commitmentCategory(t, db, "down-other"),
		"rows remapped to 'other' stay 'other' (original value is unrecoverable)")

	// The restored 13-value CHECK accepts legacy categories again.
	_, err := db.Exec(
		`INSERT INTO commitments (id, user_id, name, category, provider,
			start_date, renewal_date, cost, currency, billing_frequency, status)
		 VALUES (?, ?, ?, ?, ?, '2025-01-01', '2026-01-01', 1599, 'EUR', 'monthly', 'active')`,
		"down-legacy", userID, "down-legacy", "software_subscription", "down-legacy",
	)
	assert.NoError(t, err, "after down migration the legacy category must be accepted again")
}

func TestMigrations_UpThenDownThenUp_AreRepeatable(t *testing.T) {
	// The full migration chain must be safely repeatable: up → down → up.
	db, m := newTestDB(t)

	migrateSteps(t, m, db, 6)  // up all
	migrateSteps(t, m, db, -6) // down all
	migrateSteps(t, m, db, 6)  // up all again

	version, dirty, err := m.Version()
	require.NoError(t, err)
	assert.False(t, dirty, "database must never be left in a dirty state")
	assert.EqualValues(t, 6, version, "final version must be 6")
}

// TestMigration000006_Up_WithExistingReminders covers the production-critical
// scenario: the table rebuild drops and recreates commitments while reminder
// rows reference them. With foreign_keys ON, the implicit DELETE from
// DROP TABLE would cascade-delete reminders (or fail outright); the migration
// disables FK enforcement for the rebuild window so reminders survive.
func TestMigration000006_Up_WithExistingReminders(t *testing.T) {
	// Arrange: pre-narrowing schema with a commitment that has reminder history.
	db, m := newTestDB(t)
	migrateSteps(t, m, db, 5)

	userID := seedUser(t, db)
	seedCommitment(t, db, userID, "software_subscription", "with-reminders")
	seedReminder(t, db, "c-with-reminders")

	// Act: apply migration 000006.
	migrateSteps(t, m, db, 1)

	// Assert: the commitment was remapped AND its reminder survived.
	assert.Equal(t, "other", commitmentCategory(t, db, "with-reminders"))
	assert.True(t, reminderExists(t, db, "c-with-reminders"),
		"reminder rows must survive the commitments table rebuild")

	// Referential integrity must hold after re-enabling foreign keys.
	var violations int
	err := db.QueryRow(`PRAGMA foreign_key_check`).Scan(&violations)
	// foreign_key_check returns no rows when clean; a Scan error of ErrNoRows
	// means zero violations.
	if err != nil && err != sql.ErrNoRows {
		t.Fatalf("PRAGMA foreign_key_check failed: %v", err)
	}
	assert.Zero(t, violations, "no FK violations may exist after migration")
}
