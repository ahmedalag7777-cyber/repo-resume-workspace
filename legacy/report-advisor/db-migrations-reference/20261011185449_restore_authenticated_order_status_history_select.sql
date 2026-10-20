-- Reconcile staging ACL drift for order status history reads.
-- Tenant isolation remains enforced by RLS policy order_status_history_staff_read.
-- Only authenticated SELECT is restored; anon and authenticated DML remain ungranted.
GRANT SELECT ON TABLE public.order_status_history TO authenticated;
