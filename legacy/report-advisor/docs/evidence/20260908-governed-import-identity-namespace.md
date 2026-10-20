# Governed Import Identity Namespace Closure — 2026-09-08

## Scope
Closed a server-side edge case in `import_commit_batch_governed` for mixed customer identity modes.

## Root cause
Customers use deterministic identity `code → name fallback`. The governed batch duplicate guard previously stored only the normalized key. Therefore a coded customer with code `ABC` and an uncoded customer named `ABC` could be treated as the same in-batch identity even though they use different identity modes.

## Implemented
- Added `v_identity_namespace` to the governed RPC.
- Customer code keys use `customer_code:<normalized-key>`.
- Customer name-fallback keys use `customer_name:<normalized-key>`.
- Products and sales invoices retain their deterministic key namespace.
- Tenant equality, `SECURITY INVOKER`, batch size, non-new resolution blocking, write authorization, DB duplicate check, and lineage delegation remain intact.
- Anonymous EXECUTE remains revoked; authenticated EXECUTE remains granted.

## Staging evidence
Migration `import_governed_identity_namespace` applied successfully to Staging project `fnqbvfuwbdpwvhcgzksl`.

Direct inspection confirms:
- `import_commit_batch_governed(uuid,text,jsonb,jsonb,jsonb,text)` exists.
- `SECURITY INVOKER` (`prosecdef=false`).
- `anon EXECUTE=false`.
- `authenticated EXECUTE=true`.
- Function definition contains `v_identity_namespace` and the customer namespace branches.

## Boundary
This is a server-side governance hardening result. It is not an authenticated browser E2E PASS and does not certify Production.

Frozen RC / Production aliases were not modified.
