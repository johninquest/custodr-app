# ADR 001 — SQLite → PostgreSQL and the Contract Domain

- **Date:** 2026-09-05
- **Status:** Accepted
- **Deciders:** Product owner, backend agent
- **Supersedes:** N/A (first architectural change log entry)

## Context

The API was prototyped against SQLite (`modernc.org/sqlite`) for zero-setup
local development. The original stack decision document
(`docs/tech_stack_considerations_digital_renewal_platform.md`) had already
selected **PostgreSQL as the system of record** — SQLite was an implementation
drift, not a deliberate choice.

At the same time, three product requirements landed that all touch the
persistence layer:

1. **Contract sharing** — a user grants another user (e.g. a partner, for
   emergency access) read access to specific contracts.
2. **Consent management (Einwilligungserklärung)** — a documented, versioned,
   withdrawable record of notification opt-ins.
3. **Audit trail** — a per-contract activity log of field-level changes.

The domain noun is also being renamed from *"commitment"* to *"contract"*
(`/commitments` → `/contracts`, table `commitments` → `contracts`), since
"contract" is the more intuitive and pronounceable term and matches the
narrowed category set already shipped in migration `000006`.

## Decision

1. **Migrate to PostgreSQL 18 + `github.com/jackc/pgx/v5` now**, before any
   production data exists, and **drop SQLite entirely** (single dialect; no
   dual migration directories).
2. Fold the `commitment(s)` → `contract(s)` rename into fresh PostgreSQL
   migrations rather than replaying the SQLite rename dance.
3. Add the three new tables: `contract_shares`, `consents`, `audit_logs`, plus
   a `users.name` column for minimal PII.
4. Use PostgreSQL-native types (`BOOLEAN`, `DATE`/`TIMESTAMPTZ`, `JSONB`,
   `UUID`) but keep **`TEXT` + `CHECK`** for enum-like columns (categories,
   statuses) because the category set has already been narrowed once and is
   expected to expand again; PostgreSQL enum removal is painful.
5. Keep monetary amounts as **integer cents** and UUIDs generated in the
   application layer as **UUIDv7** (time-ordered, preserving the index-locality
   benefit the SQLite design relied on).
6. Run PostgreSQL as a **docker-compose service** (reproducible), not the host
   installation, matching the original deployment model.

## Alternatives Considered

- **Stay on SQLite for the MVP.** Rejected: the roadmap (sharing, consent,
  audit, future BiPRO/FiDA/Open Finance) assumes a relational system of record;
  the codebase already shows production posture (LUKS, off-host backups,
  GDPR-by-design), and the schema is tiny with no production data — this is the
  cheapest moment to migrate.
- **Minimal SQLite→PostgreSQL transliteration** (keep `TEXT` PKs, `INTEGER`
  booleans). Rejected: preserves SQLite-isms forever and loses the type safety
  that makes the new features easier to query.
- **Native PostgreSQL enums.** Rejected for extensibility reasons (above).
- **Keep the name `commitment`.** Rejected: "contract" reads better, is
  pronounceable, and matches the data model already in place.

## Consequences

**Positive**

- Correct, long-term system of record; removes a future high-risk migration.
- `JSONB` makes the `audit_logs` before/after diffs and
  `reminder_preferences.reminder_windows` natural.
- Native types remove the SQLite `PRAGMA foreign_keys` / table-rebuild
  contortions.

**Negative**

- Local development now requires a PostgreSQL service (compose), a small setup
  cost versus the zero-setup SQLite file.
- The `commitment` → `contract` rename is a breaking API and schema change for
  any consumer of the prototype.

**Neutral / follow-ups**

- Transactional email localization later will likely require a
  `users.preferred_language` column (currently browser-detection only).
