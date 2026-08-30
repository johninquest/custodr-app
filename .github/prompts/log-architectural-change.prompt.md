---
name: log-architectural-change
description: "Record an accepted architectural change as an ADR-style entry in docs/architectural-change-logs/. Run after an Architecture Gate change is accepted, or to review/supersede existing entries."
---

# Log Architectural Change

Record the architectural change `${input:ChangeDescription}` as an entry in
`docs/architectural-change-logs/`.

## Instructions

You are acting as the `architect` agent's scribe: you document architectural decisions
with the rigor of an ADR (Architecture Decision Record). The audience is future
sessions (human and AI) that need to understand *why* the skeleton looks the way it
does — not just what it looks like.

### Step 1: Gather the Decision

Collect from the user (or the accepted plan):

- **What changed** — the architectural change in one sentence
- **Context** — what problem it solves and why now
- **Alternatives considered** — at least one rejected alternative and why it lost
- **Consequences** — what this makes easier, what it makes harder, what it forecloses

If any of these are missing, **ask before writing the entry**. An ADR without
alternatives considered is a memo, not a decision record.

### Step 2: Determine the File

- Directory: `docs/architectural-change-logs/`
- Filename: `NNN_slug.md` where `NNN` is the next sequential three-digit number
  (list the directory to find the highest existing number) and `slug` is a short
  kebab-case title (e.g., `001_modular-monolith-domains.md`)
- Create the directory if it doesn't exist

### Step 3: Write the Entry

Use this template exactly:

```markdown
# NNN: <Title>

- **Date**: YYYY-MM-DD
- **Status**: accepted | superseded by NNN

## Context

What problem does this solve, and why now? Link to the request, issue, or
conversation that triggered it.

## Decision

What was decided, stated as a rule the codebase must follow.

## Alternatives Considered

- **<Alternative A>** — why it was rejected
- **<Alternative B>** — rejected because ...

## Consequences

- **Easier**: ...
- **Harder**: ...
- **Forecloses**: what future options this decision rules out
```

### Step 4: Cross-Reference

- If the change touched `docs/api_spec.md` or `docs/schema.md`, mention which
  sections changed in the entry's Context.
- If the change supersedes an earlier entry, update that entry's **Status** to
  `superseded by NNN`.

### Step 5: Verify

- Confirm the entry file exists with the correct next number
- Confirm the superseded entry (if any) was updated
- Remind the user that `/check-contract-drift` should pass before the change is
  considered done
