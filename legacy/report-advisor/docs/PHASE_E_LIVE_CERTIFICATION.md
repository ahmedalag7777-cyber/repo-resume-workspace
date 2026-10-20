# Phase E — Production SaaS Certification

## Objective
Convert the existing deep certification foundation into evidence-backed live certification without weakening fail-closed behavior.

## Live probes
1. Anonymous lockdown: unauthenticated REST access to tenant data must be denied.
2. Tenant isolation: authenticated tenant A must not read tenant B and vice versa.
3. Own-tenant access: an authenticated identity must only receive rows belonging to its resolved tenant.
4. Storage isolation: a tenant must not retrieve another tenant's protected object; its own protected object must remain accessible.
5. AI retrieval isolation: a tenant-scoped retrieval request must not expose another tenant's evidence.

## Required certification variables
- `CERT_TARGET_ENV`
- `CERT_SUPABASE_URL`
- `CERT_SUPABASE_ANON_KEY`
- `CERT_TENANT_A_ID`
- `CERT_TENANT_B_ID`
- `CERT_USER_A_JWT`
- `CERT_USER_B_JWT`

Storage probes additionally require `CERT_STORAGE_BUCKET`, `CERT_STORAGE_OBJECT_A`, and `CERT_STORAGE_OBJECT_B`. AI retrieval requires `CERT_AI_RETRIEVAL_ENDPOINT`.

## Safety
The runner fails closed on missing configuration, non-HTTPS targets, identical certification tenants, unauthorized production execution, probe failures, or runtime errors. A local contract PASS is never treated as live certification.

## Completion gate
Phase E may only be marked LIVE CERTIFIED after all required live probes pass against a dedicated isolated certification target and their evidence is retained with the release record. Until then, production autonomy remains disabled.
