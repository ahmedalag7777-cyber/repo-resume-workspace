# Report-Advisor — Persistent Reference Protocol

## Purpose
This document defines the mandatory way future execution work uses the repository as its persistent project memory. It is stored in GitHub so continuity does not depend on temporary conversation memory.

## Canonical reference hierarchy
1. `docs/MASTER_SYSTEM_INVENTORY_2026-08-25.md` — structural truth: what exists in the repository.
2. `artifacts/project-system-inventory.json` / `artifacts/PROJECT_SYSTEM_INVENTORY.md` — generated structural snapshot when `npm run inventory:system` is executed.
3. `docs/MASTER_EXECUTION_INDEX.md` — authoritative completion/requirements interpretation.
4. `docs/MASTER_EXECUTION_INDEX_CURRENT_DELTA_2026-08-25.md` — append-only current discoveries, corrections, repairs and next actions.
5. `docs/EXECUTION_LEDGER_*.md` — immutable batch history and evidence trail.
6. Source, migrations, scripts, workflows and tests — implementation truth; these override assumptions in documentation when they disagree.

## Mandatory startup procedure
Before any substantial implementation wave:
- Read the Master System Inventory.
- Read the latest Current Delta and execution ledger entries.
- Run or inspect the latest system inventory snapshot.
- Inspect the relevant source, migration, script, workflow and test surfaces.
- Check whether the proposed work is already implemented, partially implemented, gated, integrated, runtime-evidenced, or production-certified.
- Only then create or modify code.

## Mandatory completion procedure
Every execution batch must record:
- scope inspected;
- capabilities discovered as already implemented;
- actual gaps proven;
- files changed;
- tests/checks added or run;
- workflow/runtime evidence obtained;
- commit SHA(s);
- unresolved blockers;
- reclassified backlog items;
- exact next action.

The Current Delta must be updated after every material batch. The Master System Inventory must be regenerated/updated when repository structure changes materially.

## Status vocabulary
- `UNKNOWN`: not yet mapped.
- `INVENTORIED`: existence mapped, semantics not fully reviewed.
- `IMPLEMENTED`: implementation exists.
- `GATED`: automated contract/test exists.
- `INTEGRATED`: implementation is connected across required surfaces.
- `RUNTIME-EVIDENCED`: executable runtime evidence exists for the current revision.
- `PRODUCTION-CERTIFIED`: current release evidence satisfies the production certification chain.
- `BLOCKED`: progress requires an external/runtime prerequisite.

A file existing is never sufficient evidence for `INTEGRATED`, `RUNTIME-EVIDENCED`, or `PRODUCTION-CERTIFIED`.

## Required traceability chain
Every P0/P1 capability must be traceable as:

`Requirement → Implementation → Persistence/Schema → Execution Command → Workflow/UI Entry → Runtime Dependency → Evidence → Production Status`

Missing links are integration gaps until disproven.

## Anti-duplication rule
Never create a parallel implementation, migration, workflow, certification framework, checkpoint system, tenant model, or document-intelligence subsystem until repository evidence proves the existing capability cannot satisfy the requirement.

## Conflict rule
If documentation and source disagree, do not silently choose one. Record the discrepancy in the Current Delta, verify the source/configuration/runtime state, then update the authoritative documentation.

## Production rule
Do not mark a capability complete because static tests or contracts exist. Production completion requires current executable evidence, and certification requires the existing release/certification chain to pass.

## Continuity rule
The repository is the durable memory. Future agents/operators must update these references instead of relying on conversation history. Conversation context may help navigate, but it is never the authoritative project state.
