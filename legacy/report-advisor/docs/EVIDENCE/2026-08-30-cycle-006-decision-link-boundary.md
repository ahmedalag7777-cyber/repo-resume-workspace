# CYCLE-006 — decision/recommendation link authorization boundary

Start main SHA: `4d2e4bd2c30b5f3f6cad742e4e3f5c587becd752`

Forensic comparison with PR #92 found that `src/lib/decision-automation/vertical-slice-runtime.ts` still performed direct UPDATEs on `recommendations` and `business_intelligence_decisions` when linking them.

Live Supabase confirms `link_recommendation_to_decision(uuid,uuid)` is SECURITY DEFINER, fixed `search_path=public`, anon EXECUTE=false, authenticated EXECUTE=true, and tenant-bound through `current_company_id()`.

The runtime adapter now uses the canonical RPC only. A regression guard is wired into the existing `batch-integrity-guards` workflow and rejects both direct lifecycle UPDATE patterns.

Status: IMPLEMENTED + CI pending on this rebased exact head. Runtime and production certification remain separate.
