-- Remove legacy duplicate single-column foreign keys that conflict with
-- canonical *_id_fkey definitions. The canonical constraints retain the
-- intended ON DELETE behavior already present in the current database.

ALTER TABLE public.inventory_balances
  DROP CONSTRAINT IF EXISTS inventory_balances_product_fk;

ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_product_fk;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_customer_fk,
  DROP CONSTRAINT IF EXISTS payments_supplier_fk;

ALTER TABLE public.purchase_invoices
  DROP CONSTRAINT IF EXISTS purchase_invoices_supplier_fk;

ALTER TABLE public.purchase_items
  DROP CONSTRAINT IF EXISTS purchase_items_product_fk,
  DROP CONSTRAINT IF EXISTS purchase_items_invoice_fk;

ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_product_fk,
  DROP CONSTRAINT IF EXISTS sale_items_invoice_fk;

ALTER TABLE public.sales_invoices
  DROP CONSTRAINT IF EXISTS sales_invoices_customer_fk;
