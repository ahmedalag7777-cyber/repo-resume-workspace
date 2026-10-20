-- Restore the authenticated execution contract for report export RPCs.
-- These functions are consumed by the authenticated Reports UI. They are
-- SECURITY DEFINER and fail closed on tenant mismatch; anon remains denied.
-- A later hardening migration revoked authenticated EXECUTE, which made the
-- current ReportsPage export actions fail at runtime despite the canonical
-- export migration granting authenticated execution.

GRANT EXECUTE ON FUNCTION public.get_inventory_export_rows(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_export_rows(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_purchase_export_rows(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_receivables_export_rows(uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_inventory_export_rows(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sales_export_rows(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_purchase_export_rows(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_receivables_export_rows(uuid, integer) FROM anon;
