# Report-Advisor — Master Acceptance Matrix

This matrix is the authoritative acceptance checklist for product capabilities. A capability is not complete merely because code or a page exists.

Required chain:

`Requirement → Implementation → Persistence/Schema → Execution → Workflow/Entry Point → Runtime → Test → Evidence → End-to-End`

## Capability Acceptance Columns

| ID | Capability | Requirement | Code | Persistence | Execution | Workflow/Entry | Runtime | Tests | Evidence | E2E | Status | Gap | Priority | Dependency | Wave |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

## Workforce / Task Intelligence Acceptance

| Capability | Minimum acceptance |
|---|---|
| Recommendation → Task | Recommendation creates a linked task without losing evidence/decision lineage |
| Department assignment | Configured role/department receives the appropriate task with permissions enforced |
| Approval | Sensitive actions obey threshold/role/dual-approval rules |
| Task execution | Execution is recorded with actor/time and relevant transaction/evidence |
| Completion verification | Critical work cannot be closed without required verification evidence |
| Outcome tracking | Expected impact is compared with actual result |
| Escalation | SLA and escalation are policy-driven, auditable, and configurable |
| Notification | Context-rich notification links back to task/evidence/decision |
| Cross-department workflow | Dependencies and ownership are preserved across departments |
| Printable action pack | Printed actions match canonical live task records |

## Smart Reporting Acceptance

| Capability | Minimum acceptance |
|---|---|
| Executive report | Executive summary, health, risks, opportunities, evidence, recommendations, decisions, actions, outcomes |
| Operational reports | Role/department-specific reports for Sales, Procurement, Warehouse, Finance, Management |
| Evidence-backed report | Significant claims and recommendations have traceable evidence |
| Report snapshot | Reproducible immutable historical snapshot |
| Report diff | Explains material changes across report versions |
| Professional print | Stable pagination, readable tables, RTL/LTR, grayscale-safe meaning, headers/footers, evidence references |
| Board pack | Executive-grade multi-section report suitable for management review |

## UX Acceptance

| Capability | Minimum acceptance |
|---|---|
| Command Center | Critical decisions, risks, opportunities, approvals, overdue actions, recent changes, quality warnings |
| Personal workbench | User sees relevant tasks, deadlines, approvals, blockers, completed work |
| Evidence inspector | User can inspect evidence without losing context |
| Decision inspector | Recommendation, alternatives, evidence, trust, approval, action, outcome are connected |
| Notifications | What happened + why it matters + evidence + recommended action where applicable |
| Error states | Explain what happened, protect truth, and provide next action |
