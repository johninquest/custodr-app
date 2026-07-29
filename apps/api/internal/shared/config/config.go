package config

import (
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	// Server
	ServerHost string
	ServerPort string

	// Database
	DBPath string

	// Firebase
	FirebaseProjectID       string
	FirebaseCredentialsPath string

	// Email (Mailjet)
	MailjetAPIKey    string
	MailjetAPISecret string
	MailjetFromEmail string
	MailjetFromName  string

	// Frontend
	FrontendURL string

	// Logging
	LogLevel string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := &Config{
		// Server
		ServerHost: getEnv("SERVER_HOST", "0.0.0.0"),
		ServerPort: getEnv("SERVER_PORT", "8080"),

		// Database
		DBPath: getEnv("DB_PATH", "./data/commitmgr.db"),

		// Firebase
		FirebaseProjectID:       getEnv("FIREBASE_PROJECT_ID", ""),
		FirebaseCredentialsPath: getEnv("FIREBASE_CREDENTIALS_PATH", "./firebase-service-account.json"),

		// Email
		MailjetAPIKey:    getEnv("MAILJET_API_KEY", ""),
		MailjetAPISecret: getEnv("MAILJET_API_SECRET", ""),
		MailjetFromEmail: getEnv("MAILJET_FROM_EMAIL", "noreply@example.com"),
		MailjetFromName:  getEnv("MAILJET_FROM_NAME", "Commitment Manager"),

		// Frontend
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),

		// Logging
		LogLevel: getEnv("LOG_LEVEL", "info"),
	}

	return cfg, nil
}

// getEnv returns the value of an environment variable or a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
