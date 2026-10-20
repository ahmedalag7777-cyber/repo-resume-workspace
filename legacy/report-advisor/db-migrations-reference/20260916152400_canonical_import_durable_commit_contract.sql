-- Canonical import durable commit contract.
-- This migration is intentionally non-destructive:
-- existing production/staging implementations of the import RPC are preserved.
-- Clean environments receive the same public contract when the RPC/table do not exist yet.

CREATE TABLE IF NOT EXISTS public.canonical_import_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  source_hash text NOT NULL,
  committed_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  committed_count integer NOT NULL DEFAULT 0,
  committed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_import_commits_source_hash_format CHECK (source_hash ~ '^sha256:[0-9a-fA-F]{64}$'),
  CONSTRAINT canonical_import_commits_entity_type_check CHECK (entity_type IN ('products','customers','sales_invoices')),
  CONSTRAINT canonical_import_commits_count_nonnegative CHECK (committed_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_import_commits_company_entity_hash_key
  ON public.canonical_import_commits(company_id, entity_type, source_hash);

ALTER TABLE public.canonical_import_commits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_import_commits_tenant ON public.canonical_import_commits;
CREATE POLICY canonical_import_commits_tenant
  ON public.canonical_import_commits
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS canonical_import_commits_tenant_insert ON public.canonical_import_commits;
CREATE POLICY canonical_import_commits_tenant_insert
  ON public.canonical_import_commits
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());

GRANT SELECT, INSERT ON public.canonical_import_commits TO authenticated;
REVOKE ALL ON public.canonical_import_commits FROM anon;

