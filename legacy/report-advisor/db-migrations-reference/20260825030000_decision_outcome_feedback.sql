-- Phase C/D closure: persistent, tenant-scoped execution receipts and observed outcomes.
CREATE TABLE IF NOT EXISTS automation_execution_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  receipt_id text NOT NULL,
  action_id text NOT NULL,
  decision_fingerprint text NOT NULL,
  evidence_snapshot_id text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('accepted','blocked','running','succeeded','failed','cancelled')),
  attempt integer NOT NULL CHECK (attempt >= 1),
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  error_code text,
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, idempotency_key),
  UNIQUE(company_id, receipt_id)
);
CREATE INDEX IF NOT EXISTS idx_automation_receipts_decision ON automation_execution_receipts(company_id, decision_fingerprint, created_at DESC);

CREATE TABLE IF NOT EXISTS decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision_fingerprint text NOT NULL,
  evidence_snapshot_id text NOT NULL,
  action_id text,
  observed_at timestamptz NOT NULL,
  label text NOT NULL CHECK (label IN ('correct','incorrect','partial','unknown')),
  actual_value numeric,
  expected_value numeric,
  impact_value numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, decision_fingerprint, observed_at)
);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_quality ON decision_outcomes(company_id, decision_fingerprint, label, observed_at DESC);

ALTER TABLE automation_execution_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_outcomes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE automation_execution_receipts, decision_outcomes FROM anon;
DROP POLICY IF EXISTS authenticated_automation_receipts_tenant ON automation_execution_receipts;
CREATE POLICY authenticated_automation_receipts_tenant ON automation_execution_receipts FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_decision_outcomes_tenant ON decision_outcomes;
CREATE POLICY authenticated_decision_outcomes_tenant ON decision_outcomes FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE OR REPLACE FUNCTION public.record_decision_outcome(
  p_decision_fingerprint text,
  p_evidence_snapshot_id text,
  p_action_id text,
  p_observed_at timestamptz,
  p_label text,
  p_actual_value numeric DEFAULT NULL,
  p_expected_value numeric DEFAULT NULL,
  p_impact_value numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF public.current_company_id() IS NULL THEN RAISE EXCEPTION 'tenant context is required'; END IF;
  IF p_decision_fingerprint IS NULL OR p_decision_fingerprint = '' OR p_evidence_snapshot_id IS NULL OR p_evidence_snapshot_id = '' THEN RAISE EXCEPTION 'outcome identity is incomplete'; END IF;
  IF p_observed_at IS NULL THEN RAISE EXCEPTION 'outcome timestamp is required'; END IF;
  IF p_label NOT IN ('correct','incorrect','partial','unknown') THEN RAISE EXCEPTION 'invalid outcome label'; END IF;
  INSERT INTO decision_outcomes(company_id,decision_fingerprint,evidence_snapshot_id,action_id,observed_at,label,actual_value,expected_value,impact_value,notes)
  VALUES(public.current_company_id(),p_decision_fingerprint,p_evidence_snapshot_id,p_action_id,p_observed_at,p_label,p_actual_value,p_expected_value,p_impact_value,p_notes)
  ON CONFLICT(company_id,decision_fingerprint,observed_at) DO UPDATE SET
    label=EXCLUDED.label, actual_value=EXCLUDED.actual_value, expected_value=EXCLUDED.expected_value,
    impact_value=EXCLUDED.impact_value, notes=EXCLUDED.notes
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_decision_outcome(text,text,text,timestamptz,text,numeric,numeric,numeric,text) TO authenticated;
