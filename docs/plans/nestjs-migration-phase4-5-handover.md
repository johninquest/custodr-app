# Handover: NestJS Migration — Phase 4 & 5

> **Status:** Ready for handover
> **Date:** 2026-09-08
> **Branch:** `nestjs-pivot` (upstream: `origin/nestjs-pivot`)
> **Supersedes:** `docs/plans/go-to-nestjs-migration.md` (original draft — now
> historical; Phases 0–3 are done and this document carries the remainder)

## Read this first

Phases 0–3 are **complete and committed**. This document covers only what
remains: finishing Phase 4 (cross-cutting parity) and executing Phase 5
(verify & cut over).

The single most important fact for whoever picks this up:

> **No authenticated endpoint has ever executed against the database.**
> Firebase is not configured locally, so every protected route returns 401
> before reaching a handler. All domain logic — contracts CRUD, shares, audit,
> reminders, dashboard — compiles and routes correctly but is **unverified at
> runtime**. Treat it as untested code, not working code.

Everything below is written to be executed in a fresh session with no prior
context.

---

## 1. Current state (verified 2026-09-08)

### Committed

| Commit | Contents |
|---|---|
| `03152ad` | Phase 0–1: ADR 002, `go-legacy` tag, schema.md update, Nest 12 ESM scaffold |
| `debf64b` | Phase 2: Drizzle schema (8 tables), baseline migration, `newId()` |
| `4f4235b` | Phase 3: all domain modules + cross-cutting parity |

53 files tracked under `apps/api-nest`. Working tree has one uncommitted
change (`.env.example`, see §2.4).

### Verified working

- Build, typecheck (`tsc --noEmit`), and lint (`oxlint`) all pass
- Server boots; 14 spec routes + `/health` + catch-all mapped
- `GET /health` → `{"status":"ok",...}`
- Error envelopes correct for 401 / 404 / 400 validation
- Swagger UI at `/swagger` (200), all paths documented
- `GET /contracts/upcoming` is **not** shadowed by `GET /contracts/:id`
- Schema applied to live PostgreSQL 18.6 (Alpine 3.24.1): 8 tables, 32
  indexes, 13 CHECK constraints; cascade + soft-delete behaviour confirmed

### Not verified

- Every authenticated endpoint (blocked on Firebase — see §2.1)
- `GET /contracts/upcoming` returns a stub (see §2.2)

---

## 2. Remaining work

### 2.1 Stub `AuthProvider` for local dev — **do this first**

**Why it's first:** it unblocks verification of everything else and is a
prerequisite for the tester agent to write meaningful integration tests.

Add a dev-only `AuthProvider` that accepts a fixed bearer token and resolves
it to a seeded user. Gate it behind `NODE_ENV !== 'production'` so it can
never be active in a deployed environment.

Suggested shape:

```ts
// src/auth/dev.provider.ts
@Injectable()
export class DevAuthProvider extends AuthProvider {
  async verifyToken(token: string): Promise<VerifiedIdentity> {
    if (token !== process.env.DEV_AUTH_TOKEN) {
      throw new UnauthorizedException('Invalid dev token');
    }
    return { subjectId: 'dev-user', email: 'dev@example.com' };
  }
}
```

Select it in `AuthProviderModule` when `FIREBASE_PROJECT_ID` is unset **and**
`NODE_ENV !== 'production'`. Log a loud warning when the dev provider is
active.

**Acceptance:** with the stub active, `GET /api/v1/users/me` returns a real
user record, and a contract can be created, listed, updated, and deleted
end-to-end.

### 2.2 Implement `GET /contracts/upcoming`

Currently a stub returning an empty envelope
(`src/contracts/contracts.controller.ts:127`).

Per `docs/api_spec.md` §Contracts:

- Query params: `days` (default 90), `type` (`renewal` | `cancellation`)
- Response rows: `id`, `name`, `category`, `provider`, `renewal_date`,
  `cancellation_deadline`, `days_until_renewal`, `days_until_cancellation`,
  `cost`, `currency`, `billing_frequency`, `status`
