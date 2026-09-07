# Plan: Go → NestJS + Drizzle Migration (Pivot)

> Status: Draft (awaiting Phase 0 ADR + review)
> Date: 2026-09-07

## TL;DR

Freeze the Go/Echo API as the reference, reimplement the domain in a new
NestJS + Drizzle + PostgreSQL backend **against `docs/api_spec.md` and
`docs/schema.md`** (not by transliterating Go), then archive Go once the
NestJS API passes contract-drift checks. This is a strangler-fig → switch,
**not** a parallel API. Contracts stay the single source of truth. Keep
PostgreSQL (ADR 001 already justified it); Drizzle gives a cheap SQLite
escape hatch later if ever wanted.

## Decisions (agreed in discussion)

1. **Migration, not fork.** Go is frozen; NestJS becomes the one authoritative
   backend once verified. No dual-maintenance, no two live backends.
2. **Reimplement from contracts, not Go code.** `api_spec.md` + `schema.md`
   are the spec. Do not transliterate pointer-receiver/`if err != nil` Go
   idioms into TS.
3. **Keep PostgreSQL 18.** In-scope MVP features (contract sharing =
   multi-writer, consent management, audit trail) all need it. SQLite
   temptation is Docker-setup friction, not a data-model preference. Do not
   regress ADR 001.
4. **Drizzle as ORM** (dialect-independent → future SQLite flip is config-only).
5. **Compliance is domain-level, stack-neutral.** Preserve `consents`
   (versioned/withdrawable), `audit_logs` (append-only), soft-delete, EU
   hosting. Port schema faithfully; don't re-litigate GDPR vs framework.

## Scope

**In:** NestJS scaffold in monorepo; Drizzle schema for all 8 tables + ported
migrations; reimplement all endpoints in `api_spec.md`; Firebase auth behind
`AuthProvider`; Mailjet behind `EmailProvider`; reminder scheduler; error
format + pagination + rate-limit parity; archive Go.

**Out (deferred):** new features, schema changes, native Postgres enums,
microservices/CQRS/K8s, document storage, BiPRO/Open-Finance connectors.

## Phases & Steps

### Phase 0 — Record the decision (architectural gate)

1. Write ADR `docs/architectural-change-logs/002_go_to_nestjs_migration.md`
   using the existing template (Date/Status/Context/Decision/Alternatives/
   Consequences). Record rationale: founder velocity in TS, one-language
   stack. *(This satisfies the Architecture Gate + `/log-architectural-change`.)*
2. `git tag go-legacy` on the Go API (freeze point).

### Phase 1 — Scaffold NestJS app (parallel-capable: 1a/1b/1c)

1a. Add `apps/api-nest` workspace: NestJS + TypeScript strict + Drizzle
    (`drizzle-orm`, `drizzle-kit`) + `pg` driver.
1b. Add `@nestjs/config`, `@nestjs/schedule`, Firebase Admin SDK,
    `class-validator`/`class-transformer`, Swagger (`@nestjs/swagger`).
1c. Wire `apps/api-nest` into Turborepo (`turbo.json`) and root package.json
    scripts (`dev`, `build`, `test`, `lint`) — mirror existing `apps/api`.

### Phase 2 — Port schema to Drizzle (blocks Phase 3)

1. Express all 8 tables as Drizzle schema (`users`, `contracts`,
   `contract_shares`, `reminder_preferences`, `reminders`, `consents`,
   `notifications`, `audit_logs`). Preserve: UUID PKs (UUIDv7 generated in
   app layer), `TIMESTAMPTZ`, `DATE`, integer-cents money, `JSONB` for
   `reminder_windows`/`before_value`/`after_value`, CHECK-constrained TEXT
   enums, soft-delete `deleted_at`, partial indexes, `ON DELETE` behavior.
2. Generate Drizzle migrations (fresh baseline, since no prod data yet).
3. Port UUIDv7 helper → a `newId()` util (mirror `internal/shared/ids`).

### Phase 3 — Reimplement domains (order below; steps parallelizable per-module)

For each domain build `module/controller/service/repository(+dto)` mapping:

- `auth` → AuthModule. `TokenVerifier` interface → NestJS abstract class /
  provider `AuthProvider`; `FirebaseProvider` implementation using Admin SDK
  `verifyIdToken`. Endpoints: `POST /auth/login`.
