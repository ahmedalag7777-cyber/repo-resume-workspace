-- Enforce the invariant relied upon by public.current_company_id():
-- at most one active default company membership may exist per user.
-- Existing data was checked before this migration; no duplicate active defaults exist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_memberships_one_active_default
  ON public.company_memberships (user_id)
  WHERE is_active = true AND is_default = true;

CREATE INDEX IF NOT EXISTS idx_company_memberships_user_active_default
  ON public.company_memberships (user_id, is_active, is_default);
