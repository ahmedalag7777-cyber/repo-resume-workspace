# Report-Advisor — User Guide

## 1. Purpose

Report-Advisor helps authorized business users turn operational files and business data into validated analytics, reports, evidence-backed recommendations, and governed actions.

The guiding principle is **data truth first**: the application should preserve the source meaning, tenant boundary, validation state, and evidence chain instead of presenting a convenient but unverified business value.

## 2. Typical workflow

```text
Input file / business data
        ↓
Security & file validation
        ↓
Schema discovery and mapping
        ↓
Business validation
        ↓
Authoritative tenant context
        ↓
Canonical persistence
        ↓
Reconciliation / idempotency
        ↓
KPI & analytics
        ↓
Dashboard / report / export
        ↓
Evidence & confidence
        ↓
Recommendation / governed action
```

## 3. Importing business data

1. Sign in with an authorized account.
2. Choose the supported input file or connected dataset.
3. Allow the system to inspect the schema and identify candidate columns.
4. Review the proposed mapping before execution.
5. Correct ambiguous mappings instead of accepting an unsafe interpretation.
6. Review validation errors, duplicates, conflicts, and quarantined records.
7. Approve the import only after the preview represents the intended change.
8. Let the canonical persistence path perform the write.
9. Verify the resulting reconciliation state and evidence before treating the import as successful.

### Important behavior

- An empty source field must not silently erase an existing business value unless the import semantics explicitly require that behavior.
- Duplicate inputs should be handled through the existing idempotency/reconciliation mechanisms.
- Records that cannot be safely interpreted should remain blocked or quarantined rather than being converted into invented business values.
- Tenant identity must come from the authoritative security context; users should not supply an arbitrary tenant ID to bypass authorization.

## 4. Reading reports and KPIs

When reviewing a KPI, use the displayed definition and filters as the starting point. The intended chain is:

`Definition → Source → Formula → Query → Service → Dashboard → Report → Export`

A KPI is trustworthy only when those surfaces use the same authoritative business definition and data source. Missing or unavailable business data should be represented as unavailable/unknown or blocked according to the relevant contract, not silently manufactured as a real zero.

### Recommended review routine

- Check the reporting period.
- Check active filters and tenant context.
- Inspect the source/drill-down when available.
- Compare the dashboard result with the corresponding report/export.
- Investigate warnings or missing-evidence states before making a consequential decision.

## 5. Evidence-backed recommendations

Recommendations follow the evidence chain:

`Data → Quality → Confidence → Evidence → Risk → Recommendation → Decision → Action → Outcome`

A recommendation should not be treated as a verified business fact merely because an AI or analytics component produced text. High-impact decisions require the applicable evidence, confidence, tenant, risk, and policy gates.

## 6. Onyx data

For Onyx-backed workflows, the intended pattern is:

`Onyx → canonical adaptation → reconciliation → evidence`

Conflicts or ambiguous records should be surfaced for reconciliation rather than silently replacing authoritative data.

## 7. Multi-tenant safety

Every request operates inside its authorized tenant context. Client-side filtering is not a security boundary; server/database authorization and RLS/RPC enforcement are the required protection.

Users should never attempt to change a tenant identifier in the browser or request payload to access another organization's data. Such access is expected to be rejected.

## 8. Practical scenarios

### Scenario A — Monthly sales review

Import the month's operational data, validate the mapping and reconciliation results, open the sales KPIs, inspect the reporting period and drill-down, then export the validated report for management review.

### Scenario B — Customer aging review

Load the relevant receivables data, verify the reporting date, inspect aging buckets, identify customers requiring attention, and use the evidence/drill-down to validate the underlying records before taking action.

### Scenario C — Product/inventory decision support

Review inventory and product movement data, inspect data quality and evidence, evaluate the resulting recommendation and its confidence/risk constraints, then proceed only when the required policy gates are satisfied.

### Scenario D — Import conflict resolution

If an import contains duplicates or records that disagree with the existing canonical state, review the reconciliation result and resolve the conflict through the governed workflow instead of treating the raw file as automatically authoritative.

## 9. What a successful result means

A green UI state, a generated report, or a completed import should not by itself be interpreted as production certification. Stronger evidence levels are distinct:

`Implemented → Integrated → Tested → Runtime-Evidenced → Production-Certified`

Production certification requires the relevant real environment and runtime evidence. Static code checks and local tests are valuable safeguards but do not substitute for live Supabase/production verification where that verification is required.

## 10. Safety rules for operators

- Do not use fabricated business data for testing a production decision.
- Do not bypass tenant authorization.
- Do not treat missing values as verified zeroes without an explicit business definition.
- Do not approve quarantined/invalid data merely to make a workflow green.
- Do not treat AI-generated recommendations as authoritative without their required evidence and policy gates.
- Preserve the source and reporting period when investigating discrepancies.
