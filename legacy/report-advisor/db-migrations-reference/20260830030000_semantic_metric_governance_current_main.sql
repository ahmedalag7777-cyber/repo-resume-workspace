-- Current-main selective extraction of semantic metric governance.
-- Calculation formulas remain in BUSINESS_METRICS; persisted governance is tenant-scoped.
CREATE TABLE IF NOT EXISTS public.metric_governance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, metric_id text NOT NULL, version integer NOT NULL CHECK (version > 0),
  name text NOT NULL, definition text NOT NULL, formula text NOT NULL, source jsonb NOT NULL DEFAULT '[]'::jsonb, dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters jsonb NOT NULL DEFAULT '[]'::jsonb, time_semantics jsonb NOT NULL DEFAULT '{}'::jsonb, freshness jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner text NOT NULL, certification_status text NOT NULL DEFAULT 'DRAFT' CHECK (certification_status IN ('DRAFT','REVIEWED','CERTIFIED','DEPRECATED')),
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb, consumers jsonb NOT NULL DEFAULT '[]'::jsonb, tests jsonb NOT NULL DEFAULT '[]'::jsonb, evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deprecated_at timestamptz NULL, UNIQUE(metric_id, version)
);
ALTER TABLE public.metric_governance ADD COLUMN IF NOT EXISTS company_id uuid;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='metric_governance_metric_id_version_key' AND conrelid='public.metric_governance'::regclass) THEN ALTER TABLE public.metric_governance DROP CONSTRAINT metric_governance_metric_id_version_key; END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_metric_governance_company_metric_version ON public.metric_governance(company_id, metric_id, version);
CREATE INDEX IF NOT EXISTS idx_metric_governance_metric_version ON public.metric_governance(metric_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_metric_governance_company_metric_version ON public.metric_governance(company_id, metric_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_metric_governance_status ON public.metric_governance(certification_status);
CREATE TABLE IF NOT EXISTS public.metric_governance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), metric_governance_id uuid NOT NULL REFERENCES public.metric_governance(id) ON DELETE CASCADE, company_id uuid,
  metric_id text NOT NULL, from_status text, to_status text NOT NULL, actor_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL, reason text NOT NULL,
  previous_version integer NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.metric_governance_audit ADD COLUMN IF NOT EXISTS company_id uuid;
CREATE INDEX IF NOT EXISTS idx_metric_governance_audit_company_metric ON public.metric_governance_audit(company_id, metric_id, created_at DESC);
ALTER TABLE public.metric_governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_governance_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.metric_governance FROM anon;
REVOKE ALL ON public.metric_governance_audit FROM anon;
GRANT SELECT ON public.metric_governance TO authenticated;
GRANT SELECT ON public.metric_governance_audit TO authenticated;
DROP POLICY IF EXISTS metric_governance_authenticated_tenant_read ON public.metric_governance;
CREATE POLICY metric_governance_authenticated_tenant_read ON public.metric_governance FOR SELECT TO authenticated USING (company_id = public.current_company_id());
DROP POLICY IF EXISTS metric_governance_audit_authenticated_tenant_read ON public.metric_governance_audit;
CREATE POLICY metric_governance_audit_authenticated_tenant_read ON public.metric_governance_audit FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE OR REPLACE FUNCTION public.metric_governance_require_tenant() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ BEGIN IF NEW.company_id IS NULL THEN NEW.company_id=public.current_company_id(); END IF; IF NEW.company_id IS NULL THEN RAISE EXCEPTION 'metric governance tenant context required'; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS metric_governance_require_tenant ON public.metric_governance;
CREATE TRIGGER metric_governance_require_tenant BEFORE INSERT ON public.metric_governance FOR EACH ROW EXECUTE FUNCTION public.metric_governance_require_tenant();
CREATE OR REPLACE FUNCTION public.metric_governance_audit_require_tenant() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ BEGIN IF NEW.company_id IS NULL THEN NEW.company_id=public.current_company_id(); END IF; IF NEW.company_id IS NULL THEN RAISE EXCEPTION 'metric governance audit tenant context required'; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS metric_governance_audit_require_tenant ON public.metric_governance_audit;
CREATE TRIGGER metric_governance_audit_require_tenant BEFORE INSERT ON public.metric_governance_audit FOR EACH ROW EXECUTE FUNCTION public.metric_governance_audit_require_tenant();
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.metric_governance_transition(p_metric_id text,p_version integer,p_to_status text,p_reason text)
RETURNS public.metric_governance LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid := public.current_company_id(); v_row public.metric_governance; v_from_status text; v_previous_version integer;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL THEN RAISE EXCEPTION 'authenticated tenant actor required'; END IF;
  IF p_to_status NOT IN ('DRAFT','REVIEWED','CERTIFIED','DEPRECATED') THEN RAISE EXCEPTION 'invalid certification status'; END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'transition reason required'; END IF;
  SELECT * INTO v_row FROM public.metric_governance WHERE company_id=v_company AND metric_id=p_metric_id AND version=p_version FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'metric version not found in current tenant'; END IF;
  v_from_status:=v_row.certification_status;
  IF v_from_status='CERTIFIED' AND p_to_status NOT IN ('CERTIFIED','DEPRECATED') THEN RAISE EXCEPTION 'certified metric may only remain certified or be deprecated'; END IF;
  IF v_from_status='DEPRECATED' AND p_to_status <> 'DEPRECATED' THEN RAISE EXCEPTION 'deprecated metric cannot be reactivated'; END IF;
  IF v_from_status='DRAFT' AND p_to_status NOT IN ('DRAFT','REVIEWED') THEN RAISE EXCEPTION 'draft metric must be reviewed before certification'; END IF;
  IF v_from_status='REVIEWED' AND p_to_status NOT IN ('REVIEWED','CERTIFIED','DEPRECATED') THEN RAISE EXCEPTION 'reviewed metric has an invalid transition'; END IF;
  SELECT max(version) INTO v_previous_version FROM public.metric_governance WHERE company_id=v_company AND metric_id=p_metric_id AND version<p_version;
  UPDATE public.metric_governance SET certification_status=p_to_status, deprecated_at=CASE WHEN p_to_status='DEPRECATED' THEN now() ELSE deprecated_at END, updated_at=now() WHERE id=v_row.id RETURNING * INTO v_row;
  INSERT INTO public.metric_governance_audit(metric_governance_id,company_id,metric_id,from_status,to_status,actor_id,reason,previous_version) VALUES(v_row.id,v_company,v_row.metric_id,v_from_status,p_to_status,auth.uid(),p_reason,v_previous_version);
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION private.metric_governance_transition(text,integer,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.metric_governance_transition(text,integer,text,text) FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.metric_governance_transition(text,integer,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.metric_governance_guard_certified_update() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF OLD.certification_status='CERTIFIED' AND (NEW.metric_id<>OLD.metric_id OR NEW.version<>OLD.version OR NEW.name<>OLD.name OR NEW.definition<>OLD.definition OR NEW.formula<>OLD.formula OR NEW.source<>OLD.source OR NEW.dimensions<>OLD.dimensions OR NEW.filters<>OLD.filters OR NEW.time_semantics<>OLD.time_semantics OR NEW.freshness<>OLD.freshness OR NEW.owner<>OLD.owner OR NEW.dependencies<>OLD.dependencies OR NEW.consumers<>OLD.consumers OR NEW.tests<>OLD.tests OR NEW.evidence<>OLD.evidence) THEN RAISE EXCEPTION 'certified metric version is immutable; create a new version'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS metric_governance_guard_certified_update ON public.metric_governance;
CREATE TRIGGER metric_governance_guard_certified_update BEFORE UPDATE ON public.metric_governance FOR EACH ROW EXECUTE FUNCTION public.metric_governance_guard_certified_update();
CREATE OR REPLACE FUNCTION public.metric_governance_touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS metric_governance_touch_updated_at ON public.metric_governance;
CREATE TRIGGER metric_governance_touch_updated_at BEFORE UPDATE ON public.metric_governance FOR EACH ROW EXECUTE FUNCTION public.metric_governance_touch_updated_at();
