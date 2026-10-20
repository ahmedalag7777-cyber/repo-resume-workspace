-- Phase 10/12: close the remaining import write paths behind canonical RPCs.
-- The browser must never bulk-insert imported entities directly into base tables.

CREATE OR REPLACE FUNCTION import_upsert_customer(
  p_company_id uuid,
  p_name text,
  p_code text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_segment text DEFAULT 'regular',
  p_credit_limit numeric DEFAULT 0,
  p_payment_terms_days integer DEFAULT 30,
  p_null_policy text DEFAULT 'preserve'
)
RETURNS TABLE(target_id uuid, action text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id uuid;
  v_code text := normalize_import_key(p_code);
BEGIN
  IF p_company_id IS DISTINCT FROM public.current_company_id() THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;
  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  SELECT id INTO v_id
  FROM customers
  WHERE company_id = p_company_id
    AND v_code IS NOT NULL
    AND normalize_import_key(code) = v_code
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO customers(company_id, name, code, phone, email, segment, credit_limit, payment_terms_days)
    VALUES (p_company_id, trim(p_name), NULLIF(trim(p_code), ''), p_phone, p_email,
            coalesce(NULLIF(trim(p_segment), ''), 'regular'), coalesce(p_credit_limit, 0), coalesce(p_payment_terms_days, 30))
    RETURNING id INTO v_id;
    RETURN QUERY SELECT v_id, 'inserted'::text;
    RETURN;
  END IF;

  UPDATE customers
  SET name = CASE WHEN p_null_policy = 'preserve' AND p_name IS NULL THEN name ELSE coalesce(NULLIF(trim(p_name), ''), name) END,
      code = CASE WHEN p_null_policy = 'preserve' AND p_code IS NULL THEN code ELSE coalesce(NULLIF(trim(p_code), ''), code) END,
      phone = CASE WHEN p_null_policy = 'preserve' AND p_phone IS NULL THEN phone ELSE coalesce(p_phone, phone) END,
      email = CASE WHEN p_null_policy = 'preserve' AND p_email IS NULL THEN email ELSE coalesce(p_email, email) END,
      segment = CASE WHEN p_null_policy = 'preserve' AND p_segment IS NULL THEN segment ELSE coalesce(NULLIF(trim(p_segment), ''), segment) END,
      credit_limit = CASE WHEN p_null_policy = 'preserve' AND p_credit_limit IS NULL THEN credit_limit ELSE coalesce(p_credit_limit, credit_limit) END,
      payment_terms_days = CASE WHEN p_null_policy = 'preserve' AND p_payment_terms_days IS NULL THEN payment_terms_days ELSE coalesce(p_payment_terms_days, payment_terms_days) END
  WHERE id = v_id;

  RETURN QUERY SELECT v_id, 'updated'::text;
END;
$$;

CREATE OR REPLACE FUNCTION import_upsert_sales_invoice(
  p_company_id uuid,
  p_invoice_number text,
  p_invoice_date date,
  p_customer_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_subtotal numeric DEFAULT 0,
  p_tax_amount numeric DEFAULT 0,
  p_total numeric DEFAULT 0,
  p_paid_amount numeric DEFAULT 0,
  p_status text DEFAULT 'confirmed',
  p_null_policy text DEFAULT 'preserve'
)
RETURNS TABLE(target_id uuid, action text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id uuid;
  v_customer_id uuid := p_customer_id;
BEGIN
  IF p_company_id IS DISTINCT FROM public.current_company_id() THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;
  IF NULLIF(trim(p_invoice_number), '') IS NULL THEN
    RAISE EXCEPTION 'Invoice number is required';
  END IF;
  IF p_invoice_date IS NULL THEN
    RAISE EXCEPTION 'Invoice date is required';
  END IF;

  IF v_customer_id IS NULL AND NULLIF(trim(p_customer_name), '') IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE company_id = p_company_id
      AND normalize_import_key(name) = normalize_import_key(p_customer_name)
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer could not be resolved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM customers
    WHERE id = v_customer_id AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'CUSTOMER_TENANT_MISMATCH';
  END IF;

  SELECT id INTO v_id
  FROM sales_invoices
  WHERE company_id = p_company_id
    AND normalize_import_key(invoice_number) = normalize_import_key(p_invoice_number)
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO sales_invoices(company_id, customer_id, invoice_number, invoice_date, status, subtotal, tax_amount, total, paid_amount)
    VALUES (p_company_id, v_customer_id, trim(p_invoice_number), p_invoice_date,
            coalesce(NULLIF(trim(p_status), ''), 'confirmed'), coalesce(p_subtotal, 0), coalesce(p_tax_amount, 0),
            coalesce(p_total, 0), coalesce(p_paid_amount, 0))
    RETURNING id INTO v_id;
    RETURN QUERY SELECT v_id, 'inserted'::text;
    RETURN;
  END IF;

  UPDATE sales_invoices
  SET customer_id = CASE WHEN v_customer_id IS NULL THEN customer_id ELSE v_customer_id END,
      invoice_date = CASE WHEN p_null_policy = 'preserve' AND p_invoice_date IS NULL THEN invoice_date ELSE p_invoice_date END,
      status = CASE WHEN p_null_policy = 'preserve' AND p_status IS NULL THEN status ELSE coalesce(NULLIF(trim(p_status), ''), status) END,
      subtotal = CASE WHEN p_null_policy = 'preserve' AND p_subtotal IS NULL THEN subtotal ELSE coalesce(p_subtotal, subtotal) END,
      tax_amount = CASE WHEN p_null_policy = 'preserve' AND p_tax_amount IS NULL THEN tax_amount ELSE coalesce(p_tax_amount, tax_amount) END,
      total = CASE WHEN p_null_policy = 'preserve' AND p_total IS NULL THEN total ELSE coalesce(p_total, total) END,
      paid_amount = CASE WHEN p_null_policy = 'preserve' AND p_paid_amount IS NULL THEN paid_amount ELSE coalesce(p_paid_amount, paid_amount) END
  WHERE id = v_id;

  RETURN QUERY SELECT v_id, 'updated'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION import_upsert_customer(uuid, text, text, text, text, text, numeric, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION import_upsert_sales_invoice(uuid, text, date, uuid, text, numeric, numeric, numeric, numeric, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION import_upsert_customer(uuid, text, text, text, text, text, numeric, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION import_upsert_sales_invoice(uuid, text, date, uuid, text, numeric, numeric, numeric, numeric, text, text) TO authenticated;

COMMENT ON FUNCTION import_upsert_customer IS 'Canonical authenticated import gateway for customer upsert with tenant enforcement.';
COMMENT ON FUNCTION import_upsert_sales_invoice IS 'Canonical authenticated import gateway for sales invoice upsert with tenant and customer enforcement.';
