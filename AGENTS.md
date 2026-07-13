# AGENTS.md — Digital Renewal & Commitment Management Platform

## Project Overview

A personal digital assistant for managing recurring commitments and renewal obligations (insurance, subscriptions, utilities, telecom, memberships, etc.). Core value: *"Know what renews, what expires, what needs action, and when."*

Target: German/EU consumers. MVP phase — validating whether users will enter and maintain structured commitment data.

## Key Documents

- [Business Requirements Document](BRD-RenewalApp.txt) — MVP scope, functional/non-functional requirements, success criteria, business risks
- [Tech Stack Considerations](tech_stack_considerations_digital_renewal_platform.md) — Architecture decisions, trade-offs, Go vs NestJS analysis, deployment model

## Technology Stack

| Layer | Choice | Status |
|-------|--------|--------|
| Frontend | React + TypeScript + Tailwind CSS | Decided |
| UI Components | shadcn/ui (optional accelerator) | Decided |
| Backend | Go (Echo/Gin/Chi) **or** NestJS + TypeScript | **Still open** |
| Database | PostgreSQL | Decided |
| Authentication | Firebase Auth (behind internal interface) | Leaning |
| Email | Mailjet / Postmark | Leaning |
| Hosting | Hetzner VPS (EU-based) | Decided |
| Deployment | Docker Compose + Traefik | Decided |
| Architecture | Modular monolith | Decided |

## Architecture Conventions

### Modular Monolith — Domain-Based Organization

Group by **business capability**, NOT by technical layer:

```
internal/
├── auth/           (handler, service, repository, models)
├── users/          (handler, service, repository, models)
├── commitments/    (handler, service, repository, models, validator)
├── reminders/      (handler, service, scheduler, repository, models)
├── notifications/  (handler, service, provider, mailjet, models)
├── jobs/           (worker)
└── shared/         (config, database, logger, middleware, errors)
```

**Avoid** flat technical folders like `handlers/`, `services/`, `repositories/` at the top level.

### Request Flow

`HTTP Request → Handler → Service → Repository → PostgreSQL`

### Key Abstractions

- **AuthProvider** — abstract external auth (Firebase) behind internal interface for future migration
- **EmailProvider / NotificationSender** — abstract email delivery
- **TokenVerifier** — decouple business logic from auth provider
- **Internal user mapping** — map external auth identities to internal users (`external_auth_provider`, `external_subject_id`)

### Generic Commitment Model

Use **one flexible model** for all commitment categories (insurance, subscriptions, utilities, etc.). Do NOT create separate tables per commitment type.

A commitment is any recurring obligation with a cost, date, renewal cycle, expiry date, or action deadline.

### Commitment Statuses

`Active` | `Cancelled` | `Expired` | `Paused` | `Review Needed`

### Reminder Windows

90, 60, 30, 14, 7, and 1 days before deadline (configurable later, defaults for MVP).

## Deployment Model

```
Docker Compose Stack
├── traefik     (reverse proxy, TLS termination)
├── frontend    (React static build)
├── api         (backend API)
├── worker      (background jobs / reminder scheduler — same codebase, different role)
└── postgres    (database)
```

Routing: `app.example.com` (frontend), `api.example.com` (API).

## MVP Scope Boundaries

**In scope:** User auth, commitment CRUD, categorization, renewal/cancellation dates, email reminders, dashboard with upcoming deadlines and cost overview.

**Out of scope:** Document upload, PDF/OCR, AI automation, bank aggregation, BiPRO/FiDA/Open Banking integration, native mobile apps, marketplace/switching, broker portals.

## Critical Constraints

1. **GDPR by design** — data minimization, EU-based infrastructure, DPAs with processors, user data deletion capability
2. **No overengineering** — no microservices, CQRS, event sourcing, or Kubernetes during MVP
3. **No document storage** — structured data only for MVP
4. **Email deliverability is business-critical** — reminders must be delivered reliably; self-hosted email is ruled out
5. **PostgreSQL backups from day one** — daily dumps, encrypted storage, restore testing
6. **REST + JSON API** with OpenAPI documentation from early on

## Agentic Engineering Workflow

This project includes a comprehensive agentic engineering setup to help AI coding agents be productive from day one. The setup includes contract files, custom agents, prompt workflows, skills, hooks, and file-specific instructions.

### Contract Files (Foundation)

Before writing any code, consult these contract documents:

- **[api_spec.md](api_spec.md)** — Complete API contract with endpoints, request/response schemas, validation rules, error formats, and pagination conventions
- **[schema.md](schema.md)** — Database schema blueprint with tables, relationships, constraints, indexes, and migration strategy

**Why this matters:** Agents cross-reference these contracts to eliminate structural mismatches between frontend and backend, reducing integration bugs by up to 90%.

### Custom Agents

