-- Remove fabricated defaults from canonical customer/invoice inserts.
-- Existing rows continue to honor the import null policy on updates.

CREATE OR REPLACE FUNCTION public.import_upsert_customer(
  p_company_id uuid,
  p_name text,
  p_code text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_segment text DEFAULT NULL,
  p_credit_limit numeric DEFAULT NULL,
  p_payment_terms_days integer DEFAULT NULL,
  p_null_policy text DEFAULT 'preserve'
)
RETURNS TABLE(target_id uuid, action text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_id uuid;
  v_code text := public.normalize_import_key(p_code);
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF NULLIF(trim(p_name), '') IS NULL THEN RAISE EXCEPTION 'CUSTOMER_NAME_REQUIRED'; END IF;

  SELECT id INTO v_id
  FROM public.customers
  WHERE company_id = v_company_id
    AND v_code IS NOT NULL
    AND public.normalize_import_key(code) = v_code
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    IF NULLIF(trim(p_segment), '') IS NULL THEN RAISE EXCEPTION 'CUSTOMER_SEGMENT_REQUIRED'; END IF;
    IF p_credit_limit IS NULL OR p_credit_limit::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'CUSTOMER_CREDIT_LIMIT_REQUIRED'; END IF;
    IF p_payment_terms_days IS NULL THEN RAISE EXCEPTION 'CUSTOMER_PAYMENT_TERMS_REQUIRED'; END IF;

    INSERT INTO public.customers(company_id, name, code, phone, email, segment, credit_limit, payment_terms_days)
    VALUES (v_company_id, trim(p_name), NULLIF(trim(p_code), ''), p_phone, p_email, trim(p_segment), p_credit_limit, p_payment_terms_days)
    RETURNING id INTO v_id;
    RETURN QUERY SELECT v_id, 'inserted'::text;
    RETURN;
  END IF;

  UPDATE public.customers
  SET name = CASE WHEN p_null_policy = 'preserve' AND p_name IS NULL THEN name ELSE coalesce(NULLIF(trim(p_name), ''), name) END,
      code = CASE WHEN p_null_policy = 'preserve' AND p_code IS NULL THEN code ELSE coalesce(NULLIF(trim(p_code), ''), code) END,
      phone = CASE WHEN p_null_policy = 'preserve' AND p_phone IS NULL THEN phone ELSE coalesce(p_phone, phone) END,
      email = CASE WHEN p_null_policy = 'preserve' AND p_email IS NULL THEN email ELSE coalesce(p_email, email) END,
      segment = CASE WHEN p_null_policy = 'preserve' AND p_segment IS NULL THEN segment ELSE coalesce(NULLIF(trim(p_segment), ''), segment) END,
      credit_limit = CASE WHEN p_null_policy = 'preserve' AND p_credit_limit IS NULL THEN credit_limit ELSE p_credit_limit END,
      payment_terms_days = CASE WHEN p_null_policy = 'preserve' AND p_payment_terms_days IS NULL THEN payment_terms_days ELSE p_payment_terms_days END
  WHERE id = v_id AND company_id = v_company_id;

  RETURN QUERY SELECT v_id, 'updated'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_upsert_sales_invoice(
  p_company_id uuid,
  p_invoice_number text,
  p_invoice_date date,
  p_customer_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_subtotal numeric DEFAULT NULL,
  p_tax_amount numeric DEFAULT NULL,
  p_total numeric DEFAULT NULL,
  p_paid_amount numeric DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_null_policy text DEFAULT 'preserve'
)
RETURNS TABLE(target_id uuid, action text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_id uuid;
  v_customer_id uuid := p_customer_id;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF NULLIF(trim(p_invoice_number), '') IS NULL THEN RAISE EXCEPTION 'INVOICE_NUMBER_REQUIRED'; END IF;
  IF p_invoice_date IS NULL THEN RAISE EXCEPTION 'INVOICE_DATE_REQUIRED'; END IF;

  IF v_customer_id IS NULL AND NULLIF(trim(p_customer_name), '') IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE company_id = v_company_id
      AND public.normalize_import_key(name) = public.normalize_import_key(p_customer_name)
    LIMIT 1;
  END IF;
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'CUSTOMER_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = v_customer_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'CUSTOMER_TENANT_MISMATCH';
  END IF;

  SELECT id INTO v_id
  FROM public.sales_invoices
  WHERE company_id = v_company_id
    AND public.normalize_import_key(invoice_number) = public.normalize_import_key(p_invoice_number)
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    IF p_subtotal IS NULL OR p_subtotal::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'SUBTOTAL_REQUIRED'; END IF;
    IF p_tax_amount IS NULL OR p_tax_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'TAX_AMOUNT_REQUIRED'; END IF;
    IF p_total IS NULL OR p_total::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'TOTAL_REQUIRED'; END IF;
    IF p_paid_amount IS NULL OR p_paid_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'PAID_AMOUNT_REQUIRED'; END IF;
    IF NULLIF(trim(p_status), '') IS NULL THEN RAISE EXCEPTION 'STATUS_REQUIRED'; END IF;

    INSERT INTO public.sales_invoices(company_id, customer_id, invoice_number, invoice_date, status, subtotal, tax_amount, total, paid_amount)
    VALUES (v_company_id, v_customer_id, trim(p_invoice_number), p_invoice_date, trim(p_status), p_subtotal, p_tax_amount, p_total, p_paid_amount)
    RETURNING id INTO v_id;
    RETURN QUERY SELECT v_id, 'inserted'::text;
    RETURN;
  END IF;

  UPDATE public.sales_invoices
  SET customer_id = v_customer_id,
      invoice_date = CASE WHEN p_null_policy = 'preserve' AND p_invoice_date IS NULL THEN invoice_date ELSE p_invoice_date END,
      status = CASE WHEN p_null_policy = 'preserve' AND p_status IS NULL THEN status ELSE coalesce(NULLIF(trim(p_status), ''), status) END,
      subtotal = CASE WHEN p_null_policy = 'preserve' AND p_subtotal IS NULL THEN subtotal ELSE p_subtotal END,
      tax_amount = CASE WHEN p_null_policy = 'preserve' AND p_tax_amount IS NULL THEN tax_amount ELSE p_tax_amount END,
      total = CASE WHEN p_null_policy = 'preserve' AND p_total IS NULL THEN total ELSE p_total END,
      paid_amount = CASE WHEN p_null_policy = 'preserve' AND p_paid_amount IS NULL THEN paid_amount ELSE p_paid_amount END
  WHERE id = v_id AND company_id = v_company_id;

  RETURN QUERY SELECT v_id, 'updated'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.import_upsert_customer(uuid,text,text,text,text,text,numeric,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_upsert_sales_invoice(uuid,text,date,uuid,text,numeric,numeric,numeric,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_upsert_customer(uuid,text,text,text,text,text,numeric,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_upsert_sales_invoice(uuid,text,date,uuid,text,numeric,numeric,numeric,numeric,text,text) TO authenticated;
