-- Reconcile live-only work item completion constraint with the canonical outcome contract.
-- COMPLETED requires a completion timestamp, but actual_impact may remain NULL when the
-- canonical outcome status is insufficient / impact is not available.
ALTER TABLE public.decision_work_items
  DROP CONSTRAINT IF EXISTS work_item_completed_consistency;

ALTER TABLE public.decision_work_items
  ADD CONSTRAINT work_item_completed_consistency
  CHECK (
    (status = 'COMPLETED' AND completed_at IS NOT NULL)
    OR status <> 'COMPLETED'
  );
