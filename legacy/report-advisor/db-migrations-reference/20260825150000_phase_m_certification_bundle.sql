-- Phase M certification foundation: immutable release evidence and drill outcomes.
CREATE TABLE IF NOT EXISTS production_certification_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bundle_key text NOT NULL,
  release_ref text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','blocked','passed','failed')) DEFAULT 'draft',
  tenant_isolation_passed boolean NOT NULL DEFAULT false,
  storage_passed boolean NOT NULL DEFAULT false,
  realtime_passed boolean NOT NULL DEFAULT false,
  ai_isolation_passed boolean NOT NULL DEFAULT false,
  backup_restore_passed boolean NOT NULL DEFAULT false,
  migration_parity_passed boolean NOT NULL DEFAULT false,
  artifact_integrity_passed boolean NOT NULL DEFAULT false,
  rollback_passed boolean NOT NULL DEFAULT false,
  security_audit_passed boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  certified_at timestamptz,
  UNIQUE(company_id,bundle_key)
);
CREATE TABLE IF NOT EXISTS production_rollback_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  drill_key text NOT NULL,
  release_ref text NOT NULL,
  target text NOT NULL,
  status text NOT NULL CHECK (status IN ('planned','running','passed','failed','blocked')) DEFAULT 'planned',
  pre_state_hash text,
  rollback_state_hash text,
  forward_fix_verified boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE(company_id,drill_key)
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['production_certification_bundles','production_rollback_drills'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_tenant ON %I FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id())', t, t);
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.can_release_production_certification(p_bundle_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM production_certification_bundles b
    WHERE b.company_id=public.current_company_id() AND b.bundle_key=p_bundle_key AND b.status='passed'
      AND b.tenant_isolation_passed AND b.storage_passed AND b.realtime_passed AND b.ai_isolation_passed
      AND b.backup_restore_passed AND b.migration_parity_passed AND b.artifact_integrity_passed
      AND b.rollback_passed AND b.security_audit_passed
  ) AND public.is_continuous_trust_healthy('production')
    AND NOT EXISTS (SELECT 1 FROM control_plane_drift_events d WHERE d.company_id=public.current_company_id() AND d.severity='critical' AND d.status IN ('open','blocked'));
$$;
GRANT EXECUTE ON FUNCTION public.can_release_production_certification(text) TO authenticated;
