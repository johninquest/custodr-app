.PHONY: run build test lint migrate-up migrate-down migrate-create clean swagger

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
	migrate -path migrations -database "sqlite://./data/commitmgr.db" up

# Run migrations down
migrate-down:
	migrate -path migrations -database "sqlite://./data/commitmgr.db" down

# Create a new migration
migrate-create:
	@read -p "Migration name: " name; \
	migrate create -ext sql -dir migrations -seq $$name

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out

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
