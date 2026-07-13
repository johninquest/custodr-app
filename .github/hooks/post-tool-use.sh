#!/bin/bash

# Post-tool-use hook: Runs formatters and linters after code is written
# This hook runs after write_to_file and replace_in_file operations

set -e

# Read the tool input from stdin
INPUT=$(cat)

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.path // .tool_input.file_path // empty')

# If we couldn't extract path, skip formatting
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"

# Get project root (assuming hooks are in .github/hooks/)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Formatting functions

format_go_code() {
  local file="$1"
  
  # Check if gofmt is available
  if command -v gofmt &> /dev/null; then
    # Format the file
    gofmt -w "$file"
    echo "✅ Formatted with gofmt"
  else
    echo "⚠️  gofmt not found, skipping Go formatting"
  fi
  
  # Check if goimports is available
  if command -v goimports &> /dev/null; then
    # Format imports
    goimports -w "$file"
    echo "✅ Formatted imports with goimports"
  fi
}

format_typescript_code() {
  local file="$1"
  local project_root="$2"
  
  # Check if prettier is available
  if [ -f "$project_root/node_modules/.bin/prettier" ]; then
    "$project_root/node_modules/.bin/prettier" --write "$file"
    echo "✅ Formatted with Prettier"
  elif command -v prettier &> /dev/null; then
    prettier --write "$file"
    echo "✅ Formatted with Prettier"
  else
    echo "⚠️  Prettier not found, skipping TypeScript formatting"
  fi
  
  # Check if eslint is available
  if [ -f "$project_root/node_modules/.bin/eslint" ]; then
    "$project_root/node_modules/.bin/eslint" --fix "$file" || true
    echo "✅ Fixed with ESLint"
  elif command -v eslint &> /dev/null; then
    eslint --fix "$file" || true
    echo "✅ Fixed with ESLint"
  fi
}

format_sql_code() {
  local file="$1"
  
  # Check if sql-formatter is available
  if command -v sql-formatter &> /dev/null; then
    sql-formatter --fix "$file"
    echo "✅ Formatted with sql-formatter"
  else
    echo "⚠️  sql-formatter not found, skipping SQL formatting"
  fi
}

# Run formatting based on file type
case "$EXT" in
  go)
    format_go_code "$FILE_PATH"
    ;;
  ts|tsx|js|jsx)
    format_typescript_code "$FILE_PATH" "$PROJECT_ROOT"
    ;;
  sql)
    format_sql_code "$FILE_PATH"
    ;;
  md)
    # Format markdown with prettier if available
    if [ -f "$PROJECT_ROOT/node_modules/.bin/prettier" ]; then
      "$PROJECT_ROOT/node_modules/.bin/prettier" --write "$FILE_PATH"
      echo "✅ Formatted markdown with Prettier"
    fi
    ;;
  json|yaml|yml)
    # Format config files with prettier if available
    if [ -f "$PROJECT_ROOT/node_modules/.bin/prettier" ]; then
      "$PROJECT_ROOT/node_modules/.bin/prettier" --write "$FILE_PATH"
      echo "✅ Formatted config file with Prettier"
    fi
    ;;
esac

echo "✅ Post-tool-use hook completed"
exit 0
