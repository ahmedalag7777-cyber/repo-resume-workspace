-- Fail-closed verification for CYCLE-005 reconstructed invariants.
DO $$
DECLARE required text[] := ARRAY['sales_invoices.sales_invoices_currency_nonblank','sales_invoices.sales_invoices_nonnegative_amounts','purchase_invoices.purchase_invoices_currency_nonblank','purchase_invoices.purchase_invoices_nonnegative_amounts','sale_items.sale_items_nonnegative_amounts','purchase_items.purchase_items_nonnegative_amounts','payments.payments_amount_positive','payments.payments_currency_nonblank','payments.payments_date_not_future','payments.payments_direction_valid','inventory_movements.inventory_movements_quantity_positive','inventory_movements.inventory_movements_date_not_future','business_intelligence_decisions.decisions_confidence_range','business_intelligence_decisions.decisions_evidence_object','business_intelligence_decisions.decision_approval_consistency','business_intelligence_decisions.decision_execution_consistency','decision_approvals.approvals_evidence_object','decision_approvals.decision_approval_temporal_ck','decision_work_items.work_item_temporal_ck','decision_outcomes.decision_outcome_has_value','decision_outcomes.decision_outcome_observed_before_recorded','decision_outcomes.decision_outcome_label_values','recommendation_outcomes.recommendation_outcome_evidence_object','recommendations.recommendations_evidence_object']; item text; parts text[];
BEGIN
  FOREACH item IN ARRAY required LOOP
    parts:=string_to_array(item,'.');
    IF to_regclass('public.'||parts[1]) IS NULL THEN RAISE EXCEPTION 'CYCLE005_REQUIRED_TABLE_MISSING: %',parts[1]; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid=to_regclass('public.'||parts[1]) AND c.conname=parts[2]) THEN RAISE EXCEPTION 'CYCLE005_REQUIRED_CONSTRAINT_MISSING: %',item; END IF;
  END LOOP;
END $$;