-- Required function overloads are created only when the clean environment does not
-- already provide them. Existing optimized Staging/Production definitions are not replaced.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'import_upsert_product'
      AND pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid, p_sku text, p_name text, p_unit text, p_cost_price numeric, p_selling_price numeric, p_min_stock numeric, p_reorder_point numeric, p_is_active boolean, p_null_policy text'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.import_upsert_product(
        p_company_id uuid,
        p_sku text,
        p_name text,
        p_unit text,
        p_cost_price numeric,
        p_selling_price numeric,
        p_min_stock numeric,
        p_reorder_point numeric,
        p_is_active boolean,
        p_null_policy text DEFAULT 'preserve'
      ) RETURNS TABLE(target_id uuid, action text)
      LANGUAGE plpgsql
      SET search_path TO 'public'
      AS $body$
      DECLARE
        v_company_id uuid := public.current_company_id();
        v_id uuid;
      BEGIN
        IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
        IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
        IF NULLIF(trim(p_sku), '') IS NULL THEN RAISE EXCEPTION 'SKU_REQUIRED'; END IF;
        SELECT id INTO v_id FROM public.products
          WHERE company_id = v_company_id
            AND public.normalize_import_key(sku) = public.normalize_import_key(p_sku)
          LIMIT 1 FOR UPDATE;
        IF v_id IS NULL THEN
          IF NULLIF(trim(p_name), '') IS NULL THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
          IF NULLIF(trim(p_unit), '') IS NULL THEN RAISE EXCEPTION 'UNIT_REQUIRED'; END IF;
          IF p_cost_price IS NULL OR p_cost_price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'COST_PRICE_REQUIRED'; END IF;
          IF p_selling_price IS NULL OR p_selling_price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'SELLING_PRICE_REQUIRED'; END IF;
          IF p_min_stock IS NULL OR p_min_stock::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'MIN_STOCK_REQUIRED'; END IF;
          IF p_reorder_point IS NULL OR p_reorder_point::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'REORDER_POINT_REQUIRED'; END IF;
          IF p_is_active IS NULL THEN RAISE EXCEPTION 'IS_ACTIVE_REQUIRED'; END IF;
          INSERT INTO public.products(company_id, sku, name, unit, cost_price, selling_price, min_stock, reorder_point, is_active)
          VALUES (v_company_id, trim(p_sku), trim(p_name), trim(p_unit), p_cost_price, p_selling_price, p_min_stock, p_reorder_point, p_is_active)
          RETURNING id INTO v_id;
          RETURN QUERY SELECT v_id, 'inserted'::text;
          RETURN;
        END IF;
        UPDATE public.products
        SET name = CASE WHEN p_null_policy='preserve' AND p_name IS NULL THEN name ELSE coalesce(NULLIF(trim(p_name),''),name) END,
            unit = CASE WHEN p_null_policy='preserve' AND p_unit IS NULL THEN unit ELSE coalesce(NULLIF(trim(p_unit),''),unit) END,
            cost_price = CASE WHEN p_null_policy='preserve' AND p_cost_price IS NULL THEN cost_price ELSE p_cost_price END,
            selling_price = CASE WHEN p_null_policy='preserve' AND p_selling_price IS NULL THEN selling_price ELSE p_selling_price END,
            min_stock = CASE WHEN p_null_policy='preserve' AND p_min_stock IS NULL THEN min_stock ELSE p_min_stock END,
            reorder_point = CASE WHEN p_null_policy='preserve' AND p_reorder_point IS NULL THEN reorder_point ELSE p_reorder_point END,
            is_active = CASE WHEN p_null_policy='preserve' AND p_is_active IS NULL THEN is_active ELSE p_is_active END
        WHERE id=v_id AND company_id=v_company_id;
        RETURN QUERY SELECT v_id, 'updated'::text;
      END;
      $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'import_upsert_customer'
      AND pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid, p_name text, p_code text, p_phone text, p_email text, p_segment text, p_credit_limit numeric, p_payment_terms_days integer, p_null_policy text'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.import_upsert_customer(
        p_company_id uuid,
        p_name text,
        p_code text,
        p_phone text,
        p_email text,
        p_segment text,
        p_credit_limit numeric,
        p_payment_terms_days integer,
        p_null_policy text DEFAULT 'preserve'
      ) RETURNS TABLE(target_id uuid, action text)
      LANGUAGE plpgsql
      SET search_path TO 'public'
      AS $body$
      DECLARE
        v_company_id uuid := public.current_company_id();
        v_id uuid;
      BEGIN
        IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
        IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
        IF NULLIF(trim(p_name), '') IS NULL THEN RAISE EXCEPTION 'CUSTOMER_NAME_REQUIRED'; END IF;
        SELECT id INTO v_id FROM public.customers
          WHERE company_id=v_company_id
            AND public.normalize_import_key(code)=public.normalize_import_key(p_code)
            AND public.normalize_import_key(p_code) IS NOT NULL
          LIMIT 1 FOR UPDATE;
        IF v_id IS NULL THEN
          IF NULLIF(trim(p_segment), '') IS NULL THEN RAISE EXCEPTION 'CUSTOMER_SEGMENT_REQUIRED'; END IF;
          IF p_credit_limit IS NULL OR p_credit_limit::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'CUSTOMER_CREDIT_LIMIT_REQUIRED'; END IF;
          IF p_payment_terms_days IS NULL THEN RAISE EXCEPTION 'CUSTOMER_PAYMENT_TERMS_REQUIRED'; END IF;
          INSERT INTO public.customers(company_id,name,code,phone,email,segment,credit_limit,payment_terms_days)
          VALUES(v_company_id,trim(p_name),NULLIF(trim(p_code),''),p_phone,p_email,trim(p_segment),p_credit_limit,p_payment_terms_days)
          RETURNING id INTO v_id;
          RETURN QUERY SELECT v_id,'inserted'::text;
          RETURN;
        END IF;
        UPDATE public.customers
        SET name=CASE WHEN p_null_policy='preserve' AND p_name IS NULL THEN name ELSE coalesce(NULLIF(trim(p_name),''),name) END,
            code=CASE WHEN p_null_policy='preserve' AND p_code IS NULL THEN code ELSE coalesce(NULLIF(trim(p_code),''),code) END,
            phone=CASE WHEN p_null_policy='preserve' AND p_phone IS NULL THEN phone ELSE coalesce(p_phone,phone) END,
            email=CASE WHEN p_null_policy='preserve' AND p_email IS NULL THEN email ELSE coalesce(p_email,email) END,
            segment=CASE WHEN p_null_policy='preserve' AND p_segment IS NULL THEN segment ELSE coalesce(NULLIF(trim(p_segment),''),segment) END,
            credit_limit=CASE WHEN p_null_policy='preserve' AND p_credit_limit IS NULL THEN credit_limit ELSE p_credit_limit END,
            payment_terms_days=CASE WHEN p_null_policy='preserve' AND p_payment_terms_days IS NULL THEN payment_terms_days ELSE p_payment_terms_days END
        WHERE id=v_id AND company_id=v_company_id;
        RETURN QUERY SELECT v_id,'updated'::text;
      END;
      $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'import_upsert_sales_invoice'
      AND pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid, p_invoice_number text, p_invoice_date date, p_customer_id uuid, p_customer_name text, p_subtotal numeric, p_tax_amount numeric, p_total numeric, p_paid_amount numeric, p_status text, p_null_policy text'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.import_upsert_sales_invoice(
        p_company_id uuid,
        p_invoice_number text,
        p_invoice_date date,
        p_customer_id uuid,
        p_customer_name text,
        p_subtotal numeric,
        p_tax_amount numeric,
        p_total numeric,
        p_paid_amount numeric,
        p_status text,
        p_null_policy text DEFAULT 'preserve'
      ) RETURNS TABLE(target_id uuid, action text)
      LANGUAGE plpgsql
      SET search_path TO 'public','pg_catalog'
      AS $body$
      DECLARE
        v_company_id uuid := public.current_company_id();
        v_id uuid;
        v_customer_id uuid := p_customer_id;
        v_currency text;
      BEGIN
        IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
        IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
        IF NULLIF(trim(p_invoice_number),'') IS NULL THEN RAISE EXCEPTION 'INVOICE_NUMBER_REQUIRED'; END IF;
        IF p_invoice_date IS NULL THEN RAISE EXCEPTION 'INVOICE_DATE_REQUIRED'; END IF;
        SELECT currency INTO v_currency FROM public.companies WHERE id=v_company_id;
        IF NULLIF(trim(v_currency),'') IS NULL THEN RAISE EXCEPTION 'COMPANY_CURRENCY_REQUIRED'; END IF;
        IF v_customer_id IS NULL AND NULLIF(trim(p_customer_name),'') IS NOT NULL THEN
          SELECT id INTO v_customer_id FROM public.customers
          WHERE company_id=v_company_id AND public.normalize_import_key(name)=public.normalize_import_key(p_customer_name)
          LIMIT 1;
        END IF;
        IF v_customer_id IS NULL THEN RAISE EXCEPTION 'CUSTOMER_REQUIRED'; END IF;
        IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id=v_customer_id AND company_id=v_company_id) THEN RAISE EXCEPTION 'CUSTOMER_TENANT_MISMATCH'; END IF;
        SELECT id INTO v_id FROM public.sales_invoices
          WHERE company_id=v_company_id AND public.normalize_import_key(invoice_number)=public.normalize_import_key(p_invoice_number)
          LIMIT 1 FOR UPDATE;
        IF v_id IS NULL THEN
          IF p_subtotal IS NULL OR p_subtotal::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'SUBTOTAL_REQUIRED'; END IF;
          IF p_tax_amount IS NULL OR p_tax_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'TAX_AMOUNT_REQUIRED'; END IF;
          IF p_total IS NULL OR p_total::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'TOTAL_REQUIRED'; END IF;
          IF p_paid_amount IS NULL OR p_paid_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'PAID_AMOUNT_REQUIRED'; END IF;
          IF NULLIF(trim(p_status),'') IS NULL THEN RAISE EXCEPTION 'STATUS_REQUIRED'; END IF;
          INSERT INTO public.sales_invoices(company_id,customer_id,invoice_number,invoice_date,status,subtotal,tax_amount,total,paid_amount,currency)
          VALUES(v_company_id,v_customer_id,trim(p_invoice_number),p_invoice_date,trim(p_status),p_subtotal,p_tax_amount,p_total,p_paid_amount,v_currency)
          RETURNING id INTO v_id;
          RETURN QUERY SELECT v_id,'inserted'::text;
          RETURN;
        END IF;
        UPDATE public.sales_invoices
        SET customer_id=v_customer_id,
            invoice_date=CASE WHEN p_null_policy='preserve' AND p_invoice_date IS NULL THEN invoice_date ELSE p_invoice_date END,
            status=CASE WHEN p_null_policy='preserve' AND p_status IS NULL THEN status ELSE coalesce(NULLIF(trim(p_status),''),status) END,
            subtotal=CASE WHEN p_null_policy='preserve' AND p_subtotal IS NULL THEN subtotal ELSE p_subtotal END,
            tax_amount=CASE WHEN p_null_policy='preserve' AND p_tax_amount IS NULL THEN tax_amount ELSE p_tax_amount END,
            total=CASE WHEN p_null_policy='preserve' AND p_total IS NULL THEN total ELSE p_total END,
            paid_amount=CASE WHEN p_null_policy='preserve' AND p_paid_amount IS NULL THEN paid_amount ELSE p_paid_amount END
        WHERE id=v_id AND company_id=v_company_id;
        RETURN QUERY SELECT v_id,'updated'::text;
      END;
      $body$;
    $fn$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname='import_commit_batch'
      AND pg_get_function_identity_arguments(p.oid)='p_company_id uuid, p_entity_type text, p_rows jsonb, p_null_policy text, p_source_hash text'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.import_commit_batch(
        p_company_id uuid,
        p_entity_type text,
        p_rows jsonb,
        p_null_policy text DEFAULT 'preserve',
        p_source_hash text DEFAULT NULL
      ) RETURNS jsonb
      LANGUAGE plpgsql
      SET search_path TO ''
      AS $body$
      DECLARE
        v_company_id uuid := public.current_company_id();
        v_row jsonb;
        v_id uuid;
        v_ids jsonb := '[]'::jsonb;
        v_count integer := 0;
        v_key bigint := hashtextextended(coalesce(v_company_id::text,'') || ':' || coalesce(p_entity_type,'') || ':' || coalesce(p_source_hash,''), 0);
        v_existing public.canonical_import_commits%rowtype;
      BEGIN
        IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
        IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
        IF p_source_hash IS NULL OR btrim(p_source_hash)='' THEN RAISE EXCEPTION 'IMPORT_SOURCE_HASH_REQUIRED'; END IF;
        IF p_source_hash !~ '^sha256:[0-9a-fA-F]{64}$' THEN RAISE EXCEPTION 'IMPORT_SOURCE_HASH_INVALID'; END IF;
        IF p_entity_type NOT IN ('products','customers','sales_invoices') THEN RAISE EXCEPTION 'IMPORT_ENTITY_TYPE_UNSUPPORTED'; END IF;
        IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'IMPORT_ROWS_MUST_BE_ARRAY'; END IF;

        PERFORM pg_advisory_xact_lock(v_key);
        SELECT * INTO v_existing FROM public.canonical_import_commits c
          WHERE c.company_id=v_company_id AND c.entity_type=p_entity_type AND c.source_hash=p_source_hash
          FOR UPDATE;
        IF FOUND THEN
          RETURN jsonb_build_object('committed',v_existing.committed_count,'ids',v_existing.committed_ids,'idempotent_replay',true);
        END IF;

        FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
          IF p_entity_type='products' THEN
            SELECT target_id INTO v_id FROM public.import_upsert_product(
              v_company_id,
              v_row->>'sku',
              v_row->>'name',
              v_row->>'unit',
              nullif(v_row->>'cost_price','')::numeric,
              nullif(v_row->>'selling_price','')::numeric,
              nullif(v_row->>'min_stock','')::numeric,
              nullif(v_row->>'reorder_point','')::numeric,
              CASE WHEN v_row ? 'is_active' AND v_row->>'is_active'<>'' THEN (v_row->>'is_active')::boolean ELSE NULL END,
              p_null_policy
            );
          ELSIF p_entity_type='customers' THEN
            SELECT target_id INTO v_id FROM public.import_upsert_customer(
              v_company_id,v_row->>'name',v_row->>'code',v_row->>'phone',v_row->>'email',v_row->>'segment',
              nullif(v_row->>'credit_limit','')::numeric,nullif(v_row->>'payment_terms_days','')::integer,p_null_policy
            );
          ELSE
            SELECT target_id INTO v_id FROM public.import_upsert_sales_invoice(
              v_company_id,v_row->>'invoice_number',nullif(v_row->>'invoice_date','')::date,v_row->>'customer_id',v_row->>'customer_name',
              nullif(v_row->>'subtotal','')::numeric,nullif(v_row->>'tax_amount','')::numeric,nullif(v_row->>'total','')::numeric,
              nullif(v_row->>'paid_amount','')::numeric,v_row->>'status',p_null_policy
            );
          END IF;
          IF v_id IS NULL THEN RAISE EXCEPTION 'IMPORT_TARGET_ID_MISSING'; END IF;
          v_count := v_count + 1;
          v_ids := v_ids || jsonb_build_array(v_id);
        END LOOP;

        INSERT INTO public.canonical_import_commits(company_id,entity_type,source_hash,committed_ids,committed_count)
        VALUES(v_company_id,p_entity_type,p_source_hash,v_ids,v_count);
        RETURN jsonb_build_object('committed',v_count,'ids',v_ids,'idempotent_replay',false);
      END;
      $body$;
    $fn$;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.import_commit_batch(uuid,text,jsonb,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_commit_batch(uuid,text,jsonb,text,text) TO authenticated;