- `summary`: `total_upcoming`, `total_cost_monthly`, `currency`

Reuse `centsToDecimal` from `src/contracts/money.ts` and the monthly
normalisation already in `src/dashboard/dashboard.controller.ts`
(`MONTHLY_DIVISOR`).

### 2.3 Rate limiting

Not implemented. **`@nestjs/throttler` cannot be used** — its latest release
(6.5.0) declares peers `@nestjs/common ^11` and has no Nest 12 support.

Hand-roll an interceptor instead. Per `docs/api_spec.md` §Rate Limiting:

- Authenticated endpoints: 100 requests/minute per user
- Auth endpoints: 10 requests/minute per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- 429 body: `{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Rate limit exceeded. Try again in 60 seconds."}}`

`RateLimitException` already exists in `src/shared/errors.ts`. An in-memory
store is fine for MVP; note the limitation if the API ever runs multi-instance.

### 2.4 Housekeeping — **DONE** (commit `9ca146c`)

Completed on 2026-09-08; listed here so you don't redo it:

- ✅ `.env.example` — stale SQLite header fixed, `DATABASE_URL` documented,
  NestJS vars added (`NODE_ENV`, `PORT`, `FRONTEND_URL`, `FIREBASE_*`),
  Mailjet marked deferred
- ✅ `*.tsbuildinfo` added to `.gitignore`; the committed
  `apps/api-nest/tsconfig.build.tsbuildinfo` untracked
- ✅ `turbo.json` — `globalPassThroughEnv` now includes `DATABASE_URL`,
  `PORT`, `FRONTEND_URL`, `NODE_ENV`, `LOG_LEVEL`, `FIREBASE_*`, `MAILJET_*`
- ✅ `dev:nest` script added (`turbo run dev --filter=api-nest --filter=web`),
  verified to scope to `api-nest` + `web` only

**Still open:**

- **Postgres publishes no host port** — add `5432:5432` to
  `docker-compose.dev.yml` so migrations can run without the
  `docker run --network` workaround. (Low priority; the workaround is
  documented in §5.)

### 2.5 Explicitly out of scope — do not implement

**Email / Mailjet / notifications.** The user has decided this is not needed
now. Do not build `NotificationsModule` or an `EmailProvider`.

The only obligation is that **the contract stays accurate**. Two small
contract touch-ups are warranted (see §3):

- `docs/api_spec.md` §Reminder System Architecture still describes a
  background worker sending via Mailjet/Postmark. That is still the intended
  design — keep it, but make the deferred status explicit and stack-neutral.
- ADR 002 line ~135 says "Mailjet's `EmailProvider` is greenfield". Update to
  record that it is **deferred, not required for cutover**.

---

## 3. Contract updates (do before Phase 5 verification)

These are documentation-only. Make them before running `/check-contract-drift`
so the check compares against an accurate contract.

1. **`docs/api_spec.md`** — in §Reminder System Architecture, note that the
   background job is deferred and that the provider abstraction
   (`EmailProvider`) is stack-neutral. Keep the Mailjet/Postmark reference as
   the intended implementation; do not delete the design.
2. **`docs/architectural-change-logs/002_go_to_nestjs_migration.md`** — update
   the follow-ups section: `EmailProvider`/Mailjet is deferred and **not a
   cutover blocker**.
3. **`docs/plans/go-to-nestjs-migration.md`** — mark it superseded and point
   at this document. It still says "Status: Draft (awaiting Phase 0 ADR)",
   which is stale and misleading.

---

## 4. Phase 5 — Verify & cut over

Execute **in this order**. Steps 2 and 3 must run in **separate sessions** per
the Writer ≠ Reviewer rule (`.github/instructions/verification-separation.instructions.md`).

1. **`/check-contract-drift`** against `api_spec.md` + `schema.md`. Fix any
   drift found before proceeding.
