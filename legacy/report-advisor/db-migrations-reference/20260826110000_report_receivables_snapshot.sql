DROP FUNCTION IF EXISTS public.report_receivables_snapshot(integer, integer, date);

CREATE OR REPLACE FUNCTION public.report_receivables_snapshot(
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 25,
  p_as_of_date date DEFAULT current_date
)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  customer_id uuid,
  invoice_number text,
  invoice_date date,
  due_date date,
  total numeric,
  paid_amount numeric,
  outstanding numeric,
  bucket text,
  total_rows bigint,
  total_outstanding numeric,
  undated_rows bigint,
  bucket_0_30 numeric,
  bucket_31_60 numeric,
  bucket_61_90 numeric,
  bucket_90_plus numeric,
  status text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH scoped AS (
  SELECT si.id, si.company_id, si.customer_id, si.invoice_number,
         si.invoice_date::date AS invoice_date, si.due_date::date AS due_date,
         si.total, si.paid_amount,
         (si.total - si.paid_amount) AS outstanding
  FROM public.sales_invoices si
  WHERE si.company_id = public.current_company_id()
    AND lower(coalesce(si.status, '')) NOT IN ('cancelled', 'canceled', 'void')
    AND si.total IS NOT NULL
    AND si.paid_amount IS NOT NULL
    AND (si.total - si.paid_amount) > 0
), classified AS (
  SELECT s.*,
    CASE
      WHEN s.due_date IS NULL THEN 'UNDATED'
      WHEN greatest(p_as_of_date - s.due_date, 0) <= 30 THEN '0-30'
      WHEN greatest(p_as_of_date - s.due_date, 0) <= 60 THEN '31-60'
      WHEN greatest(p_as_of_date - s.due_date, 0) <= 90 THEN '61-90'
      ELSE '90+'
    END AS bucket
  FROM scoped s
), metrics AS (
  SELECT count(*)::bigint AS total_rows,
         coalesce(sum(outstanding), 0)::numeric AS total_outstanding,
         count(*) FILTER (WHERE bucket = 'UNDATED')::bigint AS undated_rows,
         coalesce(sum(outstanding) FILTER (WHERE bucket = '0-30'), 0)::numeric AS bucket_0_30,
         coalesce(sum(outstanding) FILTER (WHERE bucket = '31-60'), 0)::numeric AS bucket_31_60,
         coalesce(sum(outstanding) FILTER (WHERE bucket = '61-90'), 0)::numeric AS bucket_61_90,
         coalesce(sum(outstanding) FILTER (WHERE bucket = '90+'), 0)::numeric AS bucket_90_plus
  FROM classified
), page AS (
  SELECT * FROM classified
  ORDER BY invoice_date DESC NULLS LAST, id DESC
  OFFSET greatest(p_page, 0) * greatest(p_page_size, 1)
  LIMIT greatest(least(p_page_size, 500), 1)
)
SELECT page.id, page.company_id, page.customer_id, page.invoice_number,
       page.invoice_date, page.due_date, page.total, page.paid_amount, page.outstanding,
       page.bucket,
       metrics.total_rows, metrics.total_outstanding, metrics.undated_rows,
       metrics.bucket_0_30, metrics.bucket_31_60, metrics.bucket_61_90, metrics.bucket_90_plus,
       CASE WHEN metrics.total_rows = 0 THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END
FROM page CROSS JOIN metrics;
$$;

REVOKE ALL ON FUNCTION public.report_receivables_snapshot(integer, integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_receivables_snapshot(integer, integer, date) TO authenticated;
