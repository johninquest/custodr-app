# ============================================
# Stage 1: Install dependencies and build
# ============================================
FROM node:24-alpine3.24 AS builder

WORKDIR /app

# Copy manifests first for better layer caching.
# The root lockfile is required: api-nest is an npm workspace member and
# resolves shared dependencies from the monorepo root.
COPY package.json package-lock.json* ./
COPY apps/api-nest/package.json ./apps/api-nest/

RUN npm ci --workspace=api-nest --include-workspace-root

# Copy the workspace source
COPY apps/api-nest ./apps/api-nest

# Build the NestJS application
RUN npm run build --workspace=api-nest

# Prune dev dependencies from the installed tree
RUN npm prune --omit=dev --workspace=api-nest

# ============================================
# Stage 2: Minimal runtime image
# ============================================
FROM node:24-alpine3.24 AS runtime

# Install runtime dependencies (wget is used by the healthcheck)
RUN apk add --no-cache wget tzdata

WORKDIR /app

# Copy the pruned dependency tree and built output from the builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-nest/node_modules ./apps/api-nest/node_modules
COPY --from=builder /app/apps/api-nest/package.json ./apps/api-nest/package.json
COPY --from=builder /app/apps/api-nest/dist ./apps/api-nest/dist
COPY --from=builder /app/apps/api-nest/drizzle ./apps/api-nest/drizzle

WORKDIR /app/apps/api-nest

# Run as the built-in non-root node user
USER node

# Expose the application port
EXPOSE 8080

# Health check — /health is served at the root, outside the /api/v1 prefix
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the built server
CMD ["node", "dist/main"]
