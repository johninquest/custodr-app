# ADR 002 — Go/Echo → NestJS 12 + Drizzle

- **Date:** 2026-09-07
- **Status:** Accepted
- **Deciders:** Product owner, architect agent
- **Supersedes:** N/A
- **Superseded by:** N/A
- **Related:** [ADR 001](001_sqlite_to_postgresql_and_contract_domain.md) (PostgreSQL 18, contract domain)

## Context

The backend is Go + Echo (`apps/api`), a modular monolith with domain packages
under `internal/`. It is functionally complete against `docs/api_spec.md` and
`docs/schema.md`: auth, users, consents, contracts, shares, audit, reminders,
dashboard. ADR 001 moved persistence to PostgreSQL 18 and renamed the domain
noun from *commitment* to *contract*.

The problem is not the Go code — it is the **cost of change**. This is a
single-founder MVP whose frontend is React + TypeScript. Every feature touches
two languages, two type systems, two idioms, and two sets of tooling. The
founder's velocity is highest in TypeScript, and the Go backend is the only
thing keeping the stack bilingual.

Three facts make this the cheapest possible moment to switch:

1. **No production data exists.** ADR 001 already reset the schema; there is
   nothing to migrate, only to reimplement.
2. **The contracts are complete and stable.** `api_spec.md` and `schema.md`
   fully describe the surface. The NestJS implementation can be written
   *against the contracts* rather than transliterated from Go — which is the
   whole point of having contracts as the spine.
3. **NestJS 12 has just shipped** (v12.0.0, ~2 weeks before this decision) with
   ESM packages, Standard Schema validation, and a rebuilt CLI. Adopting it now
   avoids scaffolding on v11 and immediately migrating.

## Decision

1. **Freeze the Go API as reference, do not fork it.** `apps/api` is tagged
   `go-legacy` and receives no new features. NestJS becomes the single
   authoritative backend once it passes contract-drift checks. No dual
   maintenance, no two live backends.
2. **Reimplement from the contracts, not from Go code.** `api_spec.md` +
   `schema.md` are the specification. Go pointer-receiver and `if err != nil`
   idioms are not transliterated into TypeScript.
3. **Adopt NestJS 12.0.0**, scaffolded as an **ESM** project. ESM is the v12
   default for new projects and matches `apps/web` (`"type": "module"`). It
   brings Vitest and oxlint as the default test runner and linter. Node floor
   is 20.19 / 22.12; the local toolchain is Node 24.20.0.
4. **Use Zod with `StandardSchemaValidationPipe`** rather than
   `class-validator`. One schema per endpoint drives request validation,
   transformation, and OpenAPI generation — a single source of truth instead of
   parallel DTO + `@ApiProperty` + validation-decorator definitions.
5. **Use Drizzle as the ORM.** It is dialect-independent, so the SQLite escape
   hatch remains config-only if ever needed, and its schema definitions are
   plain TypeScript that can be reviewed alongside the contracts.
6. **Keep PostgreSQL 18** per ADR 001. In-scope features (contract sharing =
   multi-writer, consent management, audit trail) all require it. The SQLite
   temptation is Docker-setup friction, not a data-model preference. ADR 001 is
   not regressed.
7. **Generate one fresh Drizzle baseline migration** rather than replaying the
   eight Go migration steps. No production data exists, so there is nothing to
   preserve in the migration history.
8. **Compliance is domain-level and stack-neutral.** Preserve `consents`
   (versioned, withdrawable), `audit_logs` (append-only), soft delete, and EU
   hosting. Port the schema faithfully; do not re-litigate GDPR against the
   framework choice.
9. **Archive Go on cutover.** Once NestJS passes drift + tests, move
   `apps/api` → `apps/api-legacy` and repoint root scripts and both
   docker-compose files.

## Alternatives Considered

- **Stay on Go.** Rejected: the stack stays bilingual forever, and the founder's
  TypeScript velocity is the binding constraint on an MVP whose biggest
  business risk is user-input friction. The Go code is not the problem; the
  two-language tax is.
- **Run both backends in parallel (true strangler-fig).** Rejected: doubles
  maintenance during the transition and requires routing infrastructure the MVP
  does not have. The freeze-and-switch model gets the same safety (Go is still
  in git, still builds) at a fraction of the cost.
- **NestJS 11 instead of 12.** Rejected: v12 is already released and stable;
  scaffolding on v11 would mean an immediate migration. The v12 breaking
  changes (ESM packages, Node floor) are all greenfield-friendly — there is no
  existing Nest code to break.
- **CommonJS instead of ESM.** Rejected: ESM is the v12 default, matches
  `apps/web`, and gets Vitest + oxlint. The `require(esm)` compatibility path
  means CJS would work, but it opts out of the framework's chosen direction for
  no benefit in a new project.
- **class-validator + `ValidationPipe` instead of Zod.** Rejected: it is fully
  supported and not deprecated, but it requires maintaining validation
  decorators *and* `@ApiProperty` decorators *and* the DTO class — three
  places to change per field. Zod schemas attached via `@Body({ schema })`
  collapse that to one, and feed OpenAPI automatically.
- **Prisma instead of Drizzle.** Rejected: Prisma's schema DSL is a fourth
  language in the repo and its migration workflow is heavier. Drizzle schemas
  are TypeScript and reviewable next to the contracts.
- **Pin the PostgreSQL image to an exact minor** (e.g. `18.6-alpine3.24`).
  Deferred: reproducibility is a real benefit, but the floating
  `postgres:18-alpine` tag keeps security patches automatic during MVP. Revisit
  if a bad minor ever lands.

## Consequences

**Positive**

- One language across the stack; the founder ships faster.
- Zod schemas become the single source of truth for validation, types, and
  OpenAPI — eliminating a whole class of drift.
- Nest 12's `routeResolutionStrategy: 'specificity'` and
  `routeConflictPolicy` make the `GET /contracts/:id` vs
  `GET /contracts/upcoming` shadowing bug impossible rather than merely
  unlikely.
- `errorCode` on `HttpExceptionOptions` maps directly onto the six error codes
  in `api_spec.md`, so the error contract is enforced by the framework rather
  than by convention.
- Drizzle keeps the SQLite escape hatch config-only.

**Negative**

- The entire backend is rewritten; anything the contracts under-specify will be
  re-decided, and small behavioural differences may slip through. Mitigated by
  `/check-contract-drift` and by keeping Go buildable until cutover.
- Two backends exist in the repo during the transition, which is a temporary
  cognitive and CI cost.
- ESM requires explicit `.js` import extensions in relative imports — a
  persistent papercut for anyone used to CJS/TypeScript bundler resolution.
- Nest 12 is two weeks old. Early-adopter risk: thinner Stack Overflow
  coverage, and the ecosystem (`@nestjs/swagger`, `@nestjs/throttler`) is
  settling into v12 compatibility.

**Neutral / follow-ups**

- `docs/schema.md`'s "Migration Tool" section is updated from `golang-migrate`
  + pgx to `drizzle-kit`. Table and column definitions are unchanged.
- Mailjet's `EmailProvider` is greenfield — Go's `notifications/mailjet/` is
  empty, so there is no reference implementation to port.
- `@nestjs/observe` (Nest 12's native observability) is deferred to keep the
  migration surface small; it is opt-in and can be added later via
  `nest upgrade --observe`.
- The frontend should require zero changes, since the API contract is
  unchanged. This is a verification checkpoint, not an assumption.
