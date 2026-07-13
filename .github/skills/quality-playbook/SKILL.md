---
name: quality-playbook
description: "Run a complete quality engineering audit on any codebase. Derives behavioral requirements from the code, generates spec-traced functional tests, runs a three-pass code review with regression tests, executes a multi-model spec audit (Council of Three), and produces a consolidated bug report with TDD-verified patches. Finds the 35% of real defects that structural code review alone cannot catch. Works with any language. Trigger on 'quality playbook', 'spec audit', 'Council of Three', 'fitness-to-purpose', or 'coverage theater'."
license: Complete terms in LICENSE.txt
metadata:
  version: 1.5.6
  author: Andrew Stellman
  github: https://github.com/andrewstellman/quality-playbook
---

# Quality Playbook Generator

## Plan

Overview — read this first, then explain it to the user

Before reading any other section of this skill, understand the plan and its dependencies. Each phase produces artifacts that the next phase depends on. Skipping or rushing a phase means every downstream phase works from incomplete information.

**Phase 0 (Prior Run Analysis):** If previous quality runs exist, load their findings as seed data. This is automatic and only applies to re-runs.

**Phase 1 (Explore):** Run the v1.5.3 documentation intake first. Then explore the codebase in three stages: open exploration driven by domain knowledge, domain-knowledge risk analysis, and selected structured exploration patterns. Write all findings to `quality/EXPLORATION.md`. This file is the foundation — Phase 2 reads it as its primary input.

**Phase 2 (Generate):** Read EXPLORATION.md and produce the quality artifacts: requirements, constitution, functional tests, code review protocol, integration tests, spec audit protocol, TDD protocol.

**Phase 3 (Code Review):** Run the three-pass code review against HEAD. Write regression tests for every confirmed bug. Generate patches.

**Phase 4 (Spec Audit):** Three independent AI auditors review the code against requirements. Triage with verification probes.

**Phase 5 (Reconciliation):** Close the loop — every bug from code review and spec audit is tracked, regression-tested or explicitly exempted. Run TDD red-green cycle. Finalize the completeness report.

**Phase 6 (Verify):** Run self-check benchmarks against all generated artifacts. Check for internal consistency, version stamp correctness, and convergence.

**Phase 7 (Present, Explore, Improve):** Present results to the user with a scannable summary table, offer drill-down on any artifact, and provide a menu of improvement paths.

Every bug found traces back to a requirement, and every requirement traces back to an exploration finding.

**The critical dependency chain:** Exploration findings → EXPLORATION.md → Requirements → Code review + Spec audit → Bug discovery. A shallow exploration produces abstract requirements. Abstract requirements miss bugs. The exploration phase is where bugs are won or lost.

## Why This Exists

Most software projects have tests, but few have a quality *system*. Tests check whether code works. A quality system answers harder questions: what does "working correctly" mean for this specific project? What are the ways it could fail that wouldn't be caught by tests? What should every developer (human or AI) know before touching this code?

Without a quality playbook, every new contributor (and every new AI session) starts from scratch — guessing at what matters, writing tests that look good but don't catch real bugs, and rediscovering failure modes that were already found and fixed months ago. A quality playbook makes the bar explicit, persistent, and inherited.

## What This Skill Produces

Nine files that together form a repeatable quality system:

