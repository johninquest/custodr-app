# Custodr — Agent Process Rules

These rules are always on. They describe the fixed loop every feature follows. For the full rationale and architecture, see [AGENTS.md](AGENTS.md).

## The Fixed Loop

1. **Plan** — Use `/plan-feature`. Attach `#docs/api_spec.md` and `#docs/schema.md`. If the feature touches the contract, **update the contract first** and review the file-by-file plan before any code is written. This gate is the one people skip when rushed — don't.

   **Architecture Gate** — Before planning, check whether the request is an *architectural change*:
   - New domain module under `internal/`
   - New cross-domain dependency (one domain importing another)
   - New external service abstraction (new provider interface)
   - Non-additive schema or contract change (column removal/rename, breaking endpoint change)
   - New top-level directory or package

   If triggered and the request lacks rationale, **stop and demand justification before
   planning**: what problem does this solve, why now, and what alternatives were
   considered? If the rationale is weak, push back with simpler alternatives — prefer
   deleting code over adding it, and a narrow fix over a refactor. Do not plan an
   architectural change without written rationale. Accepted changes must be recorded
   via `/log-architectural-change` (see `docs/architectural-change-logs/`).

2. **Execute** — Run backend and frontend in **separate sessions**, each invoking its own agent (`backend` or `frontend`), each with the plan + relevant contracts attached. Do not let one session sprawl across both stacks.
3. **Verify** — Run `/generate-tests`, `/review-pr`, and `/check-contract-drift`. The `stop` hook enforces build + test + lint. Nothing is "done" until this passes.

   **Writer ≠ Reviewer**: tests and reviews must run in **separate sessions** from the
   authoring session — `/generate-tests` via the `tester` agent, `/review-pr` via the
   `reviewer` agent, each in fresh context. Never test or review your own code. See
   `.github/instructions/verification-separation.instructions.md`.

## Contracts Are the Spine

- `api_spec.md` is the source of truth for endpoints, request/response shapes, status codes, and error formats.
- `schema.md` is the source of truth for SQLite tables, columns, constraints, and indexes.
- Never invent endpoint or table shapes in code. If the contract is wrong or missing, **update the contract first**, then implement.
- Cross-reference both contracts before writing any handler, service, repository, or model.

## Stack

- **Backend**: Go + Echo, modular monolith, domain-based packages under `internal/`.
- **Frontend**: React + TypeScript + Tailwind CSS.
- **Database**: SQLite (modernc.org/sqlite, pure Go driver). Encryption at rest is handled at the filesystem level (LUKS/dm-crypt). See `go-backend.instructions.md` for SQLite-specific rules (PRAGMA foreign_keys, TEXT UUIDs, integer cents, TEXT timestamps).

## When in Doubt

- Prefer deleting code over adding it.
- Prefer a narrow fix over a refactor.
- If a hook blocks valid code, narrow the hook — don't disable it wholesale.
