# Phase F + G Execution Closeout

This document records the combined resilience and release-verification gates introduced for the production hardening track.

## Phase F
- Runtime closure contract checks required resilience files and migrations.
- Security invariants include tenant RLS, anonymous revoke, current-company predicates, and expiring trust certificates.
- Package gate: `test:phase-f-runtime-closure`.

## Phase G
- Release closure contract verifies quality workflow coverage, production blocker contract, and certification contract.
- Package gate: `test:phase-g-release-closure`.

## Fail-closed rule
Contracts are evidence gates, not substitutes for live infrastructure. Production certification remains blocked until live tenant, storage, realtime, backup/restore, and runtime evidence are available and pass.
