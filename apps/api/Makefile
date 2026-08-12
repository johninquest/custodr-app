.PHONY: run build test lint migrate-up migrate-down migrate-create clean swagger fmt tidy deps stop

# Load DB_PATH from .env if it exists, fallback to default
DB_PATH ?= $(shell grep -oP '(?<=^DB_PATH=).*' .env 2>/dev/null || echo "./data/custodr.db")

# Run the server
run:
    go run ./cmd/server

# Build the binary
build:
    go build -o bin/server ./cmd/server

# Run tests
test:
    go test -v -race -coverprofile=coverage.out ./...

# Run linter
lint:
    golangci-lint run

# Generate Swagger documentation
swagger:
    swag init -g cmd/server/main.go -o docs

# Run migrations up
migrate-up:
    migrate -path migrations -database "sqlite://$(DB_PATH)" up

# Run migrations down
migrate-down:
    migrate -path migrations -database "sqlite://$(DB_PATH)" down

# Create a new migration (usage: make migrate-create name=add_email_column)
migrate-create:
    migrate create -ext sql -dir migrations -seq $(name)

# Clean build artifacts
clean:
    rm -rf bin/
    rm -f coverage.out

# Stop any running server process on port 8080
stop:
    @echo "Stopping any process on port 8080..."
    @netstat -ano | findstr :8080 | findstr LISTENING >nul 2>&1 && \
        FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') DO taskkill /PID %P /F || \
        echo "No process found on port 8080"

# Format code
fmt:
    go fmt ./...
    goimports -w .

# Tidy dependencies
tidy:
    go mod tidy

# Install dependencies
deps:
    go mod download
