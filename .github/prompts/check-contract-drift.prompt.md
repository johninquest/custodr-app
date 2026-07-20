---
name: check-contract-drift
description: "Verify the implementation matches the contracts. Diffs handlers, services, repositories, models, and migrations against docs/api_spec.md and docs/schema.md, then reports mismatches with file:line references."
---

# Check Contract Drift

Verify that the current implementation matches the contracts in `docs/api_spec.md` and `docs/schema.md`. Report any drift.

## Instructions

You are a contract compliance auditor. Your job is to find every place where the implementation diverges from the contracts, and report each mismatch with a `file:line` reference so it can be fixed.

### Step 1: Load the Contracts

Read both contract files in full:

- `docs/api_spec.md` — endpoints, HTTP methods, request/response schemas, status codes, error formats, pagination conventions.
- `docs/schema.md` — SQLite tables, column names and types, constraints, indexes, relationships.

### Step 2: Audit Against `docs/api_spec.md`

For each endpoint declared in the spec, find its handler and verify:

- **Route + method** match the spec exactly (path parameters, query parameters).
- **Request body** fields match the spec: names, types, required/optional, validation rules.
- **Response body** fields match the spec: names, types, nullability.
- **Status codes** match the spec for each outcome (success, validation error, not found, unauthorized, conflict).
- **Error response shape** matches the spec's standard error envelope.
- **Pagination** fields (`page`, `limit`, `total`, `total_pages`) match the spec's convention where applicable.

Flag any endpoint in the spec that has no handler, and any handler route that has no spec entry.

### Step 3: Audit Against `docs/schema.md`

For each table in the spec, find the migration that creates it and verify:

- **Table name** matches.
- **Column names and order** match.
- **Column types** match (note: SQLite stores UUIDs as TEXT, money as INTEGER cents, timestamps as TEXT ISO 8601, enums as TEXT with CHECK).
- **Constraints** match: NOT NULL, UNIQUE, CHECK, DEFAULT, PRIMARY KEY, FOREIGN KEY.
- **Indexes** match: name, columns, uniqueness, partial WHERE clauses.

Flag any table in the spec with no migration, and any migration creating a table not in the spec.

### Step 4: Cross-Check Models

Verify Go model structs and TypeScript API types reference the same field names and types as the contracts. Flag mismatches in:

- `internal/*/models/*.go` vs `docs/schema.md` columns.
- `api/**/*.ts` / `api/**/*.tsx` request/response types vs `docs/api_spec.md` schemas.

### Step 5: Report

Produce a drift report in this format:

```
## Contract Drift Report

### api_spec.md drift
- [file:line] <endpoint> <field>: expected <spec value>, found <impl value>
- [file:line] <endpoint>: declared in spec but no handler found
- [file:line] <route>: handler exists but not declared in spec

### schema.md drift
- [file:line] <table>.<column>: expected <spec type>, found <impl type>
- [file:line] <table>: declared in spec but no migration found
- [file:line] <table>: migration creates table not in spec

### Model drift
- [file:line] <struct>.<field>: expected <contract type>, found <code type>

### Summary
- <N> api_spec.md mismatches
- <N> schema.md mismatches
- <N> model mismatches
```

If there is no drift, say so explicitly: "✅ No contract drift detected."

Do not fix the drift — only report it. Fixes happen in a separate step so they can be reviewed.
