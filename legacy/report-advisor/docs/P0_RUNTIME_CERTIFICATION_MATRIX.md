# Report-Advisor — P0 Runtime Certification Matrix

Snapshot: 2026-08-25

This matrix is the execution boundary between static contracts and real production certification. **Artifact presence, TypeScript success, or a green contract test is not live certification.**

## Status vocabulary

- `COMPLETE` — implementation plus applicable runtime evidence and DoD evidence exist.
- `FOUNDATION` — implementation/contracts exist but runtime proof is incomplete.
- `GATED` — a release/security gate exists but its live proof is incomplete.
- `LIVE REQUIRED` — requires real Supabase/storage/realtime/AI/backup/worker/staging execution.
- `GAP` — required capability is missing.
- `BLOCKED` — deliberately prevented by a safety or policy condition.

## P0 matrix

| Area | Current structural state | Live proof required | Certification artifact |
|---|---|---|---|
| Tenant isolation / RLS | GATED | adversarial A/B tenant reads, writes, RPC, exports, search | tenant canary report |
| Storage / signed URLs | GATED | private bucket, tenant path, expiry, revocation, traversal/malware cases | storage canary report |
| Realtime authorization | GATED | cross-tenant subscription/event isolation | realtime canary report |
| AI retrieval isolation | GATED | tenant-scoped retrieval, approved context only, provider allowlist | AI isolation canary |
| Backup / restore | FOUNDATION/GATED | real backup, restore, integrity, timing | restore drill + RPO/RTO |
| Migration / parity | GATED | clean replay, staging parity, drift detection, rollback | migration evidence |
| Artifact provenance | GATED | signed artifact verification at deployment boundary | provenance manifest |
| Worker recovery | FOUNDATION/GATED | lease expiry, heartbeat loss, retry, dead-letter, replay | worker recovery drill |
| SLO / rollback | FOUNDATION/GATED | injected failure, alert, rollback/forward-fix | incident drill |
| Security / secrets | GATED | secret scan, client exposure, provider access review | security audit |
| Stabilization telemetry | FOUNDATION/GATED | correlation IDs, queue depth, latency/error/freshness telemetry | telemetry evidence |
| Final certification | NOT LIVE CERTIFIED | all P0 rows proven and current | production certification bundle |

## Execution rule

For every row, record:

```text
Capability:
Environment:
Commit:
Test/Workflow:
Runtime start:
Runtime end:
Expected:
Observed:
Evidence artifact:
Tenant scope verified:
Security result:
Performance result:
Status:
Limitation:
Next action:
```

## Free-first policy

The project must remain usable without mandatory paid AI/API subscriptions. Local/open-source adapters are preferred. Paid providers, if ever implemented as optional adapters, must never become a silent fallback and must be disabled by default unless explicitly authorized by project policy.

The current package uses open-source/local libraries including Supabase client, Tesseract.js, PDF.js, Mammoth and XLSX; this document does not treat dependency presence as proof that a provider is free or that runtime has been certified.

## No premature certification

Do not mark a P0 row `COMPLETE` merely because:

- a workflow exists;
- a contract script exists;
- a UI exists;
- a migration exists;
- TypeScript compiles;
- a historical run was green;
- a fixture passed without the live dependency.

The master index remains authoritative and requires the chain:

`Contract → implementation → test → workflow → evidence → live dependency`

before production certification.