2. **`/generate-tests`** via the **`tester` agent** in a fresh session.
   Currently only `src/app.controller.spec.ts` exists (scaffold leftover) —
   real coverage is zero. Prioritise: contracts CRUD, shares, audit,
   pagination, error envelopes, cents↔decimal conversion.
3. **`/review-pr`** via the **`reviewer` agent** in a *different* fresh
   session. Do not review in the same session that wrote the code.
4. **Confirm the frontend needs zero edits.** `apps/web/src/services/api.ts`
   targets `/api/v1` and the contract is unchanged, so this should hold —
   verify rather than assume.
5. **Archive Go:**
   - `git mv apps/api apps/api-legacy`
   - Repoint `docker-compose.yml` and `docker-compose.dev.yml` at
     `apps/api-nest`
   - Update root `package.json` scripts (`dev:api`, `build:api`)
   - Confirm `go build ./... && go test ./...` still passes **before**
     archiving (freeze sanity check)

---

## 5. Environment notes for the next session

- **Node 24.20.0** (`.nvmrc`). Nest 12 floor is 20.19/22.12; CLI generators
  want 22.22.3+/24.15+/26+.
- **Postgres** runs via `docker compose up -d postgres` (PG 18.6, Alpine
  3.24.1). No host port published by default.
- **Migrations** (until the port is published):
  ```powershell
  docker run --rm --network custodr-app_custodr-app-network `
    -v "${PWD}/apps/api-nest:/app" -w /app node:24-alpine3.24 sh -c `
    "npm install --silent --no-save drizzle-orm drizzle-kit pg >/dev/null 2>&1; `
     DATABASE_URL=postgres://pguser:pgpassword@postgres:5432/pgdb npx drizzle-kit migrate"
  ```
- **Run the API:**
  ```powershell
  $env:DATABASE_URL="postgres://pguser:pgpassword@localhost:5432/pgdb"
  $env:PORT=8080
  node C:\dev\fullstack\custodr-app\apps\api-nest\dist\main
  ```
- **Inspect responses with `curl.exe`, not `Invoke-WebRequest`** — PowerShell
  truncates error bodies and will make correct responses look empty.

### Known traps (learned the hard way)

- `app.use()` **and** `getHttpAdapter().use()` both register middleware
  *before* Nest's router and will swallow every request. For 404 envelopes use
  a `@Controller()` with `@All('*')` registered last.
- `errorCode` is a first-class property on `HttpException`; `getResponse()`
  returns only the message string. Read `api.errorCode` directly.
- Guards need **both** `AUTH_PROVIDER` and `UsersService` in the consuming
  module's imports. `AuthProviderModule` is a leaf module specifically to break
  the Auth↔Users cycle — don't merge it back.
- `npm install --workspace=X` silently no-ops for new deps. Edit the workspace
  `package.json` directly, then `npm install` from root.
- `drizzle-kit` resolves `drizzle-orm/version` from **its own** location
  (root), so `drizzle-orm` must also be a root dependency.
- PG 18+ images reject a volume at `/var/lib/postgresql/data`; mount
  `/var/lib/postgresql`.

---

## 6. Definition of done

- [ ] Stub `AuthProvider` active in dev, gated off in production
- [ ] All 20 spec endpoints exercised end-to-end against live Postgres
- [ ] `GET /contracts/upcoming` returns real data
- [ ] Rate limiting with `X-RateLimit-*` headers and 429 envelope
- [x] `*.tsbuildinfo` ignored; `.env.example` corrected and committed
- [x] `turbo.json` env passthrough complete; `dev:nest` script added
- [ ] Postgres host port published in `docker-compose.dev.yml` (optional)
- [ ] Contract docs updated (§3)
- [ ] `/check-contract-drift` clean
- [ ] Tests written by `tester` agent in a separate session
- [ ] Review by `reviewer` agent in a separate session
- [ ] Frontend confirmed unchanged
- [ ] Go archived to `apps/api-legacy`; compose + scripts repointed
