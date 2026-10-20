-- Empty datasets are EMPTY, not perfect quality.
CREATE OR REPLACE FUNCTION public.get_data_quality_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  WITH c AS (
    SELECT count(*)::int total,
      count(*) FILTER (WHERE nullif(btrim(name),'') IS NULL)::int missing_name,
      count(*) FILTER (WHERE nullif(btrim(phone),'') IS NULL)::int missing_phone,
      count(*) FILTER (WHERE nullif(btrim(code),'') IS NULL)::int missing_code,
      coalesce((SELECT sum(n) FROM (SELECT count(*) n FROM customers WHERE company_id=v_company AND nullif(btrim(name),'') IS NOT NULL GROUP BY btrim(name) HAVING count(*)>1)x),0)::int duplicate_names FROM customers WHERE company_id=v_company
  ), p AS (
    SELECT count(*)::int total,
      count(*) FILTER (WHERE nullif(btrim(sku),'') IS NULL)::int missing_sku,
      count(*) FILTER (WHERE nullif(btrim(name),'') IS NULL)::int missing_name,
      count(*) FILTER (WHERE selling_price IS NOT NULL AND selling_price<=0)::int zero_price,
      count(*) FILTER (WHERE (cost_price IS NOT NULL AND cost_price<0) OR (selling_price IS NOT NULL AND selling_price<0))::int negative_price,
      coalesce((SELECT sum(n) FROM (SELECT count(*) n FROM products WHERE company_id=v_company AND nullif(btrim(sku),'') IS NOT NULL GROUP BY btrim(sku) HAVING count(*)>1)x),0)::int duplicate_sku FROM products WHERE company_id=v_company
  ), i AS (
    SELECT count(*)::int total,
      count(*) FILTER (WHERE total IS NOT NULL AND total<=0)::int zero_total,
      count(*) FILTER (WHERE total IS NOT NULL AND total<0)::int negative_total,
      count(*) FILTER (WHERE paid_amount IS NOT NULL AND total IS NOT NULL AND paid_amount>total)::int paid_exceeds,
      count(*) FILTER (WHERE customer_id IS NULL)::int missing_customer,
      count(*) FILTER (WHERE invoice_date IS NULL)::int missing_date,
      coalesce((SELECT sum(n) FROM (SELECT count(*) n FROM sales_invoices WHERE company_id=v_company AND nullif(btrim(invoice_number),'') IS NOT NULL GROUP BY btrim(invoice_number) HAVING count(*)>1)x),0)::int duplicate_number FROM sales_invoices WHERE company_id=v_company
  ), b AS (
    SELECT count(*)::int total,
      count(*) FILTER (WHERE quantity IS NOT NULL AND quantity<0)::int negative_quantity,
      count(*) FILTER (WHERE unit_cost IS NOT NULL AND unit_cost<0)::int negative_cost,
      count(*) FILTER (WHERE product_id IS NULL)::int missing_product FROM inventory_balances WHERE company_id=v_company
  ), m AS (
    SELECT c.total customer_total,c.missing_name customer_missing_name,c.missing_phone customer_missing_phone,c.missing_code customer_missing_code,c.duplicate_names customer_duplicate_names,
      p.total product_total,p.missing_sku product_missing_sku,p.missing_name product_missing_name,p.zero_price product_zero_price,p.negative_price product_negative_price,p.duplicate_sku product_duplicate_sku,
      i.total invoice_total,i.zero_total invoice_zero_total,i.negative_total invoice_negative_total,i.paid_exceeds invoice_paid_exceeds,i.missing_customer invoice_missing_customer,i.missing_date invoice_missing_date,i.duplicate_number invoice_duplicate_number,
      b.total balance_total,b.negative_quantity balance_negative_quantity,b.negative_cost balance_negative_cost,b.missing_product balance_missing_product FROM c,p,i,b
  ), n AS (
    SELECT *,customer_missing_name+customer_missing_phone+customer_missing_code+customer_duplicate_names customer_issues,
      product_missing_sku+product_missing_name+product_zero_price+product_negative_price+product_duplicate_sku product_issues,
      invoice_zero_total+invoice_negative_total+invoice_paid_exceeds+invoice_missing_customer+invoice_missing_date+invoice_duplicate_number invoice_issues,
      balance_negative_quantity+balance_negative_cost+balance_missing_product balance_issues FROM m
  )
  SELECT jsonb_build_object(
    'status',case when customer_total+product_total+invoice_total+balance_total=0 then 'EMPTY' else 'OK' end,
    'tenant_id',v_company,
    'entities',case when customer_total+product_total+invoice_total+balance_total=0 then '[]'::jsonb else jsonb_build_array(
      jsonb_build_object('name','العملاء','total',customer_total,'issues',customer_issues,'score',case when customer_total>0 then greatest(0,least(100,round(((customer_total-customer_issues)::numeric/customer_total)*100))) else 0 end,'icon','users'),
      jsonb_build_object('name','المنتجات','total',product_total,'issues',product_issues,'score',case when product_total>0 then greatest(0,least(100,round(((product_total-product_issues)::numeric/product_total)*100))) else 0 end,'icon','package'),
      jsonb_build_object('name','الفواتير','total',invoice_total,'issues',invoice_issues,'score',case when invoice_total>0 then greatest(0,least(100,round(((invoice_total-invoice_issues)::numeric/invoice_total)*100))) else 0 end,'icon','receipt'),
      jsonb_build_object('name','المخزون','total',balance_total,'issues',balance_issues,'score',case when balance_total>0 then greatest(0,least(100,round(((balance_total-balance_issues)::numeric/balance_total)*100))) else 0 end,'icon','warehouse')) end,
    'issues',case when customer_total+product_total+invoice_total+balance_total=0 then '[]'::jsonb else jsonb_build_array(
      jsonb_build_object('entity','العملاء','field','الاسم','issue','اسم فارغ','count',customer_missing_name,'severity','critical'),jsonb_build_object('entity','العملاء','field','الهاتف','issue','هاتف فارغ','count',customer_missing_phone,'severity','warning'),jsonb_build_object('entity','العملاء','field','الكود','issue','كود فارغ','count',customer_missing_code,'severity','info'),jsonb_build_object('entity','العملاء','field','الاسم','issue','أسماء مكررة','count',customer_duplicate_names,'severity','warning'),
      jsonb_build_object('entity','المنتجات','field','SKU','issue','SKU فارغ','count',product_missing_sku,'severity','critical'),jsonb_build_object('entity','المنتجات','field','الاسم','issue','اسم فارغ','count',product_missing_name,'severity','critical'),jsonb_build_object('entity','المنتجات','field','السعر','issue','سعر صفري','count',product_zero_price,'severity','warning'),jsonb_build_object('entity','المنتجات','field','السعر','issue','سعر سالب','count',product_negative_price,'severity','critical'),jsonb_build_object('entity','المنتجات','field','SKU','issue','SKU مكرر','count',product_duplicate_sku,'severity','critical'),
      jsonb_build_object('entity','الفواتير','field','الإجمالي','issue','إجمالي صفري','count',invoice_zero_total,'severity','warning'),jsonb_build_object('entity','الفواتير','field','الإجمالي','issue','إجمالي سالب','count',invoice_negative_total,'severity','critical'),jsonb_build_object('entity','الفواتير','field','المدفوع','issue','مدفوع يتجاوز الإجمالي','count',invoice_paid_exceeds,'severity','critical'),jsonb_build_object('entity','الفواتير','field','العميل','issue','عميل فارغ','count',invoice_missing_customer,'severity','critical'),jsonb_build_object('entity','الفواتير','field','التاريخ','issue','تاريخ فارغ','count',invoice_missing_date,'severity','critical'),jsonb_build_object('entity','الفواتير','field','رقم الفاتورة','issue','أرقام مكررة','count',invoice_duplicate_number,'severity','warning'),
      jsonb_build_object('entity','المخزون','field','الكمية','issue','كمية سالبة','count',balance_negative_quantity,'severity','critical'),jsonb_build_object('entity','المخزون','field','التكلفة','issue','تكلفة سالبة','count',balance_negative_cost,'severity','critical'),jsonb_build_object('entity','المخزون','field','المنتج','issue','منتج فارغ','count',balance_missing_product,'severity','critical')) end
  ) INTO v_result FROM n;
  RETURN v_result;
END;
$function$;