Specialized agent personas for different responsibilities:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **architect** | Architecture and system design reviewer | Reviewing code structure, module organization, abstraction layers, or architectural decisions |
| **tester** | Test generation specialist | Creating unit tests, integration tests, or improving test coverage for Go backend or React frontend |
| **reviewer** | Code quality and best practices reviewer | Reviewing Go or TypeScript code for idioms, security, performance, and maintainability |
| **frontend** | React and TypeScript frontend specialist | Building React components, implementing UI features, styling with Tailwind CSS, or integrating with backend API |
| **backend** | Go and Echo backend specialist | Implementing API endpoints, database operations, background jobs, or middleware |

**Usage:** Select the appropriate agent from the agent picker in VS Code, or let Copilot automatically delegate to the right agent based on your task description.

### Prompt Workflows (Slash Commands)

Reusable workflows for common tasks:

| Command | Purpose | Example |
|---------|---------|---------|
| `/plan-feature` | Generate comprehensive implementation plan | `/plan-feature Add commitment categorization with filtering` |
| `/review-pr` | Perform comprehensive code review | `/review-pr PR #42` or `/review-pr current changes` |
| `/generate-tests` | Generate test suites with high coverage | `/generate-tests CommitmentService` or `/generate-tests CommitmentCard component` |
| `/create-endpoint` | Scaffold complete API endpoint | `/create-endpoint POST /api/v1/commitments` |
| `/create-component` | Scaffold React component with tests | `/create-component CommitmentCard - displays commitment summary with edit/delete actions` |

**Usage:** Type `/` in the chat input to see available prompts, then select and provide the required input.

### Skills

Multi-step workflows with bundled assets:

#### Custom Skills (Project-Specific)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| **scaffold-domain-module** | Generate complete domain module | Creating a new business domain (e.g., commitments, reminders) with handler, service, repository, models, tests, and migration |
| **api-endpoint-generator** | Generate API endpoint from spec | Implementing a new endpoint that must comply with api_spec.md contract |
| **contract-validator** | Validate code against contracts | Checking if implementation matches api_spec.md and schema.md contracts |

#### Community Skills (from awesome-copilot)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| **security-review** | AI-powered security scanner | Scanning code for SQL injection, XSS, command injection, exposed API keys, hardcoded secrets, insecure dependencies, access control issues |
| **postgresql-code-review** | PostgreSQL-specific code review | Reviewing JSONB operations, array usage, custom types, schema design, function optimization, Row Level Security (RLS) |
| **webapp-testing** | Playwright-based browser testing | Testing frontend functionality, debugging UI behavior, capturing browser screenshots, viewing browser logs |
| **create-specification** | Structured specification writing | Creating AI-ready specifications with requirements, constraints, interfaces, and acceptance criteria |
| **quality-playbook** | Comprehensive quality audit | Running multi-phase quality audit with requirements derivation, functional tests, code review, spec audit, and TDD verification |

**Usage:** Type `/` in the chat input to see available skills, or mention the skill name in your request (e.g., "Run a security review on the authentication module").

### Hooks (Automated Validation)

Deterministic checks that run at agent lifecycle points:

| Hook | When | What It Does |
|------|------|--------------|
| **pre-tool-use** | Before writing code | Validates Go code (SQL injection, error wrapping, Firebase abstraction), TypeScript code (no `any` types, no inline styles), SQL code (safe migrations, indexes, TIMESTAMPTZ) |
| **post-tool-use** | After writing code | Runs formatters (gofmt, goimports, Prettier, ESLint, sql-formatter) to maintain code quality |
| **stop** | Before completing task | Runs final validation (Go compilation, tests, TypeScript compilation, contract compliance, uncommitted changes, TODO/FIXME comments) |

**Why this matters:** Hooks enforce project conventions automatically, catching issues before they're committed and maintaining consistent code quality.

### File-Specific Instructions

Auto-attached guidelines for different file types:

| Instruction File | Applies To | Key Guidelines |
|-----------------|------------|----------------|
| **go-backend.instructions.md** | `**/*.go` | Echo framework patterns, domain-driven architecture, error handling, structured logging, dependency injection |
| **react-frontend.instructions.md** | `**/*.tsx, **/*.ts` | TypeScript strict mode, React hooks, Tailwind CSS, form handling, API integration, accessibility |
| **database.instructions.md** | `**/migrations/**/*.sql, **/repositories/**/*.go` | Migration rules, parameterized queries, soft deletes, transactions, indexes, GDPR compliance |
| **testing.instructions.md** | `**/*_test.go, **/*.test.ts, **/*.test.tsx` | Table-driven tests, coverage targets, mocking patterns, test organization, common pitfalls |
| **api-contracts.instructions.md** | `**/handlers/**/*.go, **/services/**/*.go, **/repositories/**/*.go` | Cross-reference api_spec.md and schema.md, validation checklist, contract updates |

