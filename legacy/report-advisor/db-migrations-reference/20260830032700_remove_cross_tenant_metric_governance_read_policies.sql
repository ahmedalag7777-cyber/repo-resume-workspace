-- Security correction: the original governance migration left broad authenticated
-- SELECT policies alongside tenant-scoped policies. Because policies are permissive
-- by default, the broad `USING (true)` policy could expose another tenant's metrics.
DROP POLICY IF EXISTS metric_governance_authenticated_read ON public.metric_governance;
DROP POLICY IF EXISTS metric_governance_audit_authenticated_read ON public.metric_governance_audit;

-- Re-state the intended fail-closed tenant boundary explicitly.
DROP POLICY IF EXISTS metric_governance_authenticated_tenant_read ON public.metric_governance;
CREATE POLICY metric_governance_authenticated_tenant_read
  ON public.metric_governance
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS metric_governance_audit_authenticated_tenant_read ON public.metric_governance_audit;
CREATE POLICY metric_governance_audit_authenticated_tenant_read
  ON public.metric_governance_audit
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
