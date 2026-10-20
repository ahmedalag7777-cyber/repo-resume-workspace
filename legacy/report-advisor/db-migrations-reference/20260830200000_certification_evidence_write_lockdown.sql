-- Certification evidence is release-control data, not tenant-editable business data.
-- Authenticated users may read their tenant's evidence, but cannot manufacture or
-- mutate release/rollback proof through direct table DML. Trusted automation
-- (service_role/owner) remains able to persist evidence.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.production_certification_bundles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.production_rollback_drills FROM authenticated;

DROP POLICY IF EXISTS production_certification_bundles_tenant ON public.production_certification_bundles;
CREATE POLICY production_certification_bundles_tenant_read
  ON public.production_certification_bundles
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS production_rollback_drills_tenant ON public.production_rollback_drills;
CREATE POLICY production_rollback_drills_tenant_read
  ON public.production_rollback_drills
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

COMMENT ON TABLE public.production_certification_bundles IS
  'Release-control evidence. Authenticated clients are read-only; trusted automation persists certification evidence.';
COMMENT ON TABLE public.production_rollback_drills IS
  'Release-control recovery evidence. Authenticated clients are read-only; trusted automation persists drill evidence.';
