-- Reconstructed from live privilege state on 2026-08-29.
-- Authenticated callers may create recommendation/alert rows through their allowed
-- creation path, but lifecycle UPDATE/DELETE remains behind canonical RPCs.
revoke update, delete, truncate on table public.recommendations from authenticated;
revoke update, delete, truncate on table public.alerts from authenticated;
