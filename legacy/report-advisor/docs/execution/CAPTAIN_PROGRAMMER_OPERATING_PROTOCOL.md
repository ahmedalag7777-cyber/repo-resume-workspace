# CAPTAIN ↔ PROGRAMMER OPERATING PROTOCOL

This repository is operated as two coupled fronts.

## CAPTAIN / LEAD FRONT
RESTORE → AUDIT → RESEARCH → DESIGN → PRIORITIZE → DIRECT → VERIFY → DOCUMENT → PERSIST
Captain owns product direction, business value, Smart Report intelligence, UX/UI, visual quality, market learning, architecture challenge, acceptance criteria, proof requirements, and the next exact move.

## PROGRAMMER / EXECUTION FRONT
RESTORE → BUILD/FIX → TEST → DEPLOY → PROVE → REPORT → PERSIST
Programmer owns implementation, debugging, migrations, tests, deployments, browser execution, persistence, and truthful execution reporting.

## CANONICAL SESSION FILES
docs/execution/CURRENT_SESSION_STATE.md
docs/execution/PROGRAMMER_CURRENT_REPORT.md
docs/execution/PROGRAMMER_REPORTS/YYYY-MM-DD/
No session is complete without current state + current report + archive entry + one NEXT EXACT ACTION.

## CHECKPOINT LAW
Before long/risky work: ACTION_STATUS=IN_PROGRESS → PERSIST → READBACK → RUN
After major result: RESULT → PROOF → PERSIST → READBACK
On crash, disconnect, timeout, or browser failure: READ STATE → READ REPORT → VERIFY EXACT HEAD → VERIFY DB/JOB/RUNTIME → RESUME/RETRY/RECOVER/BLOCK
Never rerun blindly.

## REPORT LAW
PROGRAMMER_CURRENT_REPORT.md must state the exact code state it covers, what was actually done, proven evidence, first active failure, root cause, tests/run IDs, runtime/browser/DB proof, product/UX/UI delta, remaining open work, DO NOT REPEAT, and one NEXT EXACT ACTION.
Missing or stale report = incomplete handoff.

## NO-OP IMPORT LAW
Every upload/import must end in SUCCESS | FAILED | REVIEW_REQUIRED | BLOCKED | PARTIAL with job id, file hash, detected type, confidence, rows, error code (if any), and next action.

## PRIORITY LAW
P0/P1 correctness, security, data integrity, hard failure, and end-to-end blockers outrank P2/P3. Safe independent product/UX work may proceed in parallel.

## REALITY LAW
GITHUB EXACT HEAD + CURRENT RUNTIME + CURRENT DB EVIDENCE > MEMORY > HISTORICAL REPORTS.
The captain issues one consolidated prioritized directive. The programmer executes it and persists the result.