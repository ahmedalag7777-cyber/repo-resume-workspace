-- Complete audit coverage for the canonical recommendation-to-decision boundary.
drop trigger if exists trg_recommendation_runtime_audit on public.recommendations;
create trigger trg_recommendation_runtime_audit
after insert or update or delete on public.recommendations
for each row
execute function public.audit_decision_runtime_change();

drop trigger if exists trg_business_decision_runtime_audit on public.business_intelligence_decisions;
create trigger trg_business_decision_runtime_audit
after insert or update or delete on public.business_intelligence_decisions
for each row
execute function public.audit_decision_runtime_change();
