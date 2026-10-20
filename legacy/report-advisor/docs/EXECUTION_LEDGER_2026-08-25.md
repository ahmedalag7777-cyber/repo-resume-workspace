# Execution Ledger — 2026-08-25

> Living addendum to `docs/MASTER_EXECUTION_INDEX.md`. This file records the latest verified delta without pretending that static wiring is live certification.

## Current baseline

- Canonical branch: `main`.
- Master execution index exists and remains the primary roadmap/truth index.
- Quality is the canonical push/PR gate; repeated specialized production workflows are being kept manual or consolidated.
- Current `package.json` contains a large contract registry covering A0–M, K→S, document intelligence, security, import, analytics, resilience and production gates. `test:batch-decision` is the script key; its implementation file is `check-batch-decision-engine.mjs`. fileciteturn450file0

## Batch completed in this cycle

### Document Intelligence — deterministic pipeline boundary

Created:

- `services/document-intelligence/app/pipeline.py`
- `services/document-intelligence/tests/test_pipeline.py`

Commits:

- `6da7ea4575815c14fc6b4f22b7292599c5ad45c8` — pipeline boundary
- `46b54054395e35acc73ae10ba64dd48461453dc7` — initial runtime tests
- `5f354db8cc614c5d1f9e59f1b766da3efb1671d4` — fail-closed non-finite confidence fix
- `b069a4b354772565aa0ce69199e0872f817a573b` — confidence regression tests

### What was discovered

The service already had provider-neutral contracts (`DocumentParser`, `OCRProvider`, `TableExtractor`, `EntityResolver`, `ValidationEngine`, `RoutingEngine`) and a rich intermediate model, but the HTTP parser boundary was still mostly an extraction adapter. fileciteturn422file0 fileciteturn419file0

The canonical requirements explicitly require Security/Integrity → Inspection → Classification → Router → Extraction → Intermediate Model → Validation/Reconciliation → Confidence → Review/Quarantine → Canonical routing. fileciteturn423file0

The new pipeline closes part of that gap without coupling business logic to Docling/PaddleOCR.

### Implemented in the new boundary

- deterministic SHA-256 source fingerprinting;
- filename traversal/path-safety rejection;
- MIME/extension-aware inspection metadata;
- cheap-first route classification;
- explicit OCR escalation signal;
- provider-neutral parser injection;
- provider/source hash consistency check;
- lifecycle transition enforcement;
- confidence gate with `APPROVE` / `REVIEW` / `QUARANTINE`;
- fail-closed handling for NaN and ±Infinity;
- pipeline contract/version metadata.

### Regression discovered and fixed during implementation

Initial confidence implementation accepted `Infinity` after clamping it to `1.0`. This was unsafe. The implementation was immediately corrected to use `math.isfinite()` and the regression test now requires `Infinity` and `-Infinity` to quarantine.

This is intentionally recorded because it is a real correctness/security finding, not hidden as a green result.

## Quality integration

Updated `.github/workflows/quality.yml`:

- diagnostics now explicitly checks `python3 --version`;
- Quality now runs the existing Python service tests through:
  `python3 -m unittest discover -s services/document-intelligence/tests -p 'test_*.py'`.

Commit:

`855869f9c93534c3b69f9e8933059a0a83b09817`

This does **not** mean the service is production-certified; it means its local runtime contract is now connected to the canonical Quality path.

## Existing architecture verified before changing it

- `services/document-intelligence/app/contracts.py` already defines the provider-neutral interfaces and processing states. fileciteturn422file0
- `intermediate_model.py` already preserves page/table/row/cell/provenance concepts and lifecycle transitions. fileciteturn421file0
- `policy.py` already prevents downstream consumers from using unvalidated/unapproved data. fileciteturn433file0
- `main.py` already performs MIME/size checks and optional Docling parsing with fallback behavior. fileciteturn420file0
- Existing JS/TS document-intelligence hardening already covers schema discovery, Arabic separators, validation and routing safeguards. fileciteturn424file0
- Existing Quality already runs the document-intelligence contract/hardening/decision/security/file-pipeline gates. fileciteturn415file0

## Status after this batch

| Area | Status | Exact meaning |
|---|---|---|
| Document provider contracts | FOUNDATION | Exists and tested structurally |
| Intermediate representation | FOUNDATION/GATED | Exists; deeper corpus proof remains |
| Inspection/security boundary | IMPROVED/GATED | Deterministic local boundary added |
| Routing | FOUNDATION/GATED | Route selection exists; provider quality proof remains |
| Lifecycle | GATED | Transition guard tested locally |
| Confidence/quarantine | GATED | Fail-closed deterministic gate added |
| Cell/table extraction completeness | GAP | Not solved by this batch |
| Semantic mapping | FOUNDATION/GATED | Existing JS engine remains source; deeper corpus proof remains |
| Entity resolution | FOUNDATION/GATED | Existing contracts remain; precision/recall proof remains |
| Mathematical reconciliation | FOUNDATION/GATED | Existing validation remains; full document pipeline proof remains |
| Reprocessing/jobs/dead-letter | GAP/LIVE REQUIRED | Not claimed complete |
| Canonical DB routing | GAP/LIVE REQUIRED | Not claimed complete |
| Production certification | NOT CERTIFIED | Live evidence still required |

## P0/P1 implications

This batch does not close any P0 live certification blocker. It advances the P1 document-engine path by closing a concrete deterministic boundary and attaching it to Quality.

Still open:

- page/table classification;
- headerless/reverse schema discovery;
- full extraction completeness and cell lineage;
- entity precision/recall evidence;
- reconciliation corpus;
- confidence/review/quarantine UX;
- reprocessing/checkpoint/dead-letter runtime;
- golden corpus and load/security evidence;
- live tenant/storage/realtime/AI/recovery certification.

## Next exact actions

1. Audit the new pipeline against the existing JS document-intelligence path for duplicate normalization/routing logic.
2. Close page/table classification using the existing provider-neutral contracts rather than adding a second parser framework.
3. Add golden corpus cases for Arabic/English, no-header, merged/multi-table, scanned and poor-quality documents.
4. Connect extraction provenance to the existing canonical mapping/reconciliation evidence.
5. Then audit J/K/L connected runtime, not create new release gates.

## Verification policy

Static tests prove wiring and deterministic behavior only. A production claim requires current GitHub Actions success plus live environment evidence where the requirement says LIVE REQUIRED.

## Source references used in this cycle

- `docs/MASTER_EXECUTION_INDEX.md`
- `docs/DOCUMENT_INTELLIGENCE_ENGINE_REQUIREMENTS.md`
- `services/document-intelligence/app/contracts.py`
- `services/document-intelligence/app/intermediate_model.py`
- `services/document-intelligence/app/main.py`
- `services/document-intelligence/app/policy.py`
- `scripts/check-document-intelligence-contract.mjs`
- `scripts/check-document-intelligence-hardening.mjs`
- `.github/workflows/quality.yml`
- `package.json`