| File | Purpose | Why It Matters |
|------|---------|----------------|
| `quality/QUALITY.md` | Quality constitution — coverage targets, fitness-to-purpose scenarios, theater prevention | Every AI session reads this first. It tells them what "good enough" means so they don't guess. |
| `quality/REQUIREMENTS.md` | Testable requirements with project overview, use cases, and narrative | The foundation for Passes 2 and 3 of the code review. Without requirements, review is limited to structural anomalies (~65% ceiling). With them, the review can catch intent violations. |
| `quality/test_functional.*` | Automated functional tests derived from specifications | The safety net. Tests tied to what the spec says should happen, not just what the code does. |
| `quality/RUN_CODE_REVIEW.md` | Three-pass code review protocol: structural review, requirement verification, cross-requirement consistency | Structural review alone misses ~35% of real defects. The three-pass pipeline adds requirement verification and consistency checking. |
| `quality/RUN_INTEGRATION_TESTS.md` | Integration test protocol — end-to-end pipeline across all variants | Unit tests pass, but does the system actually work end-to-end with real external services? |
| `quality/BUGS.md` | Consolidated bug report with patches | Every confirmed bug in one place with reproduction details, spec basis, severity, and patch references. |
| `quality/RUN_TDD_TESTS.md` | TDD red-green verification protocol | Proves each bug is real (test fails on unpatched code) and each fix works (test passes after patch). |
| `quality/RUN_SPEC_AUDIT.md` | Council of Three multi-model spec audit protocol | No single AI model catches everything. Three independent models with different blind spots catch defects that any one alone would miss. |
| `AGENTS.md` | Bootstrap context for any AI session working on this project | The "read this first" file. Without it, AI sessions waste their first hour figuring out what's going on. |

## How to Use

### Interactive protocol — how to guide the user

**After every phase and every iteration, STOP and print guidance.** Use a `#` header so it's prominent in the chat. The guidance must include: what just happened (one line), what the key outputs are, and the exact prompt to continue.

**If the user says "keep going", "continue", "next phase", "next", or anything similar**, run the next phase in sequence. If all phases are complete, suggest the first iteration strategy (gap). If an iteration just finished, suggest the next strategy in the recommended cycle.

**If the user asks "help", "how does this work", "what is this", or any similar phrasing**, respond with this explanation:

> The Quality Playbook finds bugs that structural code review alone can't catch — the 35% of real defects that require understanding what the code is *supposed* to do. It works phase by phase:
>
> - **Phase 1 (Explore):** Understand the codebase — architecture, risks, failure modes, specifications
> - **Phase 2 (Generate):** Produce quality artifacts — requirements, tests, review protocols
> - **Phase 3 (Code Review):** Three-pass review with regression tests for every confirmed bug
> - **Phase 4 (Spec Audit):** Three independent AI auditors check the code against requirements
> - **Phase 5 (Reconciliation):** Close the loop — TDD red-green verification for every bug
> - **Phase 6 (Verify):** Self-check benchmarks validate all generated artifacts
>
> After the numbered phases complete, you can run iteration strategies (gap, unfiltered, parity, adversarial) to find additional bugs — iterations typically add 40-60% more confirmed bugs on top of the baseline.
>
> The playbook works best when you provide documentation alongside the code — specs, API docs, design documents, community documentation. It also gets significantly better results when you run each phase separately rather than all at once.
>
> To get started, say: **"Run the quality playbook on this project."**

### Documentation warning

**At the start of Phase 1, before exploring any code, check for documentation.** Look for directories named `docs/`, `reference_docs/`, `doc/`, `documentation/`, or any gathered documentation files.

**If no documentation is found, print this warning immediately (before proceeding):**

> **Important: No project documentation found.** The quality playbook works without documentation, but it finds significantly more bugs — and higher-confidence bugs — when you provide specs, API docs, design documents, or community documentation. In controlled experiments, documentation-enriched runs found different and better bugs than code-only baselines.
>
> If you have documentation available, you can add it to a `reference_docs/` directory and re-run Phase 1. Otherwise, I'll proceed with code-only analysis.

Then proceed with Phase 1 — don't block on this, just make sure the user sees the warning.

### Running a specific phase

The user can request any individual phase:

```
Run quality playbook phase 1.
Run quality playbook phase 3 — code review.
Run phase 5 reconciliation.
```

When running a specific phase, check that its prerequisites exist (e.g., Phase 3 requires Phase 2 artifacts). If prerequisites are missing, tell the user which phases need to run first.

