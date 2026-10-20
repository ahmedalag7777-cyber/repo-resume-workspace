# Execution Checkpoint — Arabic OCR Truthful Confidence — Batch 44 — 2026-09-07

## Finding
The existing Arabic OCR adapter produced OCR text but hard-coded every OCR block to `confidence=0.0`. The repository's existing OCR confidence contract considers confidence below `0.7` unusable. Therefore successful OCR output could not truthfully cross the usable-confidence boundary.

## Repair
1. Started an isolated branch from exact main `5b083100d463aae4a4cf22ebbbff7e1470749b1f`.
2. Updated `services/document-intelligence/app/main.py` to consume PaddleOCR `rec_scores`.
3. Uses the minimum observed recognition score as the block confidence, avoiding an optimistic average when any recognized segment is weak.
4. Rejects missing, boolean, non-finite, and out-of-range recognition scores; any invalid score fails confidence closed to `0.0` and triggers review warning.
5. Adds an explicit review warning for confidence below the existing `0.7` threshold.
6. Keeps OCR-unavailable and OCR-empty paths fail-closed.
7. Removed the unreachable duplicated fallback implementation and its no-op legacy marker.
8. Replaced the source-only runtime checker with a behavioral Python suite that stubs PaddleOCR and exercises minimum confidence, low-confidence warning, invalid/missing score handling, empty results, and execution failure.
9. Extended `.github/workflows/ocr-confidence-contract.yml` to run the behavioral suite with the existing confidence contract.
10. Opened PR #397 for review; its live head is authoritative in GitHub PR metadata.

## Review hardening
CodeRabbit identified three concrete improvements. All three were addressed:
- stale checkpoint SHA removed in favor of authoritative PR metadata;
- source-text-only runtime assertions replaced by direct behavioral tests;
- recognition-score validation made fail-closed for invalid/missing/non-finite/out-of-range values.

## CI evidence boundary
The current GitHub Actions execution anomaly persists: recent PR workflows are reported `failure` with jobs completing without assigned runner/steps. Therefore the new behavioral suite has not yet obtained a genuine GitHub Actions PASS. The repository's Vercel preview deployment is independently reported READY, but that is not OCR runtime certification.

## Evidence boundary
- This is a source/runtime correctness repair, not OCR production certification.
- No real customer document was fabricated or inserted.
- No Staging data, frozen RC, production alias, or historical migration was changed.
- Actual Arabic PDF/image extraction still requires runtime evidence from the deployed document-intelligence service.
