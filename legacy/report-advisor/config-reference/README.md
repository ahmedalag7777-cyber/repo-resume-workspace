# Report-Advisor

Report-Advisor is a tenant-safe, evidence-first document and business intelligence application for turning business files and operational data into trusted analysis, reports, recommendations, and governed decisions.

## What the project does

Report-Advisor is designed around a complete data-to-decision flow:

`File/Data → Security & Validation → Canonical Mapping → Persistence → Reconciliation → Analytics/KPIs → Reports/Exports → Evidence → Recommendations → Governed Actions`

The application is intended for business teams that need reliable reporting from spreadsheets, documents, operational datasets, and connected business sources while preserving tenant isolation, provenance, and evidence.

### Core capabilities

- **Document & data intelligence:** discover schemas, map fields, normalize values, validate records, and reconcile entities.
- **Governed imports:** preview and validate data before persistence, with canonical routing and controlled transactional writes.
- **Business analytics:** KPI calculation, trends, customer/product analysis, aging, and other decision-support views.
- **Evidence-first reporting:** important results should retain their source, calculation context, and validation status rather than silently inventing missing values.
- **Decision intelligence:** recommendations are governed by evidence, confidence, risk, and policy gates.
- **Tenant safety:** tenant context is authoritative and cross-tenant access is prohibited by design.
- **Onyx integration:** canonical adaptation and reconciliation support for Onyx-based business data flows.

## Quick start for users

1. Sign in to the application with an authorized account.
2. Select or upload the business data you are permitted to process.
3. Review detected columns, mappings, validation results, and any quarantined records.
4. Confirm the import only after the preview and validation are acceptable.
5. Open the analytics/reporting views to inspect KPIs and trends.
6. Drill down from a result to its underlying business records where supported.
7. Export the report when the displayed result has passed its validation/evidence requirements.
8. Treat recommendations as governed decision support: actions that require stronger evidence or policy approval remain blocked until those requirements are satisfied.

For the detailed workflow, see [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

## Practical use cases

### 1. Excel business-data import

A user receives an Excel export from an operational system. Report-Advisor detects and maps the relevant columns, validates values, previews the changes, and routes approved records through the canonical persistence path instead of silently overwriting unrelated data.

### 2. KPI and management reporting

A manager needs sales, customer, product, or aging indicators. The report should use the same authoritative source and calculation definition across the KPI service, dashboard, report, and export so that the same question produces the same answer.

### 3. Data-quality and reconciliation review

An import contains duplicate, changed, deleted, or conflicting records. The system identifies the reconciliation state and keeps uncertain records from being treated as silently successful business data.

### 4. Evidence-backed recommendations

A decision-support workflow identifies a business opportunity or risk. The recommendation is tied to evidence and confidence and is subject to the applicable policy/risk gates before any governed action can proceed.

### 5. Multi-tenant business operation

Multiple organizations use the same application infrastructure. Tenant context must come from the authoritative security context, while database/RPC enforcement prevents one tenant from reading or modifying another tenant's data.

## Safety principles

- No silent source-field loss.
- No cross-tenant data access.
- No high-impact automation without explicit evidence and policy gates.
- No transaction commit from review/quarantine state.
- No replenishment recommendation that violates protected liquidity.
- No hidden fixed demand horizon; horizons are explicit runtime/report inputs.
- Missing business data must not be disguised as fabricated business values.

## Development and execution status

The A0 Document & Data Intelligence Engine is complete at the contract/gate level, including schema discovery hardening, entity reconciliation, review/quarantine, governed transactional routing, Onyx canonical adaptation, and golden-dataset quality gates. Downstream execution continues toward trusted report execution, entitlements, decision automation, advanced intelligence, and production SaaS certification.

For the current implementation inventory and execution state, see the documents under [`docs/`](docs/).
