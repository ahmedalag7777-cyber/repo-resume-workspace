# PARALLEL HEART + UI EXECUTION CONTRACT

## Purpose

Every executable product change must advance the canonical heart and the affected UI together whenever the surfaces are technically independent.

The product is not considered complete when backend behavior exists without a usable, proven interface, and it is not considered complete when UI exists without canonical runtime/data behavior.

## Required execution lanes

### Heart / Core
`DOMAIN → DATA → SECURITY → API → RUNTIME → PERSISTENCE → RECOVERY → AUDIT`

### UI / UX
`ROUTES → SCREENS → COMPONENTS → VISUAL HIERARCHY → RTL → RESPONSIVE → STATES → FEEDBACK`

## Definition of done for a touched UI flow

A touched executable flow must have:

`REAL DATA → REAL ACTION → LOADING → EMPTY → ERROR → RETRY → SUCCESS → READBACK → PERMISSION STATE → AUDIT / TRACE → BROWSER PROOF`

A read-only surface must be explicitly labeled `READ-ONLY`.

A surface without a canonical implementation must be explicitly labeled `NOT IMPLEMENTED` or `PLANNED`. It must not expose fake mutation controls.

## No orphan UI

Buttons, forms, tables, filters, dialogs, badges, and action cards must either:
1. call a canonical domain/runtime contract and persist/read back real state, or
2. be explicitly non-operational and labeled accordingly.

UI must never hide a backend/security failure.

## Visual consolidation

Touched surfaces use shared project primitives for:

- typography
- spacing
- grid
- radius
- controls
- tables
- filters
- badges
- dialogs
- navigation
- status semantics

The hierarchy is:

`Context → Primary State → Key Information → Primary Action → Secondary Actions → Details`

## Browser evidence

Browser proof must target the exact source SHA under test and must cover the touched flow. It must record exact HEAD, screenshots, browser findings, business findings, and network/console evidence where applicable.

`queued`, `historical PASS`, or `HTTP 200` is not proof of current-head completion.

## Fail-closed rule

Any `FAIL`, `NOT_PROVEN`, or `BLOCKED` result remains open.

A stale deployment is a runtime provenance failure (`STALE_RUNTIME` / `DEPLOYMENT_SHA_MISMATCH`), not a source defect.

## Acceptance gate

A touched feature is not `COMPLETE` until:

`FUNCTIONALITY + REAL DATA + STATES + RTL + RESPONSIVE + ACCESSIBILITY + BROWSER EVIDENCE`

are all proven for the current source head.