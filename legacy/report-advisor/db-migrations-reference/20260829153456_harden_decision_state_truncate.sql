-- Reconstructed from the live Supabase privilege state on 2026-08-29.
-- Exact historical source was not recovered verbatim; this preserves the observed invariant.
revoke truncate on table public.decision_approvals from authenticated;
revoke truncate on table public.business_intelligence_decisions from authenticated;
revoke truncate on table public.decision_work_items from authenticated;
revoke truncate on table public.recommendation_outcomes from authenticated;
revoke truncate on table public.decision_action_receipts from authenticated;
