# Execution Checkpoint — 2026-09-07 — Report Execution Input Hardening

## Scope
Independent hardening of the in-memory report execution contract, starting from main SHA `5b083100d463aae4a4cf22ebbbff7e1470749b1f`.

## Verified defect
`assertExecutionRequest` previously checked truthiness only for report identity, tenant identity, requester identity, and idempotency key. Whitespace-only strings could therefore enter the queue as apparently valid execution identity. The optional `sourceSnapshotId` was not validated when present, and `parameters` accepted arrays because arrays are JavaScript objects.

## Repair
- Added one fail-closed `requireNonBlank` guard for execution identities.
- Validate optional `sourceSnapshotId` when supplied.
- Require `parameters` to be a non-array object.
- Apply the same non-blank tenant guard to evidence tenant assertions.

## Regression coverage
Added `scripts/report-execution-input-contract.test.mjs` covering valid acceptance, blank identities, blank source snapshot identity, array parameters, empty formats, duplicate formats, unsupported formats, null requests, matching evidence tenant, mismatched evidence tenant, and blank evidence tenant input.

## CI
Added a focused GitHub Actions workflow that executes the behavioral contract test with Node 22 and `--experimental-strip-types`.

## Safety boundary
No Staging mutation, production mutation, frozen RC mutation, migration history rewrite, or alias change. This is a focused contract hardening change and is not runtime certification.