### Iteration mode — improve on a previous run

Use this when a previous playbook run exists and you want to find additional bugs. Iteration mode replaces Phase 1's from-scratch exploration with a targeted exploration using one of five strategies, then merges findings with the previous run and re-runs Phases 2–6 against the combined results.

**When to use iteration mode:** After a complete playbook run, when you believe the codebase has more bugs than the first run found.

**Iteration strategies.** The user selects a strategy by naming it in the prompt. If no strategy is named, default to `gap`.

```
Run the next iteration of the quality playbook.                          # default: gap strategy
Run the next iteration of the quality playbook using the gap strategy.
Run the next iteration using the unfiltered strategy.
Run the next iteration using the parity strategy.
Run an iteration using the adversarial strategy.
```

**Recommended cycle:** gap → unfiltered → parity → adversarial. Each strategy finds different bug classes:

- **`gap`** (default) — Scan previous coverage, explore uncovered subsystems and thin sections.
- **`unfiltered`** — Pure domain-driven exploration with no structural constraints.
- **`parity`** — Systematically enumerate parallel implementations of the same contract and diff them for inconsistencies.
- **`adversarial`** — Re-investigate dismissed/demoted triage findings and challenge thin SATISFIED verdicts.
- **`all`** — Runner-level convenience: executes gap → unfiltered → parity → adversarial in sequence.

## Principles

1. Fitness-to-purpose over coverage percentages
2. Scenarios come from code exploration AND domain knowledge
3. Concrete failure modes make standards non-negotiable — abstract requirements invite rationalization
4. Guardrails transform AI review quality (line numbers, read bodies, grep before claiming)
5. Triage before fixing — many "defects" are spec bugs or design decisions
6. Structural review has a ceiling (~65%). The remaining ~35% are intent violations — absence bugs, cross-file contradictions, design gaps — invisible to any tool that only reads code. Requirements make the invisible visible.
7. The specification is the unique contribution, not the review structure. Focus areas and review protocols are secondary to having the right testable requirements derived from intent sources.
8. Cross-requirement consistency checking is essential. Bugs often live in the gap between two individually-correct pieces of code. Per-requirement verification alone can't find these.
9. Keep all derived requirements — do not filter. The cost of checking an extra requirement is low; the cost of missing a bug because you pruned the requirement that would have caught it is high.
10. A failing test is the strongest evidence a bug exists. Run the red-green TDD cycle (test fails on buggy code, passes on fixed code) for every confirmed bug with a fix patch. Show the FAIL→PASS output — reviewers can disagree with your fix but can't argue with a reproducing test.

## Reference Files

Read these as you work through each phase:

| File | When to Read | Contains |
|------|-------------|----------|
| `references/exploration_patterns.md` | Phase 1 (explore) | Pattern applicability matrix, deep-dive templates, domain-knowledge questions |
| `references/defensive_patterns.md` | Step 5 (finding skeletons) | Grep patterns, how to convert findings to scenarios |
| `references/schema_mapping.md` | Step 5b (schema types) | Field mapping format, mutation validity rules |
| `references/requirements_pipeline.md` | Phase 2 (requirements) | Five-phase pipeline, versioning protocol, carry-forward rules |
| `references/constitution.md` | File 1 (QUALITY.md) | Full template with section-by-section guidance |
| `references/functional_tests.md` | File 2 (functional tests) | Test structure, anti-patterns, cross-variant strategy |
| `references/review_protocols.md` | Files 3–4 (code review, integration) | Templates for both protocols, patch validation, skip guards |
| `references/spec_audit.md` | File 5 (Council of Three) | Full audit protocol, triage process, fix execution |
| `references/iteration.md` | Iterations (after Phase 6) | Four iteration strategies: gap, unfiltered, parity, adversarial |
| `references/verification.md` | Phase 6 (verify) | Complete self-check checklist (45 benchmarks) |
