#!/bin/bash

# Pre-tool-use hook: Validates code before writing
# This hook runs before write_to_file and replace_in_file operations

set -e

# Read the tool input from stdin
INPUT=$(cat)

# Extract file path and content
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.path // .tool_input.file_path // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# If we couldn't extract path or content, allow the operation
if [ -z "$FILE_PATH" ] || [ -z "$CONTENT" ]; then
  exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"

# Validation functions

check_go_code() {
  local content="$1"
  local errors=""
  
  # Check for SQL injection (string concatenation in queries)
  if echo "$content" | grep -qE '(SELECT|INSERT|UPDATE|DELETE).*\+.*\+'; then
    errors="${errors}❌ SQL injection risk: Use parameterized queries instead of string concatenation\n"
  fi
  
  # Check for missing error wrapping
  if echo "$content" | grep -qE 'return err$' && ! echo "$content" | grep -qE 'fmt\.Errorf.*%w'; then
    errors="${errors}⚠️  Consider wrapping errors with context: fmt.Errorf(\"failed to X: %w\", err)\n"
  fi
  
  # Check for direct Firebase calls (should use AuthProvider interface)
  if echo "$content" | grep -qE 'firebase\.app\.(GetApp|InitializeApp)'; then
    errors="${errors}❌ Direct Firebase call detected: Use AuthProvider interface instead\n"
  fi
  
  # Check for SELECT * (should specify columns)
  if echo "$content" | grep -qE 'SELECT\s+\*'; then
    errors="${errors}⚠️  SELECT * detected: Specify columns explicitly for better performance\n"
  fi
  
  # Check for missing deleted_at filter
  if echo "$content" | grep -qE '(SELECT|UPDATE|DELETE).*FROM' && ! echo "$content" | grep -qE 'deleted_at'; then
    errors="${errors}⚠️  Missing deleted_at filter: Add WHERE deleted_at IS NULL for soft deletes\n"
  fi
  
  if [ -n "$errors" ]; then
    echo -e "$errors"
    return 1
  fi
  
  return 0
}

check_typescript_code() {
  local content="$1"
  local errors=""
  
  # Check for 'any' type usage
  if echo "$content" | grep -qE ':\s*any\b|<any>|as any'; then
    errors="${errors}❌ 'any' type detected: Use explicit types or 'unknown' instead\n"
  fi
  
  # Check for inline styles (should use Tailwind)
  if echo "$content" | grep -qE 'style=\{\{'; then
    errors="${errors}⚠️  Inline styles detected: Use Tailwind CSS classes instead\n"
  fi
  
  # Check for console.log in production code (not test files)
  if [[ "$FILE_PATH" != *".test."* ]] && [[ "$FILE_PATH" != *".spec."* ]]; then
    if echo "$content" | grep -qE 'console\.(log|warn|error|info)'; then
      errors="${errors}⚠️  console.log detected: Remove before committing or use a logger\n"
    fi
  fi
  
  # Check for missing key prop in lists
  if echo "$content" | grep -qE '\.map\(' && ! echo "$content" | grep -qE 'key='; then
    errors="${errors}⚠️  Missing key prop: Add unique key prop to list items\n"
  fi
  
  # Check for direct DOM manipulation
  if echo "$content" | grep -qE 'document\.(getElementById|querySelector|createElement)'; then
    errors="${errors}❌ Direct DOM manipulation: Use React refs or state instead\n"
  fi
  
  if [ -n "$errors" ]; then
    echo -e "$errors"
    return 1
  fi
  
  return 0
}

check_sql_code() {
  local content="$1"
  local errors=""
  
  # Check for DROP TABLE without IF EXISTS
  if echo "$content" | grep -qE 'DROP TABLE' && ! echo "$content" | grep -qE 'DROP TABLE IF EXISTS'; then
    errors="${errors}⚠️  DROP TABLE without IF EXISTS: Add IF EXISTS for safety\n"
  fi
  
  # Check for missing index on foreign keys
  if echo "$content" | grep -qE 'REFERENCES' && ! echo "$content" | grep -qE 'CREATE INDEX'; then
    errors="${errors}⚠️  Foreign key without index: Consider adding an index for performance\n"
  fi
  
  # Check for TIMESTAMP instead of TIMESTAMPTZ
  if echo "$content" | grep -qE 'TIMESTAMP[^T]' && ! echo "$content" | grep -qE 'TIMESTAMPTZ'; then
    errors="${errors}⚠️  TIMESTAMP detected: Use TIMESTAMPTZ for timezone-aware timestamps\n"
  fi
  
  if [ -n "$errors" ]; then
    echo -e "$errors"
    return 1
  fi
  
  return 0
}

# Run validation based on file type
case "$EXT" in
  go)
    if ! check_go_code "$CONTENT"; then
      echo "❌ Go code validation failed"
      exit 1
    fi
    ;;
  ts|tsx|js|jsx)
    if ! check_typescript_code "$CONTENT"; then
      echo "❌ TypeScript/JavaScript code validation failed"
      exit 1
    fi
    ;;
  sql)
    if ! check_sql_code "$CONTENT"; then
      echo "❌ SQL code validation failed"
      exit 1
    fi
    ;;
esac

# All validations passed
echo "✅ Code validation passed"
exit 0
