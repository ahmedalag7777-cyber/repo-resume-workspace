# O2 LIVE BROWSER — TENANT A/B EVIDENCE

## Boundary
- Environment: Staging URL `https://report-advisor-en8yr94br-injaz2.vercel.app`
- Exact deployed HEAD reported by owner: `df1e9093642ea59469170d52d27ac9f6343a0b0f`
- Evidence class: owner-captured live browser evidence; credentials/session tokens intentionally excluded.

## Tenant mapping
- Tenant A company: `f68a7e91-3c7e-46fb-97a8-e339bec04e13`
- Tenant B company: `7e57b119-1f76-41a3-bd53-78cdcab60543`

## Live browser observations
### Tenant A
- Authenticated login succeeded.
- Customers visible: 2.
- Products visible: 3.
- Inventory visible: `Golden Product Alpha / GOLDEN-A-P01`.
- Dashboard/Receivables matched Tenant A data.
- No Tenant B data observed.

### Tenant B
- Logout from A followed by authenticated login to B succeeded.
- Customer observed: `E2E Customer 1 / E2E-401117-C1`.
- Product observed: `E2E Product 1 / E2E-401117-P1`.
- Invoice observed: `E2E-401117-1`.
- No inventory observed.
- Tenant A identifiers `GOLDEN-A-C01`, `GOLDEN-A-P01`, and `GOLDEN-A-P02` were not observed.

## Supporting database/runtime contract audit
The live database currently enforces tenant context on sensitive export and SECURITY DEFINER paths:
- Sales/Purchase/Inventory/Receivables export RPCs reject a supplied company ID different from `current_company_id()` with `TENANT_CONTEXT_MISMATCH`.
- `mark_alert_read` updates only alerts belonging to the current company and rejects missing/foreign objects.
- `link_recommendation_to_decision` requires both recommendation and decision to belong to the current company.
- `update_recommendation_status` requires the recommendation to belong to the current company.
- These functions have no anonymous EXECUTE grant; `update_recommendation_status` also has no authenticated EXECUTE grant, while the other audited RPCs are authenticated-only as applicable.

## Storage / Realtime
- Live Storage buckets: 0.
- Live Storage policies: 4.
- Live Realtime publication application tables: 0.
- Therefore there is no live bucket/channel surface to certify through browser runtime at this boundary; no speculative bucket or publication entry was created.

## Certification disposition
This evidence materially closes the browser login/own-data portion of O2 at the reported `df1e909...` deployment boundary. It does NOT by itself close the complete O2 gate because a reproducible authenticated A→B/B→A adversarial denial was not captured as a browser action/result, and the repository has subsequently advanced four commits to `bd49dd3fbf9629f4725b161f77e0675b24ba410d`. Those commits modify the execution-enforcement verifier/test only, but the exact deployed current-candidate browser boundary has not been re-established. O2 therefore remains PARTIAL / NOT CERTIFIED.

No passwords, access tokens, refresh tokens, cookies, or other secrets are recorded here.
