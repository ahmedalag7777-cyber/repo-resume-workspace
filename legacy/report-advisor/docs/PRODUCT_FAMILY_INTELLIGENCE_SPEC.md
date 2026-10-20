# Product Family Intelligence Specification

## Purpose
Product Family is a normalized commercial classification layer between exact ERP SKU identity and merchant-controlled Commercial Equivalence Groups (CEG). It groups related SKUs for family analytics without granting substitution rights.

## Universal rule
The mechanism applies to every product family discovered from merchant data. Examples such as flour sizes, rice sizes, pulses weights and oil volumes are fixtures only; no product name or size is hard-coded as a privileged case.

## Four-layer model
1. SKU/ERP Item: immutable business identity for accounting, stock, cost, price, supplier and traceability.
2. Product Family: normalized product type + pack/size/unit and optional structured attributes.
3. CEG: explicit merchant-approved commercial coverage/substitution relationship.
4. Category/Department: broader organization taxonomy.

Family membership never means substitution. A family can contain several independent CEGs.

## Discovery pipeline
Use deterministic normalization before statistical/AI assistance:
- Unicode normalization.
- Arabic and Latin digit normalization.
- whitespace, punctuation and Arabic tatweel normalization.
- Arabic/English unit aliases.
- quantity/size extraction.
- product-type extraction.
- pack/form/variant/quality/brand preservation.
- merchant catalog naming patterns.
- sales/customer/substitution behavior only as supporting evidence.

Automatic output is a suggestion with confidence and evidence. Ambiguous/conflicting proposals are never silently activated for critical decisions.

## Governance states
- suggested: machine proposal only.
- approved: merchant accepted; governed analytics may use it.
- locked: merchant explicitly prevents automatic reassignment.
- rejected decisions should be retained as tenant-scoped negative knowledge so identical bad suggestions are suppressed unless new evidence materially changes the case.

## Merchant control
The Family Manager must support search, filters, multi-select SKU assignment, create/rename/merge/split/move/remove, approval/rejection, lock/unlock, effective dates, base unit, conversion rules, notes and audit history. Before bulk changes, show impact preview: affected SKUs, historical metrics, CEG relationships and derived decisions.

## Identity and safety
Do not infer that a numeric token such as "20" means a specific unit without evidence. Do not group products only because a word or size matches. Preserve brand, quality and variant attributes so merchants can separate commercially distinct products.

## Versioning
Family definitions are effective-dated and versioned. Historical source rows are never rewritten. Derived metrics are recalculated only for affected scopes. Every change records actor, timestamp, old/new membership, reason, mapping version and recalculation status. Rollback must restore the previous mapping version.

## Tenant learning
Merchant corrections may improve future suggestions only within the same tenant and matching profile/context. No merchant-specific naming knowledge crosses tenant boundaries.

## Integration
Approved families feed descriptive family analytics: movement, stock, velocity, seasonality, customer reach, inventory age and liquidity contribution. CEG alone controls substitution/coverage pooling. Family and CEG results must remain drillable to SKU and source evidence.

## Acceptance criteria
- Every eligible SKU can be classified or explicitly marked unresolved.
- Suggestions expose confidence and evidence.
- Manual multi-select overrides automatic proposals.
- Locked mappings cannot be changed by automatic discovery.
- Family membership never silently creates substitution.
- Unit normalization and conversion are deterministic and validated.
- Historical mappings are reproducible.
- No cross-tenant learned mapping leakage.
- Family aggregates reconcile exactly to their member SKUs.
