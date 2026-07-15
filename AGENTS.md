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
| Backend | Go (Echo) | Decided |
| Database | SQLite (SQLCipher for encryption at rest) | Decided |
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

`HTTP Request → Handler → Service → Repository → SQLite`

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
├── api         (backend API + SQLite database file on a mounted volume)
└── worker      (background jobs / reminder scheduler — same codebase, different role)
```

Routing: `app.example.com` (frontend), `api.example.com` (API).

SQLite is a file on disk, not a separate service. The database file lives on a mounted Docker volume and is shared between `api` and `worker` (SQLite supports concurrent readers + a single writer, which fits MVP load).

## MVP Scope Boundaries

**In scope:** User auth, commitment CRUD, categorization, renewal/cancellation dates, email reminders, dashboard with upcoming deadlines and cost overview.

**Out of scope:** Document upload, PDF/OCR, AI automation, bank aggregation, BiPRO/FiDA/Open Banking integration, native mobile apps, marketplace/switching, broker portals.

## Critical Constraints

1. **GDPR by design** — data minimization, EU-based infrastructure, DPAs with processors, user data deletion capability
2. **No overengineering** — no microservices, CQRS, event sourcing, or Kubernetes during MVP
3. **No document storage** — structured data only for MVP
4. **Email deliverability is business-critical** — reminders must be delivered reliably; self-hosted email is ruled out
5. **SQLite backups from day one** — daily encrypted copies of the database file (SQLCipher already encrypts at rest), stored off-host, with periodic restore testing
6. **REST + JSON API** with OpenAPI documentation from early on

## Agentic Engineering Workflow

This project uses a lightweight agentic engineering setup: a fixed process loop, two contracts as the spine, a small set of agents and prompts, and a single `stop` hook that keeps the agent honest. The full always-on process rules live in [`.github/copilot-instructions.md`](.github/copilot-instructions.md); this document is the human-readable reference.

### Contracts (the spine)

Before writing any code, consult these contract documents:

- **[api_spec.md](api_spec.md)** — Complete API contract: endpoints, request/response schemas, validation rules, error formats, pagination conventions
- **[schema.md](schema.md)** — SQLite database schema: tables, columns, constraints, indexes, relationships

Contracts are the source of truth. Never invent endpoint or table shapes in code. If the contract is wrong or missing, **update the contract first**, then implement. Cross-referencing both contracts eliminates structural mismatches between frontend and backend.

### The Fixed Process

Every feature follows the same three-step loop:

1. **Plan** — `/plan-feature`, with `#api_spec.md` and `#schema.md` attached. If the feature touches the contract, update the contract *first* and review the file-by-file plan before any code is written. This gate is the one people skip when rushed — don't.
2. **Execute** — Run backend and frontend in **separate sessions**, each invoking its own agent (`backend` or `frontend`), each with the plan + relevant contracts attached. Don't let one session sprawl across both stacks.
3. **Verify** — `/generate-tests`, `/review-pr`, `/check-contract-drift`, plus the `stop` hook enforcing build + test + lint. Nothing is "done" until this passes.

### Custom Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **architect** | Architecture and system design reviewer (read-only) | Reviewing code structure, module organization, abstraction layers, or architectural decisions |
| **backend** | Go and Echo backend specialist | Implementing API endpoints, database operations, background jobs, or middleware |
| **frontend** | React and TypeScript frontend specialist | Building React components, implementing UI features, styling with Tailwind CSS, or integrating with backend API |
| **tester** | Test generation specialist | Creating unit tests, integration tests, or improving test coverage for Go backend or React frontend |
| **reviewer** | Code quality and best practices reviewer (read-only) | Reviewing Go or TypeScript code for idioms, security, performance, and maintainability |

Select the appropriate agent from the agent picker in VS Code, or let Copilot delegate based on the task description.

### Prompt Workflows (Slash Commands)

| Command | Purpose |
|---------|---------|
| `/plan-feature` | Generate a comprehensive implementation plan (Step 1 of the loop) |
| `/create-endpoint` | Scaffold a complete API endpoint compliant with `api_spec.md` |
| `/create-component` | Scaffold a React component with tests |
| `/generate-tests` | Generate test suites with high coverage (Step 3 of the loop) |
| `/review-pr` | Perform a comprehensive code review (Step 3 of the loop) |
| `/check-contract-drift` | Verify implementation matches `api_spec.md` and `schema.md` (Step 3 of the loop) |

### Skills

