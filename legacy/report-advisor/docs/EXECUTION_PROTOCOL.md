# Execution Protocol — Mandatory Launch Reference

## Trigger
Whenever the user sends exactly `1` as a continuation command, this document is a mandatory execution reference.

## Required behavior
1. Read this protocol and the latest execution state before acting.
2. Inspect the current repository state; do not rely on stale checkpoints.
3. Execute the largest safe batch possible, in parallel across independent fronts.
4. Do not rebuild completed work.
5. Do not reopen closed findings without new evidence.
6. Distinguish implementation, CI evidence, runtime evidence, and production certification.
7. Never claim an operational result that was not actually executed and evidenced.
8. Preserve release integrity: do not mutate frozen/release candidates or production aliases without a justified, verified need.
9. Convert every real finding into the smallest forward-only fix and evidence.
10. Continue independently runnable fronts instead of waiting on an unrelated external blocker.
11. Prefer real repository/CI/runtime actions over explanatory reporting.
12. At the end of each launch, record concrete completed work, remaining blockers, and the next parallel execution wave.

## User's execution expectation
The user's `1` means: continue from the latest state, autonomously, aggressively, in parallel, with no unnecessary questions, maximizing real progress while preserving correctness and release integrity.

## Definition of success
Success is measured by verified code changes, passing CI, executable runtime workflows, security/data truth, and certifiable evidence—not by message length or estimated percentages.
