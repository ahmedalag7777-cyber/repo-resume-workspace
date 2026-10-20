-- W2.1 runtime vertical slice: extend canonical recommendation/decision entities
-- with durable approval/action state and reuse alerts for notifications and
-- recommendation_outcomes for outcome/learning persistence. No duplicate
-- recommendation or decision entity is introduced.

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS decision_id uuid REFERENCES public.business_intelligence_decisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_snapshot_id uuid,
  ADD COLUMN IF NOT EXISTS metric_versions jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.business_intelligence_decisions
  ADD COLUMN IF NOT EXISTS recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE TABLE IF NOT EXISTS public.decision_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES public.business_intelligence_decisions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')) DEFAULT 'PENDING',
  requested_by uuid,
  decided_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  reason text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, decision_id)
);

CREATE TABLE IF NOT EXISTS public.decision_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES public.business_intelligence_decisions(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL,
  department text NOT NULL,
  assignee_id uuid,
  assignee_label text,
  title text NOT NULL,
  description text,
  priority text NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')) DEFAULT 'MEDIUM',
  status text NOT NULL CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETED','BLOCKED','CANCELLED')) DEFAULT 'OPEN',
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_impact numeric,
  actual_impact numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, decision_id, title)
);

CREATE TABLE IF NOT EXISTS public.decision_action_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_item_id uuid NOT NULL REFERENCES public.decision_work_items(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACCEPTED','RUNNING','SUCCEEDED','FAILED','BLOCKED','CANCELLED')),
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  evidence_snapshot_id uuid,
  decision_fingerprint text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error_code text,
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_decision_approvals_tenant_status
  ON public.decision_approvals(company_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_work_items_tenant_status
  ON public.decision_work_items(company_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_decision_work_items_decision
  ON public.decision_work_items(company_id, decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_action_receipts_work_item
  ON public.decision_action_receipts(company_id, work_item_id, started_at DESC);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['recommendations','business_intelligence_decisions','decision_approvals','decision_work_items','decision_action_receipts'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_tenant ON public.%I FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id())', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.request_decision_approval(p_decision_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid := public.current_company_id(); v_id uuid;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_intelligence_decisions d WHERE d.id=p_decision_id AND d.company_id=v_company AND d.status='PROPOSED') THEN
    RAISE EXCEPTION 'DECISION_NOT_APPROVABLE';
  END IF;
  INSERT INTO public.decision_approvals(company_id,decision_id,status,reason)
  VALUES(v_company,p_decision_id,'PENDING',p_reason)
  ON CONFLICT(company_id,decision_id) DO UPDATE SET status='PENDING', reason=EXCLUDED.reason, requested_at=now(), decided_at=NULL, decided_by=NULL
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_approval(p_approval_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid := public.current_company_id(); v_decision uuid; v_status text;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT decision_id,status INTO v_decision,v_status FROM public.decision_approvals WHERE id=p_approval_id AND company_id=v_company FOR UPDATE;
  IF v_decision IS NULL OR v_status <> 'PENDING' THEN RAISE EXCEPTION 'APPROVAL_NOT_PENDING'; END IF;
  UPDATE public.decision_approvals
    SET status=CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
        decided_at=now(), reason=p_reason
    WHERE id=p_approval_id AND company_id=v_company;
  UPDATE public.business_intelligence_decisions
    SET status=CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
        approved_at=CASE WHEN p_approve THEN now() ELSE NULL END,
        rejection_reason=CASE WHEN p_approve THEN NULL ELSE p_reason END
    WHERE id=v_decision AND company_id=v_company;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_decision_work_item(p_work_item_id uuid, p_actual_impact numeric, p_evidence jsonb DEFAULT '{}'::jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid := public.current_company_id(); v_expected numeric; v_decision uuid; v_recommendation_key text;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT expected_impact,decision_id INTO v_expected,v_decision FROM public.decision_work_items WHERE id=p_work_item_id AND company_id=v_company FOR UPDATE;
  IF v_decision IS NULL THEN RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND'; END IF;
  UPDATE public.decision_work_items SET status='COMPLETED', actual_impact=p_actual_impact, completed_at=now(), updated_at=now() WHERE id=p_work_item_id AND company_id=v_company;
  SELECT COALESCE(r.id::text, d.decision_key) INTO v_recommendation_key
    FROM public.business_intelligence_decisions d
    LEFT JOIN public.recommendations r ON r.id=d.recommendation_id AND r.company_id=v_company
    WHERE d.id=v_decision AND d.company_id=v_company;
  INSERT INTO public.recommendation_outcomes(company_id,recommendation_key,decision_id,expected_impact,actual_impact,status,evidence)
  VALUES(v_company,v_recommendation_key,v_decision,v_expected,p_actual_impact,
    CASE WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient' WHEN p_actual_impact > v_expected THEN 'positive' WHEN p_actual_impact = v_expected THEN 'neutral' ELSE 'negative' END,
    jsonb_build_object('work_item_id',p_work_item_id,'outcome_delta',CASE WHEN v_expected IS NULL OR p_actual_impact IS NULL THEN NULL ELSE p_actual_impact-v_expected END) || COALESCE(p_evidence,'{}'::jsonb))
  ON CONFLICT(company_id,recommendation_key) DO UPDATE SET actual_impact=EXCLUDED.actual_impact,status=EXCLUDED.status,observed_at=now(),evidence=EXCLUDED.evidence;
  UPDATE public.business_intelligence_decisions SET status='EXECUTED', executed_at=now() WHERE id=v_decision AND company_id=v_company AND status='APPROVED';
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_decision_approval(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_approval(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) TO authenticated;
