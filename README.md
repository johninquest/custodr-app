# Commitment Manager

A personal digital assistant for managing recurring commitments and renewal obligations — insurance, subscriptions, utilities, telecom, memberships, and more.

> *"Know what renews, what expires, what needs action, and when."*

## Overview

Commitment Manager helps German/EU consumers centrally manage all their recurring obligations in one place. Track renewal dates, cancellation deadlines, billing cycles, and costs across every category — from Netflix to electricity contracts to gym memberships.

**Status:** MVP phase — validating whether users will enter and maintain structured commitment data.

## Technology Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | Go + Echo |
| Database | PostgreSQL |
| Authentication | Firebase Auth (behind internal interface) |
| Email | Mailjet / Postmark |
| Hosting | Hetzner VPS (EU-based) |
| Deployment | Docker Compose + Traefik |
| Architecture | Modular monolith (domain-based) |

## Key Documents

| Document | Purpose |
|----------|---------|
| [BRD-RenewalApp.txt](BRD-RenewalApp.txt) | Business Requirements Document — MVP scope, functional/non-functional requirements, success criteria |
| [tech_stack_considerations_digital_renewal_platform.md](tech_stack_considerations_digital_renewal_platform.md) | Architecture decisions, trade-offs, Go vs NestJS analysis |
| [api_spec.md](api_spec.md) | API contract — endpoints, request/response schemas, validation rules, error formats |
| [schema.md](schema.md) | Database schema — tables, relationships, constraints, indexes, migration strategy |
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
commit-mgr/
├── AGENTS.md                    # AI agent instructions
├── api_spec.md                  # API contract
├── schema.md                    # Database schema
├── docs/
│   └── AGENTIC_ENGINEERING.md   # Agentic engineering guide
├── .github/
│   ├── agents/                  # 5 custom agent definitions
│   ├── instructions/            # 5 file-specific instruction files
│   ├── prompts/                 # 5 prompt workflows
│   ├── skills/                  # 5 community skills
│   └── hooks/                   # 3 validation hooks
├── internal/                    # Go backend (domain-based modules)
│   ├── auth/
│   ├── users/
│   ├── commitments/
│   ├── reminders/
│   ├── notifications/
│   └── shared/
└── frontend/                    # React frontend
    └── src/
```

## MVP Scope

**In scope:** User auth, commitment CRUD, categorization, renewal/cancellation dates, email reminders, dashboard with upcoming deadlines and cost overview.

**Out of scope:** Document upload, PDF/OCR, AI automation, bank aggregation, BiPRO/FiDA/Open Banking integration, native mobile apps, marketplace/switching, broker portals.

## License

TBD