- `users` → UsersModule. `GET /users/me`, `DELETE /users/me` (GDPR hard
  delete: cascade contracts/reminders/notifications/consents; NULL
  `audit_logs.actor_user_id`).
- `consents` → ConsentsModule. GET/POST `.../consents`, DELETE `.../consents/:type`.
- `contracts` → ContractsModule (largest). CRUD + `GET /contracts/upcoming` +
  shares (GET/POST/DELETE) + `GET /contracts/:id/audit`. Port cents↔decimal
  conversion and `IsValidCategory`-equivalent + date/constraint validation.
- `reminders` → RemindersModule. `GET /reminders`, GET/PUT
  `.../preferences`. Scheduler via `@nestjs/schedule` reading
  `reminder_windows` JSONB.
- `notifications` → NotificationsModule. `EmailProvider` abstraction + Mailjet
  impl (currently empty in Go — implement here).
- `dashboard` → DashboardModule. `GET /dashboard/summary`.

### Phase 4 — Cross-cutting parity (can overlap Phase 3)

1. Error response shape: replicate `{ error: { code, message, details[] } }`
   + the 6 error codes → global `HttpExceptionFilter`.
2. Pagination envelope `{ data, pagination: { page, limit, total, total_pages } }`.
3. Rate limiting (100/min auth endpoints, 10/min auth) + `X-RateLimit-*`
   headers → `@nestjs/throttler`.
4. CORS for `FRONTEND_URL`; JWT/Firebase guard middleware + `@CurrentUser`.

### Phase 5 — Verify & cut over

1. Run `/check-contract-drift` against `api_spec.md` + `schema.md`.
2. `/generate-tests` (tester agent) and `/review-pr` (reviewer agent) — per
   Writer ≠ Reviewer rule, in separate sessions.
3. Update frontend `apps/web/src/services/api.ts` base URL if needed (API
   contract is unchanged, so frontend should be untouched — verify).
4. Archive Go: move `apps/api` to `apps/api-legacy` (or git-archive) once
   NestJS passes drift + tests. Update root scripts/docker-compose to point
   at `apps/api-nest`.

## Relevant files (reference / reuse)

**Contracts (spine — do not change):**

- `docs/api_spec.md` — full endpoint/validation/error/pagination/rate-limit spec
- `docs/schema.md` — 8 tables, conventions, CHECK enums, soft-delete rules

**Go to reference (not transliterate):**

- `apps/api/internal/auth/firebase.go` — `FirebaseProvider`, `VerifyToken` (uid+email)
- `apps/api/internal/auth/models.go` — `TokenVerifier` interface, `User`
- `apps/api/internal/contracts/service.go` — `Create`, cents/decimal, `IsValidCategory`, date validation
- `apps/api/internal/notifications/models.go` — `EmailProvider` interface, `Notification`
- `apps/api/internal/shared/ids/ids.go` — `ids.New()` = UUIDv7
- `apps/api/internal/shared/errors/errors.go` — `APIError{Code,Message,Details}`
- `apps/api/migrations/*.up.sql` — source SQL for Drizzle schema port

**To create:**

- `apps/api-nest/` (new NestJS workspace), `docs/architectural-change-logs/002_*.md`
- `turbo.json`, root `package.json` (add api-nest), docker-compose files (point to api-nest)

## Verification

1. `npm run dev` (or per-workspace) boots NestJS; migrations apply to same
   Postgres as Go used.
2. Smoke test every endpoint group against `api_spec.md` (auth → users →
   consents → contracts → shares → audit → reminders → dashboard) with curl
   or Swagger UI.
3. Error/pagination/rate-limit parity spot-checks (validation error shape,
   `pagination` block, `X-RateLimit-*`).
4. `go test`/build still green before archiving (freeze sanity).
5. Frontend unchanged & functional against new API (contract unchanged).

## Further Considerations

1. **Mailjet impl is greenfield** — Go's `notifications/mailjet/` is empty, so
   there is no reference to port; implement `EmailProvider` fresh (document
   Mailjet key handling — user owns `.env`).
2. **Migration baseline**: since no production data exists, generate one fresh
   Drizzle baseline rather than replaying 8 Go migration steps.
3. **Frontend base URL**: confirm `apps/web/src/services/api.ts` targets
   `/api/v1` unchanged — contract parity should require zero frontend edits.
