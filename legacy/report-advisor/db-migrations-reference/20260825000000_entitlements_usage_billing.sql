-- Phase B: tenant-scoped usage, capabilities and provider-neutral billing state.
CREATE TABLE IF NOT EXISTS entitlement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS entitlement_plan_capabilities (
  plan_id uuid NOT NULL REFERENCES entitlement_plans(id) ON DELETE CASCADE, capability text NOT NULL,
  quota numeric NOT NULL DEFAULT 0 CHECK (quota >= 0), enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY(plan_id, capability)
);
CREATE TABLE IF NOT EXISTS company_entitlements (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE, plan_id uuid REFERENCES entitlement_plans(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','paused','cancelled','expired')),
  starts_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, provider text,
  provider_customer_id text, provider_subscription_id text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS entitlement_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  capability text NOT NULL, quantity numeric NOT NULL CHECK (quantity > 0), billing_period text NOT NULL,
  idempotency_key text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, billing_period, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_entitlement_usage_period ON entitlement_usage_events(company_id, capability, billing_period, occurred_at);
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, event_id text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL, event_type text NOT NULL, payload_hash text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, UNIQUE(provider, event_id)
);
CREATE TABLE IF NOT EXISTS billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider text, provider_invoice_id text, status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','paid','past_due','void','uncollectible')),
  amount_minor bigint NOT NULL DEFAULT 0 CHECK (amount_minor >= 0), currency text NOT NULL DEFAULT 'USD',
  period_start timestamptz, period_end timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_invoice_id)
);
ALTER TABLE entitlement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlement_plan_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlement_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE entitlement_plans, entitlement_plan_capabilities, company_entitlements, entitlement_usage_events, billing_webhook_events, billing_invoices FROM anon;
DROP POLICY IF EXISTS authenticated_active_entitlement_plans_read ON entitlement_plans;
CREATE POLICY authenticated_active_entitlement_plans_read ON entitlement_plans FOR SELECT TO authenticated USING (is_active = true);
DROP POLICY IF EXISTS authenticated_active_entitlement_capabilities_read ON entitlement_plan_capabilities;
CREATE POLICY authenticated_active_entitlement_capabilities_read ON entitlement_plan_capabilities FOR SELECT TO authenticated USING (enabled = true AND EXISTS (SELECT 1 FROM entitlement_plans p WHERE p.id = plan_id AND p.is_active = true));
DROP POLICY IF EXISTS authenticated_company_entitlements_tenant ON company_entitlements;
CREATE POLICY authenticated_company_entitlements_tenant ON company_entitlements FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_entitlement_usage_tenant ON entitlement_usage_events;
CREATE POLICY authenticated_entitlement_usage_tenant ON entitlement_usage_events FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_billing_invoices_tenant ON billing_invoices;
CREATE POLICY authenticated_billing_invoices_tenant ON billing_invoices FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
-- Webhook events remain service-role only; no client policy is intentional.
CREATE OR REPLACE FUNCTION public.record_entitlement_usage(p_capability text,p_quantity numeric,p_period text,p_idempotency_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF public.current_company_id() IS NULL THEN RAISE EXCEPTION 'tenant context is required'; END IF;
  IF p_capability IS NULL OR p_capability='' OR p_period IS NULL OR p_period='' OR p_idempotency_key IS NULL OR p_idempotency_key='' THEN RAISE EXCEPTION 'usage identity is incomplete'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'usage quantity must be positive'; END IF;
  INSERT INTO entitlement_usage_events(company_id,capability,quantity,billing_period,idempotency_key)
  VALUES(public.current_company_id(),p_capability,p_quantity,p_period,p_idempotency_key)
  ON CONFLICT(company_id,billing_period,idempotency_key) DO UPDATE SET occurred_at=entitlement_usage_events.occurred_at
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
CREATE OR REPLACE FUNCTION public.get_entitlement_usage(p_capability text,p_period text)
RETURNS numeric LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(quantity),0) FROM entitlement_usage_events WHERE company_id = public.current_company_id() AND capability = p_capability AND billing_period = p_period;
$$;
GRANT EXECUTE ON FUNCTION public.record_entitlement_usage(text,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_entitlement_usage(text,text) TO authenticated;
