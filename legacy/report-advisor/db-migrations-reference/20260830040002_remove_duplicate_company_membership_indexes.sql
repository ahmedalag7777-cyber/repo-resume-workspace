-- Keep the original canonical membership indexes and remove duplicates introduced by
-- the default-membership hardening extraction. The surviving unique partial index
-- still enforces at most one active default per user.
DROP INDEX IF EXISTS public.uq_company_memberships_one_active_default;
DROP INDEX IF EXISTS public.idx_company_memberships_user_active_default;
