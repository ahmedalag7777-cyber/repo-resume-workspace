# Phase K → L → M execution contract

## Phase K — Production Intelligence & Autonomous Optimization
Status: implemented foundation and release-gated runtime primitives.

Acceptance:
- durable watched-report execution jobs with lease/checkpoint/dead-letter state;
- source-version lineage and content-hash identity;
- canonical-text artifact provenance;
- row-level new/changed/unchanged/deleted lineage;
- chronological consolidation with deterministic precedence;
- bounded scenario selection respecting risk, protected liquidity and service level;
- portfolio ranking and materiality escalation;
- closed-loop confidence calibration from observed outcomes;
- autonomy gate requiring continuous trust, evidence, confidence, risk budget, no critical drift, rollback and tenant isolation.

## Phase L — Production Autonomy & Decision Cockpit
Next implementation sequence:
1. Connect durable execution jobs to the browser watched-folder coordinator and existing governed import commit path.
2. Persist checkpoints and evidence at every extraction/import/decision boundary.
3. Populate business snapshots from authoritative sales, demand, inventory, liquidity and operations outputs.
4. Materialize KPI lineage and causal/evidence graph edges from actual report executions.
5. Expose portfolio prioritization, materiality escalation and bounded scenarios in the executive cockpit.
6. Add tenant-scoped drift detection for data, forecast, policy and outcome changes.
7. Enable domain autonomy only after the Phase K gate passes for that domain.

## Phase M — Production Certification & Rollback Assurance
Following Phase L:
1. Run adversarial tenant-isolation and authorization certification.
2. Run storage, realtime, AI-retrieval and billing-liveness canaries.
3. Verify migration reproducibility and environment parity.
4. Execute signed artifact and release-evidence verification.
5. Execute backup/restore, stuck-worker/dead-letter, rollback and forward-fix drills.
6. Verify autonomy disablement and deterministic rollback per domain.
7. Produce the final production certification bundle; any failed blocker keeps autonomy disabled.

## Permanent safety rules
- Deterministic engines are authoritative for numeric truth; AI remains advisory and evidence-bound.
- No cross-tenant access, no raw-file access from analytics layers, and no review/quarantine bypass.
- No automation without explicit approval/evidence and valid risk budget.
- Protected liquidity and service-level constraints are hard blockers.
- No silent field loss, fabricated extraction, source collision or reconciliation mismatch.
- Every source version, row change, recommendation, KPI and autonomy decision must remain traceable.
