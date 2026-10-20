# Execution report — 2026-10-12 — Universal file analysis acceptance

- Repository: Report-Engainall/Report-Advisor
- PR #912: open, not merged
- Exact source/workflow checkpoint: https://github.com/Report-Engainall/Report-Advisor/commit/39b9e4778f115b473243c456c25d14c2ef42f45e
- Product complete: NO
- Updated: 2026-10-12T17:40:23.077Z

## Scope

The product must analyse any file format it supports. The 48 archetypes are optional specialist profiles, not a closed list of report types accepted by the product.

## Changes

- Full Product Browser E2E still requires an exact-head authenticated Chromium path and business/smart-report journey.
- The 48 real-source specialist matrix still runs and produces PASS or NOT_PROVEN evidence, but is no longer an acceptance prerequisite for generic file analysis. Its step uses an explicitly scoped diagnostic mode plus continue-on-error; real failures/undercoverage remain visible in logs and artifacts rather than being falsely counted as coverage.
- The universal fail-closed gate checks the browser route result and business/report result only. It still rejects missing result files, exact-head drift, non-PASS statuses, or blocked browser findings.
- The browser workflow explicitly runs the generic format test and the source-matrix/workflow separation contract.
- The generic-file regression builds an unfamiliar CSV dataset that has no applicable archetype and asserts the universal report still returns source-derived generic signal/finding/recommendation/summary.
- Matrix diagnostic mode does not lower strict specialty thresholds. Without REAL_SOURCE_MATRIX_DIAGNOSTIC_ONLY=1, the 48-profile script retains its existing nonzero exit when not all archetypes are supported.

## Evidence boundary

On predecessor head 79a34bc8ec78c45bf3de9ce30915fcb2f723475a, Build, Quality, Handoff, Phase-F, Certification, authenticated browser route proof and the smart-report business journey passed. The 48-profile matrix returned NOT_PROVEN at 18/48, causing the previous combined gate to fail: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282981740. That result is a specialty coverage limitation, not proof that the generic engine failed. New code head 39b9e4778f115b473243c456c25d14c2ef42f45e requires fresh exact-head CI; no PASS is transferred.

Production remains at the previously verified SHA 858ef8e3e5bc5bf74430555eadfb9e6767be348b until a fresh deployment and live verification proves otherwise.

## Next action

Promote this documented checkpoint to PR #912. Verify current-head generic format regression, exact-head browser/report journey and release gates. Keep specialty coverage observable but separate from generic file acceptance.
