# Commitment Manager — Agent Process Rules

These rules are always on. They describe the fixed loop every feature follows. For the full rationale and architecture, see [AGENTS.md](AGENTS.md).

## The Fixed Loop

1. **Plan** — Use `/plan-feature`. Attach `#docs/api_spec.md` and `#docs/schema.md`. If the feature touches the contract, **update the contract first** and review the file-by-file plan before any code is written. This gate is the one people skip when rushed — don't.
2. **Execute** — Run backend and frontend in **separate sessions**, each invoking its own agent (`backend` or `frontend`), each with the plan + relevant contracts attached. Do not let one session sprawl across both stacks.
3. **Verify** — Run `/generate-tests`, `/review-pr`, and `/check-contract-drift`. The `stop` hook enforces build + test + lint. Nothing is "done" until this passes.

## Contracts Are the Spine

- `api_spec.md` is the source of truth for endpoints, request/response shapes, status codes, and error formats.
- `schema.md` is the source of truth for SQLite tables, columns, constraints, and indexes.
- Never invent endpoint or table shapes in code. If the contract is wrong or missing, **update the contract first**, then implement.
- Cross-reference both contracts before writing any handler, service, repository, or model.

## Stack

- **Backend**: Go + Echo, modular monolith, domain-based packages under `internal/`.
- **Frontend**: React + TypeScript + Tailwind CSS.
- **Database**: SQLite (SQLCipher for encryption at rest). See `go-backend.instructions.md` for SQLite-specific rules (PRAGMA foreign_keys, TEXT UUIDs, integer cents, TEXT timestamps).

## When in Doubt

- Prefer deleting code over adding it.
- Prefer a narrow fix over a refactor.
- If a hook blocks valid code, narrow the hook — don't disable it wholesale.
