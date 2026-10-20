# Internal Engineering Policy

## Purpose
The product exposes capabilities, not implementation details. Internal engine selection, adapter topology, thresholds, prompts, heuristics, reconciliation strategies, and optimization policies are implementation details.

## Customer boundary
Customer-facing surfaces should describe outcomes and capabilities (for example: document analysis, data validation, forecasting, evidence, confidence) rather than naming internal engines unless disclosure is required by license or law.

## Important limitation
This is not security through obscurity. Proprietary behavior is protected by server-side execution, authorization, tenant isolation, and license compliance where applicable. Public frontend code must never contain secrets, private keys, tenant bypasses, or privileged service credentials.

## Open-source compliance
Every bundled or server-side open-source component must retain required notices and license information. Hiding a library name from the UI does not remove attribution or license obligations.

## Architecture rule
UI -> capability API -> policy/router -> adapter -> validation -> evidence -> result.
UI code must not select OCR/document/analytics engines directly.

## Truth rule
No engine result is authoritative by itself. Results enter canonical normalization, validation, reconciliation, provenance, confidence, and truth-policy gates before analytics or AI can use them.