Skills are on-demand multi-step workflows. Only two are part of the per-feature loop; the rest are ad-hoc.

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| **webapp-testing** | Playwright-based browser testing | Verifying frontend functionality, debugging UI behavior, capturing screenshots |
| **security-review** | AI-powered security scanner | Scanning for injection flaws, auth/access control bugs, secrets exposure, insecure dependencies |
| **quality-playbook** | Comprehensive quality audit | Quarterly or pre-release, not per-feature — heavy multi-phase audit with requirements derivation and spec audit |
| **create-specification** | Structured specification writing | Ad-hoc, when creating a new AI-ready spec |

> **Note:** The `postgresql-code-review` skill exists in the repo but is **not advertised** — the database is SQLite, not PostgreSQL. It can be invoked directly if ever relevant.

### Hooks (Automated Validation)

Two hooks, kept deliberately light. The `pre-tool-use` deny-lists from earlier setups were dropped — they were brittle (regex-based SQL-injection checks, `any`-type bans) and duplicated what linters do better. Add narrow hooks reactively only when a specific recurring mistake appears.

| Hook | When | What It Does |
|------|------|--------------|
| **post-tool-use** | After writing code | Runs formatters (gofmt, goimports, Prettier, ESLint) — free, zero-risk |
| **stop** | Before completing a task | Build + test + lint gate: Go build, Go test, golangci-lint, tsc, frontend tests, ESLint. Degrades gracefully (skips with a warning) if a tool isn't installed |

### File-Specific Instructions

Auto-attached guidelines for different file types:

| Instruction File | Applies To | Key Guidelines |
|-----------------|------------|----------------|
| **go-backend.instructions.md** | `**/*.go, **/go.mod, **/go.sum` | Echo patterns, domain-driven architecture, error handling, structured logging, dependency injection, SQLite migrations |
| **react-frontend.instructions.md** | `**/*.tsx, **/*.ts, **/*.jsx, **/*.js` | TypeScript strict mode, React hooks, Tailwind CSS, form handling, API integration, accessibility |
| **testing.instructions.md** | `**/*_test.go, **/*.test.ts, **/*.test.tsx, **/*.spec.ts, **/*.spec.tsx` | Table-driven tests, coverage targets, mocking patterns, test organization |
| **api-contracts.instructions.md** | `**/handlers/**/*.go, **/services/**/*.go, **/repositories/**/*.go, **/models/**/*.go, **/api/**/*.ts, **/api/**/*.tsx` | Cross-reference `api_spec.md` and `schema.md` before writing handlers/services/repos/models |

### Updating Contracts

When requirements change:

1. **Update `api_spec.md` first** — define the new endpoint or modify the existing specification
2. **Update `schema.md`** — add tables, columns, or constraints as needed
3. **Implement the changes** — use agents and prompts to generate code that matches the updated contracts
4. **Verify** — run `/check-contract-drift` to confirm implementation matches contracts, then `/generate-tests` to update coverage

Updating contracts first ensures agents generate code that matches the new requirements, preventing drift between specification and implementation.

### Troubleshooting

**Agent not following conventions?**
- Check that the appropriate instruction file exists and has correct `applyTo` patterns
- Verify the agent description matches your task
- Try explicitly selecting the agent instead of relying on auto-delegation

**Hook blocking valid code?**
- Review the hook script in `.github/hooks/` to understand the validation logic
- Narrow the hook to allow your valid pattern — don't disable it wholesale
- If a `stop` check is genuinely wrong, fix the check rather than removing the gate

**Tests not generating correctly?**
- Ensure the target code is well-structured and follows project conventions
- Provide more specific input to `/generate-tests` (e.g., include function signatures)
- Check that `testing.instructions.md` has appropriate patterns for your use case

**Contract validation failing?**
- Review `api_spec.md` and `schema.md` to ensure they're up to date
- Check if the implementation intentionally deviates from the contract (update the contract if so)
- Run `/check-contract-drift` with specific file paths to focus validation

## Build & Run Commands

> *No code exists yet. Update this section once the project is scaffolded.*

## Pitfalls to Avoid

- **Go project structure risk**: Without discipline, Go codebases become messy. Enforce domain-based module structure from the start.
- **Firebase Auth lock-in**: Always abstract behind internal interface. GDPR concerns may require migration later.
- **User input friction**: Commitment entry forms must be fast (< 1 minute per commitment). This is the biggest MVP business risk.
- **Premature connector frameworks**: Do not build integration abstractions for BiPRO/Open Banking/etc. during MVP.
