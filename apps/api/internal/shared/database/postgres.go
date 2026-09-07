package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	pgxmigrate "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// New creates a new PostgreSQL connection pool using the pgx stdlib driver.
// Encryption at rest is handled at the filesystem level (e.g. LUKS/dm-crypt),
// not by the driver.
func New(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Pool settings: keep a modest, bounded pool suited to a single VPS.
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// Migrate runs database migrations against the connected PostgreSQL database.
func Migrate(db *sql.DB) error {
	migrationsPath := resolveMigrationsPath()

	driver, err := pgxmigrate.WithInstance(db, &pgxmigrate.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", filepath.ToSlash(migrationsPath)),
		"pgx",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// resolveMigrationsPath locates the migrations directory, preferring the
// current working directory and falling back to the executable's directory.
func resolveMigrationsPath() string {
	migrationsPath := "./migrations"
	if _, err := os.Stat(migrationsPath); os.IsNotExist(err) {
		ex, err := os.Executable()
		if err != nil {
			return migrationsPath
		}
		migrationsPath = filepath.Join(filepath.Dir(ex), "migrations")
	}
	return migrationsPath
}
