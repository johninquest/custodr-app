# Custodr

A personal digital assistant for managing recurring commitments and renewal obligations — insurance, subscriptions, utilities, telecom, memberships, and more.

> *"Know what renews, what expires, what needs action, and when."*

## Overview

Custodr helps German/EU consumers centrally manage all their recurring obligations in one place. Track renewal dates, cancellation deadlines, billing cycles, and costs across every category — from Netflix to electricity contracts to gym memberships.

**Status:** MVP phase — validating whether users will enter and maintain structured commitment data.

## Technology Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | Go + Echo |
| Database | SQLite (modernc.org/sqlite, pure Go driver) |
| Authentication | Firebase Auth (behind internal interface) |
| Email | Mailjet / Postmark |
| Hosting | Hetzner VPS (EU-based) |
| Deployment | Docker Compose + Traefik |
| Architecture | Modular monolith (domain-based) |
| Monorepo | Turborepo + npm workspaces |

## Key Documents

| Document | Purpose |
|----------|---------|
| [BRD-RenewalApp.txt](docs/BRD-RenewalApp.txt) | Business Requirements Document — MVP scope, functional/non-functional requirements, success criteria |
| [tech_stack_considerations_digital_renewal_platform.md](docs/tech_stack_considerations_digital_renewal_platform.md) | Architecture decisions, trade-offs, Go vs NestJS analysis |
| [api_spec.md](docs/api_spec.md) | API contract — endpoints, request/response schemas, validation rules, error formats |
| [schema.md](docs/schema.md) | Database schema — tables, relationships, constraints, indexes, migration strategy |
| [AGENTS.md](AGENTS.md) | AI agent instructions — project conventions, architecture rules, and agentic engineering workflow |

## Agentic Engineering

This project includes a comprehensive agentic engineering setup for GitHub Copilot, designed to help both AI agents and human developers be productive from day one.

**What's included:**
- **5 custom agents** — architect, tester, reviewer, frontend specialist, backend specialist
- **5 prompt workflows** — `/plan-feature`, `/review-pr`, `/generate-tests`, `/create-endpoint`, `/create-component`
- **5 community skills** — security review, PostgreSQL review, browser testing, specification writing, quality audit
- **3 automated hooks** — pre-write validation, post-write formatting, pre-completion checks
- **5 file-specific instructions** — auto-attached guidelines for Go, React, database, testing, and API contract files

📖 **Full guide:** [docs/AGENTIC_ENGINEERING.md](docs/AGENTIC_ENGINEERING.md)

### Quick Start

Type `/` in Copilot Chat to see available commands:

```
/plan-feature    → Generate implementation plan
/create-endpoint → Scaffold API endpoint (handler + service + repository + tests)
/create-component→ Scaffold React component (TypeScript + Tailwind + tests)
/generate-tests  → Generate test suite with >80% coverage
/review-pr       → Comprehensive code review (quality, security, performance)
```

## Project Structure

```
custodr-app/
├── apps/
│   ├── api/                     # Go backend (Echo + SQLite)
│   │   ├── cmd/server/          # Entry point
│   │   ├── internal/            # Domain-based modules
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── commitments/
│   │   │   ├── reminders/
│   │   │   ├── notifications/
│   │   │   ├── jobs/
│   │   │   └── shared/          # config, database, logger, middleware, errors
│   │   ├── migrations/          # SQL migration files
│   │   ├── go.mod
│   │   ├── Makefile
│   │   └── Dockerfile
│   └── web/                     # React frontend (Vite + TypeScript)
│       ├── src/
│       │   ├── components/      # UI and layout components
│       │   ├── pages/           # Auth, Dashboard, Profile pages
│       │   ├── hooks/           # Custom React hooks
│       │   ├── services/        # API client
│       │   ├── types/           # TypeScript type definitions
│       │   └── utils/           # Utility functions
│       ├── package.json
│       └── Dockerfile
├── packages/                    # Shared packages (future)
├── docs/
│   ├── AGENTIC_ENGINEERING.md   # Agentic engineering guide
│   ├── api_spec.md              # API contract
│   ├── schema.md                # Database schema
│   ├── BRD-RenewalApp.txt       # Business Requirements Document
│   └── tech_stack_considerations_digital_renewal_platform.md  # Architecture decisions
├── .github/
│   ├── agents/                  # Custom agent definitions
│   ├── instructions/            # File-specific instruction files
│   ├── prompts/                 # Prompt workflows
│   ├── skills/                  # Community skills
│   └── hooks/                   # Validation hooks
├── turbo.json                   # Turborepo pipeline config
├── package.json                 # Root workspace config
├── docker-compose.yml           # Production Docker Compose
├── docker-compose.dev.yml       # Development Docker Compose
└── AGENTS.md                    # AI agent instructions
```

## Getting Started

### Prerequisites

- **Go** 1.21+
- **Node.js** 18+ with npm 9+
- **Docker** and Docker Compose (optional, for containerized development)
- **golang-migrate** (for database migrations)

### Local Development

**1. Install dependencies:**

```bash
# Root (Turborepo)
npm install

# Frontend
cd apps/web && npm install

# Backend
cd apps/api && go mod download
```

**2. Configure environment:**

```bash
# Backend
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your Firebase and Mailjet credentials

# Frontend
cp apps/web/.env.example apps/web/.env
```

**3. Run development servers:**

```bash
# Backend (from apps/api/)
cd apps/api && make run

# Frontend (from apps/web/)
cd apps/web && npm run dev
```

**4. Or use Docker Compose:**

```bash
# Production-like
docker compose up --build

# Development with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all dev servers (via Turborepo) |
| `npm run build` | Build all apps |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all apps |
| `cd apps/api && make run` | Start Go backend |
| `cd apps/api && make test` | Run Go tests |
| `cd apps/api && make migrate-up` | Run database migrations |
| `cd apps/web && npm run dev` | Start React dev server |
| `cd apps/web && npm run build` | Build React production bundle |

## MVP Scope

**In scope:** User auth, commitment CRUD, categorization, renewal/cancellation dates, email reminders, dashboard with upcoming deadlines and cost overview.

**Out of scope:** Document upload, PDF/OCR, AI automation, bank aggregation, BiPRO/FiDA/Open Banking integration, native mobile apps, marketplace/switching, broker portals.

## License

TBD
