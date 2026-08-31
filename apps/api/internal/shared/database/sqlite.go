package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "modernc.org/sqlite"
)

// New creates a new database connection.
// Encryption at rest is handled at the filesystem level (e.g. LUKS/dm-crypt),
// not by the driver.
func New(dbPath string) (*sql.DB, error) {
	// Ensure data directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	// Open database — modernc.org/sqlite registers the "sqlite" driver name
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Set pragmas for performance and correctness
	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA cache_size = -64000;", // 64MB
		"PRAGMA foreign_keys = ON;",
		"PRAGMA temp_store = MEMORY;",
		"PRAGMA busy_timeout = 5000;",
	}

	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			db.Close()
			return nil, fmt.Errorf("failed to set pragma %s: %w", pragma, err)
		}
	}

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// Migrate runs database migrations
func Migrate(db *sql.DB, dbPath string) error {
	// Get migrations directory
	migrationsPath := "./migrations"
	if _, err := os.Stat(migrationsPath); os.IsNotExist(err) {
		// Try relative to executable
		ex, err := os.Executable()
		if err != nil {
			return fmt.Errorf("failed to get executable path: %w", err)
		}
		migrationsPath = filepath.Join(filepath.Dir(ex), "migrations")
	}

	// Table-rebuild migrations (e.g. 000006) drop and recreate tables that
	// other tables reference. With foreign_keys ON, DROP TABLE performs an
	// implicit DELETE whose ON DELETE CASCADE would wipe referencing rows
	// (e.g. reminders). PRAGMA foreign_keys is a no-op inside a transaction,
	// so the migration files cannot toggle it themselves — the runner must
	// disable it around m.Up() per the SQLite table-rebuild procedure, then
	// re-enable and verify integrity. The pool is pinned to one connection so
	// the PRAGMA applies to the same connection that runs the migrations.
	db.SetMaxOpenConns(1)
	if _, err := db.Exec("PRAGMA foreign_keys = OFF;"); err != nil {
		return fmt.Errorf("failed to disable foreign keys for migration: %w", err)
	}

	// Create migration driver (sqlite package works with modernc.org/sqlite)
	driver, err := sqlite.WithInstance(db, &sqlite.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	// Create migrator
	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", migrationsPath),
		"sqlite",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}

	// Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Re-enable FK enforcement and verify the rebuilt schema is consistent.
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return fmt.Errorf("failed to re-enable foreign keys after migration: %w", err)
	}
	rows, err := db.Query("PRAGMA foreign_key_check;")
	if err != nil {
		return fmt.Errorf("failed to run foreign_key_check: %w", err)
	}
	defer rows.Close()
	if rows.Next() {
		return fmt.Errorf("foreign key violations detected after migration")
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("failed to read foreign_key_check results: %w", err)
	}

	return nil
}
