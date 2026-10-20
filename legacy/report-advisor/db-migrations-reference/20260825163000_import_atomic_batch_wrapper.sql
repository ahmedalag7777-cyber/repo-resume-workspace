-- Atomic chunk wrapper around the existing canonical import RPCs.
-- This is not a parallel import engine: it preserves the existing entity RPCs
-- and gives callers a single transaction boundary per governed chunk.

CREATE OR REPLACE FUNCTION public.import_commit_batch(
  p_company_id uuid,
  p_entity_type text,
  p_rows jsonb,
  p_null_policy text DEFAULT 'preserve'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_row jsonb;
  v_id uuid;
  v_count integer := 0;
  v_ids jsonb := '[]'::jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF p_entity_type NOT IN ('products','customers','sales_invoices') THEN RAISE EXCEPTION 'IMPORT_ENTITY_TYPE_UNSUPPORTED'; END IF;
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'IMPORT_ROWS_MUST_BE_ARRAY'; END IF;
  IF jsonb_array_length(p_rows) = 0 THEN RETURN jsonb_build_object('committed',0,'ids','[]'::jsonb); END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF p_entity_type = 'products' THEN
      SELECT target_id INTO v_id
      FROM public.import_upsert_product(
        v_company_id,
        v_row->>'sku',
        v_row->>'name',
        v_row->>'unit',
        NULLIF(v_row->>'cost_price','')::numeric,
        NULLIF(v_row->>'selling_price','')::numeric,
        NULLIF(v_row->>'min_stock','')::numeric,
        NULLIF(v_row->>'reorder_point','')::numeric,
        CASE WHEN v_row ? 'is_active' AND v_row->>'is_active' <> '' THEN (v_row->>'is_active')::boolean ELSE NULL END,
        p_null_policy
      );
    ELSIF p_entity_type = 'customers' THEN
      SELECT target_id INTO v_id
      FROM public.import_upsert_customer(
        v_company_id,
        v_row->>'name',
        v_row->>'code',
        v_row->>'phone',
        v_row->>'email',
        v_row->>'segment',
        NULLIF(v_row->>'credit_limit','')::numeric,
        NULLIF(v_row->>'payment_terms_days','')::integer,
        p_null_policy
      );
    ELSE
      SELECT target_id INTO v_id
      FROM public.import_upsert_sales_invoice(
        v_company_id,
        v_row->>'invoice_number',
        NULLIF(v_row->>'invoice_date','')::date,
        NULLIF(v_row->>'customer_id','')::uuid,
        v_row->>'customer_name',
        NULLIF(v_row->>'subtotal','')::numeric,
        NULLIF(v_row->>'tax_amount','')::numeric,
        NULLIF(v_row->>'total','')::numeric,
        NULLIF(v_row->>'paid_amount','')::numeric,
        v_row->>'status',
        p_null_policy
      );
    END IF;

    IF v_id IS NULL THEN RAISE EXCEPTION 'IMPORT_TARGET_ID_MISSING'; END IF;
    v_count := v_count + 1;
    v_ids := v_ids || jsonb_build_array(v_id);
  END LOOP;

  RETURN jsonb_build_object('committed',v_count,'ids',v_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.import_commit_batch(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_commit_batch(uuid,text,jsonb,text) TO authenticated;

COMMENT ON FUNCTION public.import_commit_batch(uuid,text,jsonb,text) IS
  'Atomic governed import chunk wrapper. Reuses canonical tenant-scoped entity RPCs; any row failure rolls back the whole chunk.';
