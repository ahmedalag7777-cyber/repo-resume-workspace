-- Canonical tenant resolver for authenticated production access.
-- A request is tenant-scoped only when auth.uid() has a membership and, when
-- supplied, the JWT company_id agrees with that membership. Ambiguous users
-- (multiple memberships without a tenant claim) fail closed.

CREATE TABLE IF NOT EXISTS company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE company_memberships FROM anon;

DROP POLICY IF EXISTS company_memberships_self_read ON company_memberships;
CREATE POLICY company_memberships_self_read
  ON company_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_claim text := NULLIF(auth.jwt() ->> 'company_id', '');
  v_count integer;
  v_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_claim IS NOT NULL THEN
    BEGIN
      v_company := v_claim::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NULL;
    END;
    IF EXISTS (
      SELECT 1 FROM company_memberships
      WHERE user_id = v_user AND company_id = v_company AND is_active
    ) THEN
      RETURN v_company;
    END IF;
    RETURN NULL;
  END IF;

  SELECT count(*), min(company_id)
    INTO v_count, v_company
  FROM company_memberships
  WHERE user_id = v_user AND is_active;

  IF v_count = 1 THEN
    RETURN v_company;
  END IF;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon;

-- Canonical tenant policy shape: authenticated access must resolve to the
-- caller's company; no permissive USING(true) policy is allowed.
ALTER TABLE file_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_file_records_tenant ON file_records;
CREATE POLICY authenticated_file_records_tenant ON file_records
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

ALTER TABLE import_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_import_profiles_tenant ON import_profiles;
CREATE POLICY authenticated_import_profiles_tenant ON import_profiles
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

ALTER TABLE import_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_import_snapshots_tenant ON import_snapshots;
CREATE POLICY authenticated_import_snapshots_tenant ON import_snapshots
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_import_jobs_tenant ON import_jobs;
CREATE POLICY authenticated_import_jobs_tenant ON import_jobs
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

ALTER TABLE data_quality_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_data_quality_reports_tenant ON data_quality_reports;
CREATE POLICY authenticated_data_quality_reports_tenant ON data_quality_reports
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

ALTER TABLE import_job_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_import_job_rows_tenant ON import_job_rows;
CREATE POLICY authenticated_import_job_rows_tenant ON import_job_rows
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM import_jobs j
    WHERE j.id = import_job_rows.job_id
      AND j.company_id = public.current_company_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM import_jobs j
    WHERE j.id = import_job_rows.job_id
      AND j.company_id = public.current_company_id()
  ));

-- Business key invariant: one normalized SKU per company.
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_normalized_sku
  ON products(company_id, normalize_import_key(sku));
