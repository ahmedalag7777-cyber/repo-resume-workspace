-- Phase A: durable report execution queue, immutable evidence and delivery receipts.
CREATE TABLE IF NOT EXISTS report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_id uuid,
  requested_by uuid,
  idempotency_key text NOT NULL,
  request_fingerprint text NOT NULL,
  source_snapshot_id uuid,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  worker_id text,
  lease_expires_at timestamptz,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  formats jsonb NOT NULL DEFAULT '[]'::jsonb,
  input_fingerprint text NOT NULL,
  engine_version text NOT NULL DEFAULT 'report-engine/1',
  row_count integer NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_report_runs_queue ON report_runs(company_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_report_runs_company ON report_runs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_runs_lease ON report_runs(company_id, status, lease_expires_at);

CREATE TABLE IF NOT EXISTS report_run_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES report_runs(id) ON DELETE CASCADE, format text NOT NULL CHECK (format IN ('web','pdf','xlsx')),
  storage_ref text NOT NULL, mime_type text NOT NULL, content_hash text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(run_id, format)
);
CREATE TABLE IF NOT EXISTS report_run_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES report_runs(id) ON DELETE CASCADE, status text NOT NULL, source_snapshot_id uuid,
  input_fingerprint text NOT NULL, row_count integer NOT NULL DEFAULT 0, output_formats jsonb NOT NULL DEFAULT '[]'::jsonb,
  artifact_refs jsonb NOT NULL DEFAULT '[]'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS report_delivery_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES report_runs(id) ON DELETE CASCADE, channel text NOT NULL, destination text,
  status text NOT NULL CHECK (status IN ('pending','delivered','failed','skipped')), provider_message_id text,
  error_message text, delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_run_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_run_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_delivery_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_report_runs_tenant ON report_runs;
CREATE POLICY authenticated_report_runs_tenant ON report_runs FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_report_run_artifacts_tenant ON report_run_artifacts;
CREATE POLICY authenticated_report_run_artifacts_tenant ON report_run_artifacts FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_report_run_evidence_tenant ON report_run_evidence;
CREATE POLICY authenticated_report_run_evidence_tenant ON report_run_evidence FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_report_delivery_receipts_tenant ON report_delivery_receipts;
CREATE POLICY authenticated_report_delivery_receipts_tenant ON report_delivery_receipts FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
REVOKE ALL ON TABLE report_runs, report_run_artifacts, report_run_evidence, report_delivery_receipts FROM anon;

CREATE OR REPLACE FUNCTION public.queue_report_run(p_company_id uuid,p_report_id uuid,p_requested_by uuid,p_idempotency_key text,p_request_fingerprint text,p_source_snapshot_id uuid,p_parameters jsonb,p_formats jsonb,p_input_fingerprint text,p_max_attempts integer DEFAULT 3)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_company uuid := public.current_company_id();
BEGIN
  IF v_company IS NULL OR p_company_id IS NULL OR p_company_id <> v_company THEN RAISE EXCEPTION 'tenant context mismatch'; END IF;
  IF p_idempotency_key IS NULL OR p_idempotency_key = '' THEN RAISE EXCEPTION 'idempotency key is required'; END IF;
  INSERT INTO report_runs(company_id,report_id,requested_by,idempotency_key,request_fingerprint,source_snapshot_id,parameters,formats,input_fingerprint,max_attempts)
  VALUES(v_company,p_report_id,p_requested_by,p_idempotency_key,p_request_fingerprint,p_source_snapshot_id,coalesce(p_parameters,'{}'),coalesce(p_formats,'[]'),p_input_fingerprint,greatest(1,p_max_attempts))
  ON CONFLICT(company_id,idempotency_key) DO UPDATE SET updated_at=now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_report_run(p_worker_id text,p_lease_seconds integer DEFAULT 120)
RETURNS SETOF report_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.current_company_id() IS NULL THEN RAISE EXCEPTION 'tenant context is required'; END IF;
  RETURN QUERY WITH candidate AS (
    SELECT id FROM report_runs WHERE company_id=public.current_company_id() AND (status='queued' OR (status='running' AND lease_expires_at < now()))
    AND attempts < max_attempts ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
  ) UPDATE report_runs r SET status='running',attempts=r.attempts+1,worker_id=p_worker_id,
    lease_expires_at=now()+make_interval(secs=>greatest(10,p_lease_seconds)),started_at=coalesce(r.started_at,now()),updated_at=now()
  FROM candidate c WHERE r.id=c.id RETURNING r.*;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_report_run(p_run_id uuid,p_worker_id text,p_status text,p_error_code text DEFAULT NULL,p_error_message text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_status NOT IN ('running','succeeded','failed','cancelled') THEN RAISE EXCEPTION 'invalid report run status'; END IF;
  UPDATE report_runs SET status=p_status,error_code=p_error_code,error_message=p_error_message,lease_expires_at=NULL,worker_id=NULL,
    completed_at=CASE WHEN p_status IN ('succeeded','failed','cancelled') THEN now() ELSE completed_at END,updated_at=now()
  WHERE id=p_run_id AND company_id=public.current_company_id() AND worker_id=p_worker_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'run not found, wrong tenant, or lease not owned'; END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.queue_report_run(uuid,uuid,uuid,text,text,uuid,jsonb,jsonb,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_report_run(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_report_run(uuid,text,text,text,text) TO authenticated;
