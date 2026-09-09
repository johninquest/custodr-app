# ============================================
# Stage 1: Build the Go binary
# ============================================
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy dependency files first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary — pgx uses the database/sql driver, no CGO required
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/server \
    ./cmd/server

# ============================================
# Stage 2: Minimal runtime image
# ============================================
FROM alpine:3.19 AS runtime

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server .

# Copy migrations
COPY --from=builder /app/migrations ./migrations

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the binary
ENTRYPOINT ["./server"]