**Why this matters:** Instructions auto-attach based on file patterns, ensuring agents follow project conventions without manual context management.

### Example Workflows

#### Workflow 1: Implementing a New Feature

1. **Plan the feature:**
   ```
   /plan-feature Add commitment search with filters for category, status, and date range
   ```
   Review the generated plan, adjust if needed, and confirm the approach.

2. **Create the backend endpoint:**
   ```
   /create-endpoint GET /api/v1/commitments/search
   ```
   The agent will generate handler, service, repository, models, and tests, ensuring compliance with api_spec.md.

3. **Create the frontend component:**
   ```
   /create-component CommitmentSearchForm - search form with category, status, and date range filters
   ```
   The agent will generate the component with TypeScript, Tailwind CSS, tests, and Storybook stories.

4. **Generate additional tests:**
   ```
   /generate-tests CommitmentSearchService
   ```
   The agent will create comprehensive tests with >80% coverage.

5. **Review the implementation:**
   ```
   /review-pr current changes
   ```
   The agent will check code quality, security, performance, and adherence to conventions.

6. **Run security review:**
   ```
   /security-review
   ```
   The agent will scan for vulnerabilities and propose patches.

#### Workflow 2: Creating a New Domain Module

1. **Scaffold the module:**
   ```
   /scaffold-domain-module reminders
   ```
   The agent will generate the complete module structure with handler, service, repository, models, tests, and migration.

2. **Validate against contracts:**
   ```
   /contract-validator
   ```
   The agent will check if the implementation matches api_spec.md and schema.md.

3. **Run quality playbook:**
   ```
   /quality-playbook
   ```
   The agent will run a comprehensive quality audit with requirements derivation, functional tests, code review, and spec audit.

#### Workflow 3: Debugging and Testing

1. **Test the frontend:**
   ```
   /webapp-testing
   ```
   The agent will use Playwright to test frontend functionality in a real browser.

2. **Review PostgreSQL code:**
   ```
   /postgresql-code-review
   ```
   The agent will check for PostgreSQL-specific anti-patterns and optimization opportunities.

3. **Generate missing tests:**
   ```
   /generate-tests CommitmentRepository
   ```
   The agent will create tests to improve coverage.

### Best Practices

1. **Start with contracts:** Always consult api_spec.md and schema.md before implementing features
2. **Use the right agent:** Let Copilot delegate to specialized agents, or explicitly select one for focused tasks
3. **Leverage prompt workflows:** Use slash commands for common tasks instead of writing detailed prompts
4. **Trust the hooks:** Hooks will catch common mistakes automatically — don't disable them
5. **Run reviews regularly:** Use `/review-pr` and `/security-review` before committing code
6. **Validate contracts:** Use `/contract-validator` after significant changes to ensure compliance
7. **Generate tests early:** Use `/generate-tests` immediately after implementing features
8. **Plan before coding:** Use `/plan-feature` to think through implementation before writing code

### Updating Contracts

When requirements change:

1. **Update api_spec.md first** — Define the new endpoint or modify existing specification
2. **Update schema.md** — Add tables, columns, or constraints as needed
3. **Implement the changes** — Use agents and prompts to generate code that matches the updated contracts
4. **Validate compliance** — Run `/contract-validator` to ensure implementation matches contracts
5. **Update tests** — Run `/generate-tests` to update test coverage

**Why this order:** Updating contracts first ensures agents generate code that matches the new requirements, preventing drift between specification and implementation.

### Troubleshooting

**Agent not following conventions?**
- Check if the appropriate instruction file exists and has correct `applyTo` patterns
- Verify the agent description matches your task
- Try explicitly selecting the agent instead of relying on auto-delegation

**Hooks blocking valid code?**
- Review the hook script in `.github/hooks/` to understand the validation logic
- Temporarily disable the hook by renaming the JSON file (e.g., `pre-tool-use.json.disabled`)
- Update the hook script to allow your valid pattern

**Tests not generating correctly?**
- Ensure the target code is well-structured and follows project conventions
- Provide more specific input to `/generate-tests` (e.g., include function signatures)
- Check if the testing.instructions.md file has appropriate patterns for your use case

**Contract validation failing?**
- Review api_spec.md and schema.md to ensure they're up to date
- Check if the implementation intentionally deviates from the contract (update contract if needed)
- Use `/contract-validator` with specific file paths to focus validation

## Build & Run Commands

> *No code exists yet. Update this section once the project is scaffolded.*

## Pitfalls to Avoid

- **Go project structure risk**: Without discipline, Go codebases become messy. Enforce domain-based module structure from the start.
- **Firebase Auth lock-in**: Always abstract behind internal interface. GDPR concerns may require migration later.
- **User input friction**: Commitment entry forms must be fast (< 1 minute per commitment). This is the biggest MVP business risk.
- **Premature connector frameworks**: Do not build integration abstractions for BiPRO/Open Banking/etc. during MVP.
