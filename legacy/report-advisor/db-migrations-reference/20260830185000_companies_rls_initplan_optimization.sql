-- Performance hardening: evaluate auth.uid() once per statement instead of once per row.
-- Authorization semantics are unchanged; membership remains the sole tenant predicate.

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
        AND membership.user_id = (SELECT auth.uid())
    )
  );
