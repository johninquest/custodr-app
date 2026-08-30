---
applyTo: "**/*.go,**/*.ts,**/*.tsx,**/*_test.go,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx"
description: "Writer ≠ Reviewer rule: code authoring sessions must never generate their own tests or reviews. Based on the AI Coding Agent Manifesto, Principle 3."
---

# Verification Separation (Writer ≠ Reviewer)

Never let the same session write the code and judge the code. Tests that only verify
what the code *does* — instead of what it *should* do — are worse than no tests: they
give false confidence. An agent testing its own output is grading its own exam.

## The Rule

1. **Authoring sessions must never generate their own tests or reviews.** If you wrote
   or modified the code in this session, you are disqualified from testing or reviewing it.
2. **Tests → `tester` agent. Reviews → `reviewer` agent.** Always invoked in a fresh
   session/context with no inherited assumptions from the authoring session.
3. **Different model is preferred when available; fresh-context different-agent is the
   minimum bar.** The `tester` and `reviewer` agents may pin a different model — respect
   that pin. The mechanism that matters most is fresh context, not the model itself.

## Tests Assert Contract Behavior, Not Observed Behavior

- Write tests against the contract (`docs/api_spec.md`, `docs/schema.md`), not against
  what the implementation happens to do.
- If a test reveals the implementation deviates from the contract, the test is *right*
  and the code is wrong — fix the code, don't weaken the test.
- If the contract itself is wrong, update the contract first (see the Fixed Loop), then
  update the test to match the corrected contract.

## Handoff Procedure

When a task includes code changes:

1. Finish the implementation in the authoring session.
2. **Stop.** Do not run `/generate-tests` or `/review-pr` in this session.
3. Tell the user to start a fresh session and invoke `/generate-tests` (via the
   `tester` agent) or `/review-pr` (via the `reviewer` agent) there.
4. If the user asks you to test/review your own work anyway, explain this rule and
   decline — point them to the handoff step above.

## Manifesto Values This Implements

- **Verification over generation** — producing code is free; knowing it's correct is not.
- **Types over tests, tests over reviews, reviews over hope** — each layer catches what
  the previous one misses.
- **AI-generated code is guilty until proven innocent** — ship nothing that hasn't
  passed a type checker, a linter, a spec test, and a hostile review.
