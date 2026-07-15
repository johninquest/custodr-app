#!/bin/bash

# Stop hook: Final gate before a task is marked "done".
# Keeps the agent honest: nothing is done until it builds, tests, and lints.
# Degrades gracefully — missing tools skip with a warning rather than failing.

set -e

# Get project root (assuming hooks are in .github/hooks/)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "🔍 Running final validation checks..."

ERRORS=0

# --- Go: build + test + lint (only if Go files exist) ---
if find "$PROJECT_ROOT" -name "*.go" -type f -not -path "*/vendor/*" | grep -q .; then
  if command -v go &> /dev/null; then
    echo "📦 Checking Go compilation..."
    if ! go build ./... 2>&1; then
      echo "❌ Go compilation failed"
      ERRORS=$((ERRORS + 1))
    else
      echo "✅ Go code compiles"
    fi

    if find "$PROJECT_ROOT" -name "*_test.go" -type f | grep -q .; then
      echo "🧪 Running Go tests..."
      if ! go test ./... 2>&1 | tail -20; then
        echo "❌ Go tests failed"
        ERRORS=$((ERRORS + 1))
      else
        echo "✅ Go tests passed"
      fi
    fi

    if command -v golangci-lint &> /dev/null; then
      echo "🧹 Running golangci-lint..."
      if ! golangci-lint run ./... 2>&1 | tail -30; then
        echo "❌ golangci-lint failed"
        ERRORS=$((ERRORS + 1))
      else
        echo "✅ golangci-lint passed"
      fi
    else
      echo "⚠️  golangci-lint not found, skipping Go lint"
    fi
  else
    echo "⚠️  Go not found, skipping Go checks"
  fi
fi

# --- TypeScript: tsc + test + lint (only if package.json exists) ---
if [ -f "$PROJECT_ROOT/package.json" ]; then
  if [ -f "$PROJECT_ROOT/node_modules/.bin/tsc" ]; then
    echo "📦 Checking TypeScript compilation..."
    if ! "$PROJECT_ROOT/node_modules/.bin/tsc" --noEmit 2>&1; then
      echo "❌ TypeScript compilation failed"
      ERRORS=$((ERRORS + 1))
    else
      echo "✅ TypeScript compiles"
    fi
  else
    echo "⚠️  tsc not found (run npm install), skipping TS compilation"
  fi

  if find "$PROJECT_ROOT" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" | grep -q .; then
    echo "🧪 Running frontend tests..."
    if [ -f "$PROJECT_ROOT/node_modules/.bin/vitest" ]; then
      if ! "$PROJECT_ROOT/node_modules/.bin/vitest" run 2>&1 | tail -20; then
        echo "❌ Frontend tests failed"
        ERRORS=$((ERRORS + 1))
      else
        echo "✅ Frontend tests passed"
      fi
    elif [ -f "$PROJECT_ROOT/node_modules/.bin/jest" ]; then
      if ! "$PROJECT_ROOT/node_modules/.bin/jest" --passWithNoTests 2>&1 | tail -20; then
        echo "❌ Frontend tests failed"
        ERRORS=$((ERRORS + 1))
      else
        echo "✅ Frontend tests passed"
      fi
    else
      echo "⚠️  No test runner found (vitest/jest), skipping frontend tests"
    fi
  fi

  if [ -f "$PROJECT_ROOT/node_modules/.bin/eslint" ]; then
    echo "🧹 Running ESLint..."
    if ! "$PROJECT_ROOT/node_modules/.bin/eslint" . --max-warnings=0 2>&1 | tail -30; then
      echo "❌ ESLint failed"
      ERRORS=$((ERRORS + 1))
    else
      echo "✅ ESLint passed"
    fi
  else
    echo "⚠️  ESLint not found, skipping TS lint"
  fi
fi

# --- Summary ---
echo ""
echo "========================================="
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ All validation checks passed!"
  echo "========================================="
  exit 0
else
  echo "❌ $ERRORS validation check(s) failed"
  echo "========================================="
  echo ""
  echo "Fix the errors above before completing the task."
  exit 1
fi
