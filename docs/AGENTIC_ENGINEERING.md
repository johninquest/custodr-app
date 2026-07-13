# Agentic Engineering Guide

This project uses a comprehensive agentic engineering setup built on GitHub Copilot's customization framework. This guide explains how to use the custom agents, prompt workflows, skills, hooks, and file-specific instructions that are already configured.

> **Prerequisites:** GitHub Copilot Chat extension in VS Code with agent mode enabled.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Contracts: api_spec.md and schema.md](#contracts)
- [Custom Agents](#custom-agents)
- [Prompt Workflows (Slash Commands)](#prompt-workflows)
- [Skills](#skills)
- [Hooks (Automatic Validation)](#hooks)
- [File-Specific Instructions](#file-specific-instructions)
- [Example Workflows](#example-workflows)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

The fastest way to get productive:

1. **Plan a feature:** Type `/plan-feature` in Copilot Chat and describe what you want to build
2. **Create an endpoint:** Type `/create-endpoint` and specify the route (e.g., `POST /api/v1/commitments`)
3. **Create a component:** Type `/create-component` and describe the UI element
4. **Generate tests:** Type `/generate-tests` and name the module or component
5. **Review your work:** Type `/review-pr` to get a comprehensive code review

All slash commands appear when you type `/` in the Copilot Chat input.

---

## Contracts

Two contract documents serve as the single source of truth for the entire project:

### api_spec.md

Located at the project root. Defines:

- All REST API endpoints with HTTP methods and paths
- Request body schemas with validation rules
- Response body schemas with exact field types
- Standard error response format
- Pagination conventions
- HTTP status code usage
- Rate limiting and CORS policies

**When to use it:** Before implementing any API endpoint, read the relevant section of `api_spec.md` to understand the expected request/response format. When adding new endpoints, update `api_spec.md` first, then implement.

### schema.md

Located at the project root. Defines:

- All PostgreSQL tables with columns, types, and constraints
- Enum types (commitment_status, billing_frequency, etc.)
- Indexes and their rationale
- Soft delete strategy (deleted_at timestamp)
- Audit timestamp triggers (created_at, updated_at)
- Migration strategy and naming conventions
- Backup and GDPR compliance procedures

**When to use it:** Before writing any database query or migration, read the relevant section of `schema.md`. When adding tables or columns, update `schema.md` first, then create the migration.

### How agents use contracts

The `api-contracts.instructions.md` file auto-attaches to handler, service, and repository files. It instructs agents to cross-reference `api_spec.md` and `schema.md` before implementing code, ensuring the implementation matches the contract.

---

## Custom Agents

Five specialized agents are available in the agent picker (dropdown in Copilot Chat) or are auto-delegated by Copilot based on your task description.

### architect

| | |
|---|---|
| **Purpose** | Reviews code structure, module organization, and architectural decisions |
| **Tools** | Read-only (read, search) — does not modify code |
| **Model** | Heavy reasoning model for deep analysis |

**When to use:**
- After implementing a feature, to verify it follows the modular monolith pattern
- When refactoring code, to ensure domain-based organization is maintained
- When reviewing PRs that touch multiple modules or change abstractions

**What it checks:**
- Domain-based module structure (not flat technical folders like `handlers/`, `services/`)
- Proper abstraction layers (AuthProvider, EmailProvider interfaces)
- Handler → Service → Repository request flow
- No circular dependencies between modules
- No MVP scope violations (document upload, AI automation, etc.)

**How to invoke:**
- Select "architect" from the agent picker in Copilot Chat
- Or describe an architecture review task and Copilot will auto-delegate

### tester

| | |
|---|---|
| **Purpose** | Generates comprehensive test suites with mocks and edge cases |
| **Tools** | Read, write, search, execute |
| **Model** | Fast model for rapid test generation |

**When to use:**
- After implementing a service, repository, or handler
- When test coverage is low for a module
- When adding new features that need test coverage

**What it generates:**
- Table-driven Go tests with testify assertions
- React component tests with React Testing Library
- Mock implementations for external dependencies
- Edge case tests (empty data, boundary values, error conditions)
- Coverage targets: Services >80%, Repositories >90%, Handlers >80%

**How to invoke:**
- Type `/generate-tests` and name the module
- Or select "tester" from the agent picker

### reviewer

| | |
|---|---|
| **Purpose** | Reviews code quality, security, performance, and maintainability |
| **Tools** | Read-only (read, search) — does not modify code |
| **Model** | Balanced model for thorough review |

**When to use:**
- Before committing code or creating a PR
- When you want a second opinion on code quality
- After implementing complex logic

**What it checks:**
- Go idioms (error handling, naming conventions, interface design)
- TypeScript strictness (no `any`, explicit return types)
- Security issues (SQL injection, XSS, auth checks, secrets)
- Performance problems (N+1 queries, missing indexes, unnecessary allocations)
- Code clarity (function length, complexity, duplication)

**How to invoke:**
- Type `/review-pr` for a comprehensive review
- Or select "reviewer" from the agent picker

### frontend

| | |
|---|---|
| **Purpose** | Builds React components with TypeScript, Tailwind CSS, and accessibility |
| **Tools** | Read, write, search, execute |
| **Model** | Fast model for rapid UI development |

**When to use:**
- Building new React components or pages
- Implementing forms with react-hook-form + zod validation
- Styling with Tailwind CSS
- Integrating frontend with backend API

**What it generates:**
- Functional components with TypeScript prop interfaces
- Tailwind CSS styling (utility-first, responsive, accessible)
- Custom hooks for data fetching and state management
- Component tests with React Testing Library
- Storybook stories (optional)

**How to invoke:**
- Type `/create-component` and describe the component
- Or select "frontend" from the agent picker

### backend

| | |
|---|---|
| **Purpose** | Implements Go/Echo API endpoints, database operations, and background jobs |
| **Tools** | Read, write, search, execute |
| **Model** | Balanced model for backend logic |

**When to use:**
- Implementing new API endpoints
- Writing database queries and migrations
- Building background job processors
- Setting up middleware (auth, logging, CORS)

**What it generates:**
- Echo handlers with request binding and validation
- Service layer with business logic and dependency injection
- Repository layer with sqlx and parameterized queries
- Database migrations with golang-migrate
- Handler, service, and repository tests

**How to invoke:**
- Type `/create-endpoint` and specify the route
- Or select "backend" from the agent picker

---

## Prompt Workflows

Five slash commands are available for common tasks. Type `/` in Copilot Chat to see them.

### /plan-feature

Generates a comprehensive implementation plan before writing code.

**Input:** Feature description (e.g., "Add commitment search with filters for category, status, and date range")

**Output:**
- Requirements breakdown (functional and non-functional)
- Affected modules (backend, frontend, database)
- API endpoints needed (with reference to api_spec.md)
- Database changes (with reference to schema.md)
- Step-by-step implementation guide
- Risk assessment and effort estimate

**When to use:** Before starting any feature that touches multiple layers or modules.

### /review-pr

Performs a comprehensive code review.

**Input:** PR number or "current changes"

**Output:**
- Categorized feedback (critical, important, suggestions)
- Code quality metrics (1-5 scale)
- Security and performance findings
- Specific file locations and fix suggestions
- Approve/request changes recommendation

**When to use:** Before committing code, after implementing a feature, or when reviewing a colleague's PR.

### /generate-tests

Generates comprehensive test suites for a module or component.

**Input:** Module or component name (e.g., "CommitmentService" or "CommitmentCard")

**Output:**
- Test files with table-driven tests (Go) or describe blocks (React)
- Mock implementations for dependencies
- Coverage report
- Instructions for running tests

**When to use:** Immediately after implementing a feature, or when test coverage is low.

### /create-endpoint

Scaffolds a complete API endpoint with all layers.

**Input:** Endpoint specification (e.g., "POST /api/v1/commitments")

**Output:**
- Models (request/response structs)
- Repository (database operations with sqlx)
- Service (business logic)
- Handler (Echo HTTP handler)
- Tests for all layers
- Migration file (if new table needed)
- Updated api_spec.md entry

**When to use:** When adding a new API endpoint. Always cross-references api_spec.md for contract compliance.

### /create-component

Scaffolds a complete React component with tests.

**Input:** Component name and purpose (e.g., "CommitmentCard - displays commitment summary with edit/delete actions")

**Output:**
- Component with TypeScript props and Tailwind styling
- Component tests with React Testing Library
- Storybook stories (optional)
- Index export

**When to use:** When building new UI components. Generates accessible, responsive components following project conventions.

---

## Skills

Skills are multi-step workflows that appear as slash commands alongside prompts. This project has 5 community skills installed from [github/awesome-copilot](https://github.com/github/awesome-copilot).

### /security-review

AI-powered security scanner that traces data flows and catches vulnerabilities.

**What it does:**
1. Identifies languages and frameworks in the project
2. Audits dependencies for known CVEs
3. Scans for hardcoded secrets and exposed credentials
4. Deep scans for injection flaws, auth issues, crypto weaknesses
5. Traces user input across files to find data flow vulnerabilities
6. Self-verifies findings to reduce false positives
7. Generates a severity-rated report with concrete patches

**When to use:** Before merging a PR, after implementing auth/payment logic, or periodically as a security audit.

**Example:** `/security-review` or `/security-review internal/auth/`

### /postgresql-code-review

PostgreSQL-specific code review for schema design, queries, and functions.

**What it checks:**
- JSONB usage patterns (GIN indexes, containment operators)
- Array operations and indexing
- Custom types and domains (ENUM, CHECK constraints)
- Schema design (TIMESTAMPTZ vs TIMESTAMP, CITEXT)
- Row Level Security (RLS) policies
- Privilege management
- Trigger and function optimization

**When to use:** After writing migrations, when optimizing slow queries, or when reviewing database code.

### /webapp-testing

Playwright-based browser testing for the React frontend.

**What it does:**
- Navigates to pages and verifies content
- Fills forms and submits data
- Captures screenshots for debugging
- Inspects browser console logs
- Tests responsive design across viewports

**When to use:** When you need to verify frontend behavior in a real browser, debug UI issues, or capture screenshots.

**Prerequisites:** Node.js installed, local dev server running.

### /create-specification

Structured specification writing for new features or system components.

**What it generates:**
- Purpose and scope definition
- Requirements with IDs (REQ-001, SEC-001, etc.)
- Interfaces and data contracts
- Acceptance criteria (Given-When-Then format)
- Test automation strategy
- Dependencies and external integrations

**When to use:** When defining requirements for a new feature before implementation begins.

### /quality-playbook

Comprehensive multi-phase quality audit (by Andrew Stellman).

**What it does:**
1. **Explore** — Understands the codebase architecture, risks, and specifications
2. **Generate** — Produces requirements, functional tests, and review protocols
3. **Code Review** — Three-pass review with regression tests
4. **Spec Audit** — Multi-model audit (Council of Three)
5. **Reconciliation** — TDD red-green verification for every bug
6. **Verify** — Self-check benchmarks on all generated artifacts

**When to use:** For a thorough quality audit of the entire codebase or a specific module. Best run one phase at a time.

**Note:** This is the most comprehensive skill. A full run takes significant time. Use `/quality-playbook phase 1` to start with exploration only.

---

## Hooks

Hooks are deterministic checks that run automatically at specific points in the agent lifecycle. You don't need to invoke them — they run in the background.

### pre-tool-use (Before Writing Code)

Runs **before** any file is written or modified. Validates:

| Language | Checks |
|----------|--------|
| **Go** | SQL injection (string concatenation in queries), missing error wrapping, direct Firebase calls (should use AuthProvider), SELECT * usage, missing deleted_at filter |
| **TypeScript** | `any` type usage, inline styles (should use Tailwind), console.log in production code, missing key props in lists, direct DOM manipulation |
| **SQL** | DROP TABLE without IF EXISTS, foreign keys without indexes, TIMESTAMP instead of TIMESTAMPTZ |

**What happens if it fails:** The write operation is blocked. Fix the issue and try again.

### post-tool-use (After Writing Code)

Runs **after** any file is written or modified. Automatically formats:

| Language | Formatter |
|----------|-----------|
| **Go** | `gofmt` + `goimports` |
| **TypeScript/JavaScript** | Prettier + ESLint (auto-fix) |
| **SQL** | sql-formatter |
| **Markdown** | Prettier |

**What happens:** Your code is automatically formatted to match project conventions. No action needed.

### stop (Before Completing Task)

Runs **before** the agent marks a task as complete. Validates:

- Go code compiles (`go build ./...`)
- Go tests pass (`go test ./...`)
- TypeScript compiles (`tsc --noEmit`)
- Frontend tests pass
- API contract compliance (handlers match api_spec.md)
- Database schema compliance (migrations match schema.md)
- No uncommitted changes
- No TODO/FIXME comments in production code

**What happens if it fails:** The agent is notified of the failures and should fix them before completing.

---

## File-Specific Instructions

These instruction files auto-attach when you work with matching file types. You don't need to do anything — they load automatically based on the file you're editing.

| File | Auto-attaches to | Key guidelines |
|------|-----------------|----------------|
| `go-backend.instructions.md` | `**/*.go` | Echo patterns, domain-driven architecture, error wrapping, structured logging, dependency injection |
| `react-frontend.instructions.md` | `**/*.tsx, **/*.ts` | TypeScript strict mode, React hooks, Tailwind CSS, form handling, accessibility |
| `database.instructions.md` | `**/migrations/**/*.sql, **/repositories/**/*.go` | Migration rules, parameterized queries, soft deletes, transactions, indexes |
| `testing.instructions.md` | `**/*_test.go, **/*.test.ts, **/*.test.tsx` | Table-driven tests, coverage targets, mocking patterns, test organization |
| `api-contracts.instructions.md` | `**/handlers/**/*.go, **/services/**/*.go, **/repositories/**/*.go` | Cross-reference api_spec.md and schema.md, validation checklist |

**How it works:** When you open or edit a file matching the `applyTo` pattern, Copilot automatically loads the relevant instructions into its context. This ensures agents follow project conventions without you having to manually attach files.

---

## Example Workflows

### Workflow 1: Adding a New Feature End-to-End

**Scenario:** Add commitment search with filters for category, status, and date range.

```
Step 1: Plan
  /plan-feature Add commitment search with filters for category, status, and date range

Step 2: Backend endpoint
  /create-endpoint GET /api/v1/commitments/search

Step 3: Frontend component
  /create-component CommitmentSearchForm - search form with category, status, and date range filters

Step 4: Generate tests
  /generate-tests CommitmentSearchService

Step 5: Review
  /review-pr current changes

Step 6: Security check
  /security-review
```

### Workflow 2: Creating a New Domain Module

**Scenario:** Add a new "documents" module for future document management.

```
Step 1: Plan
  /plan-feature Add documents module for storing and managing commitment-related documents

Step 2: Review architecture
  Select "architect" agent → "Review the proposed documents module structure"

Step 3: Create specification
  /create-specification Documents module requirements and interfaces

Step 4: Implement (use backend agent for each endpoint)
  /create-endpoint POST /api/v1/documents
  /create-endpoint GET /api/v1/documents
  /create-endpoint DELETE /api/v1/documents/:id

Step 5: Generate tests
  /generate-tests DocumentService
  /generate-tests DocumentRepository

Step 6: Quality audit
  /quality-playbook
```

### Workflow 3: Fixing a Bug

**Scenario:** Users report that cancelled commitments still show in the dashboard.

```
Step 1: Investigate
  Use default agent → "Find why cancelled commitments appear in the dashboard query"

Step 2: Fix
  Use backend agent → "Fix the dashboard query to exclude cancelled and expired commitments"

Step 3: Generate regression test
  /generate-tests DashboardService

Step 4: Verify
  /review-pr current changes
```

---

## Troubleshooting

### Agent not following conventions?

- Check if the appropriate instruction file exists in `.github/instructions/`
- Verify the `applyTo` pattern matches your file type
- Try explicitly selecting the agent from the picker instead of relying on auto-delegation

### Hooks blocking valid code?

- Review the hook script in `.github/hooks/` to understand the validation logic
- Temporarily disable a hook by renaming its JSON file (e.g., `pre-tool-use.json` → `pre-tool-use.json.disabled`)
- Update the hook script to allow your valid pattern

### Slash commands not appearing?

- Ensure prompt files are in `.github/prompts/` with `.prompt.md` extension
- Ensure skill folders are in `.github/skills/` with a `SKILL.md` file
- Reload VS Code window after adding new prompts or skills

### Tests not generating correctly?

- Ensure the target code follows project conventions (well-structured, proper interfaces)
- Provide more specific input to `/generate-tests` (include function signatures)
- Check `testing.instructions.md` for the expected patterns

### Contract validation failing?

- Review `api_spec.md` and `schema.md` to ensure they're up to date
- If the implementation intentionally deviates, update the contract first
- Use `/review-pr` with specific file paths to focus validation
