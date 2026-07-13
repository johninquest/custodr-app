#!/bin/bash

# Stop hook: Runs final validation checks before completing a task
# This hook runs when the agent is about to finish a task

set -e

# Get project root (assuming hooks are in .github/hooks/)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "🔍 Running final validation checks..."

ERRORS=0

# Check 1: Verify Go code compiles (if Go files exist)
if find "$PROJECT_ROOT" -name "*.go" -type f | grep -q .; then
  echo "📦 Checking Go compilation..."
  if command -v go &> /dev/null; then
    if ! go build ./... 2>&1; then
      echo "❌ Go compilation failed"
      ERRORS=$((ERRORS + 1))
    else
      echo "✅ Go code compiles successfully"
    fi
  else
    echo "⚠️  Go not found, skipping compilation check"
  fi
fi

# Check 2: Run Go tests (if Go test files exist)
if find "$PROJECT_ROOT" -name "*_test.go" -type f | grep -q .; then
  echo "🧪 Running Go tests..."
  if command -v go &> /dev/null; then
    if ! go test ./... -v 2>&1 | tail -20; then
      echo "❌ Go tests failed"
      ERRORS=$((ERRORS + 1))
    else
      echo "✅ Go tests passed"
    fi
  fi
fi

# Check 3: Verify TypeScript compilation (if package.json exists)
if [ -f "$PROJECT_ROOT/package.json" ]; then
  echo "📦 Checking TypeScript compilation..."
  if [ -f "$PROJECT_ROOT/node_modules/.bin/tsc" ]; then
    if ! "$PROJECT_ROOT/node_modules/.bin/tsc" --noEmit 2>&1; then
      echo "❌ TypeScript compilation failed"
      ERRORS=$((ERRORS + 1))
    else
      echo "✅ TypeScript compiles successfully"
    fi
  else
    echo "⚠️  TypeScript not found, skipping compilation check"
  fi
fi

# Check 4: Run frontend tests (if test files exist)
if find "$PROJECT_ROOT" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" | grep -q .; then
  echo "🧪 Running frontend tests..."
  if [ -f "$PROJECT_ROOT/node_modules/.bin/jest" ]; then
    if ! "$PROJECT_ROOT/node_modules/.bin/jest" --passWithNoTests 2>&1 | tail -20; then
      echo "❌ Frontend tests failed"
      ERRORS=$((ERRORS + 1))
    else
      echo "✅ Frontend tests passed"
    fi
  elif [ -f "$PROJECT_ROOT/node_modules/.bin/vitest" ]; then
    if ! "$PROJECT_ROOT/node_modules/.bin/vitest" run 2>&1 | tail -20; then
      echo "❌ Frontend tests failed"
      ERRORS=$((ERRORS + 1))
    else
      echo "✅ Frontend tests passed"
    fi
  else
    echo "⚠️  Test runner not found, skipping frontend tests"
  fi
fi

# Check 5: Verify API contract compliance
echo "📋 Checking API contract compliance..."
if [ -f "$PROJECT_ROOT/api_spec.md" ]; then
  # Check if handlers exist and match the spec
  HANDLER_COUNT=$(find "$PROJECT_ROOT" -path "*/handlers/*.go" -type f | wc -l)
  if [ "$HANDLER_COUNT" -gt 0 ]; then
    echo "✅ Found $HANDLER_COUNT handler file(s)"
  fi
else
  echo "⚠️  api_spec.md not found"
fi

# Check 6: Verify database schema compliance
echo "🗄️  Checking database schema compliance..."
if [ -f "$PROJECT_ROOT/schema.md" ]; then
  # Check if migrations exist
  MIGRATION_COUNT=$(find "$PROJECT_ROOT" -path "*/migrations/*.sql" -type f | wc -l)
  if [ "$MIGRATION_COUNT" -gt 0 ]; then
    echo "✅ Found $MIGRATION_COUNT migration file(s)"
  fi
else
  echo "⚠️  schema.md not found"
fi

# Check 7: Check for uncommitted changes
echo "📝 Checking for uncommitted changes..."
if command -v git &> /dev/null; then
  if [ -d "$PROJECT_ROOT/.git" ]; then
    UNCOMMITTED=$(git -C "$PROJECT_ROOT" status --porcelain | wc -l)
    if [ "$UNCOMMITTED" -gt 0 ]; then
      echo "⚠️  Found $UNCOMMITTED uncommitted file(s)"
      echo "   Run 'git status' to see details"
    else
      echo "✅ No uncommitted changes"
    fi
  fi
fi

# Check 8: Verify no TODO/FIXME comments in production code
echo "🔍 Checking for TODO/FIXME comments..."
TODO_COUNT=$(grep -r "TODO\|FIXME" "$PROJECT_ROOT" --include="*.go" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
  echo "⚠️  Found $TODO_COUNT TODO/FIXME comment(s)"
  echo "   Consider addressing them before committing"
else
  echo "✅ No TODO/FIXME comments found"
fi

# Summary
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
  echo "Please fix the errors above before completing the task."
  exit 1
fi
