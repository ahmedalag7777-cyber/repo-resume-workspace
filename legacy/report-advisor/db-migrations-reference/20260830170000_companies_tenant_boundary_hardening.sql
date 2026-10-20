-- Phase 2 security closure: companies is tenant metadata, not a client-writable table.
-- The browser may read only its authoritative company row. Lifecycle mutations remain
-- server-side/RPC/service-role responsibilities and are deliberately not exposed to clients.

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.companies FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.companies FROM authenticated;
GRANT SELECT ON TABLE public.companies TO authenticated;

DROP POLICY IF EXISTS companies_select_current_tenant ON public.companies;
CREATE POLICY companies_select_current_tenant
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_memberships AS membership
      WHERE membership.company_id = companies.id
        AND membership.user_id = auth.uid()
    )
  );

-- Defense-in-depth: no anonymous policy and no client mutation policy is created.
