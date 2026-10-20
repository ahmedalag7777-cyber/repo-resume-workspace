-- Runtime audit hardening: every approval/work-item/action-receipt mutation emits an immutable audit row.
CREATE OR REPLACE FUNCTION public.audit_decision_runtime_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid; v_entity_id uuid; v_action text;
BEGIN
  v_company := COALESCE(NEW.company_id, OLD.company_id);
  IF v_company IS NULL OR v_company <> public.current_company_id() THEN
    RAISE EXCEPTION 'AUDIT_TENANT_CONTEXT_MISMATCH';
  END IF;
  v_entity_id := COALESCE(NEW.id, OLD.id);
  v_action := TG_TABLE_NAME || ':' || lower(TG_OP);
  INSERT INTO public.audit_logs(company_id, action, entity_type, entity_id, old_value, new_value, source, user_label, correlation_id)
  VALUES (
    v_company, v_action, TG_TABLE_NAME, v_entity_id,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    'decision-runtime', auth.uid()::text, v_entity_id::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_decision_approval_audit ON public.decision_approvals;
CREATE TRIGGER trg_decision_approval_audit AFTER INSERT OR UPDATE OR DELETE ON public.decision_approvals
FOR EACH ROW EXECUTE FUNCTION public.audit_decision_runtime_change();

DROP TRIGGER IF EXISTS trg_decision_work_item_audit ON public.decision_work_items;
CREATE TRIGGER trg_decision_work_item_audit AFTER INSERT OR UPDATE OR DELETE ON public.decision_work_items
FOR EACH ROW EXECUTE FUNCTION public.audit_decision_runtime_change();

DROP TRIGGER IF EXISTS trg_decision_action_receipt_audit ON public.decision_action_receipts;
CREATE TRIGGER trg_decision_action_receipt_audit AFTER INSERT OR UPDATE OR DELETE ON public.decision_action_receipts
FOR EACH ROW EXECUTE FUNCTION public.audit_decision_runtime_change();

REVOKE ALL ON FUNCTION public.audit_decision_runtime_change() FROM PUBLIC;
