DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['alerts','branches','categories','customers','data_quality_reports','file_records','forecasts','import_jobs','import_profiles','import_snapshots','imports','inventory_balances','inventory_movements','payments','products','purchase_invoices','sales_invoices','suppliers','warehouses'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t); END IF;
  END LOOP;
END $$;