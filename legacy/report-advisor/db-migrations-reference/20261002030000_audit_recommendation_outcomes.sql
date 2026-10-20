-- Close the decision lifecycle audit boundary for persisted recommendation outcomes.
-- The existing decision-runtime audit trigger is tenant-bound and records the
-- canonical old/new row states. Recommendation outcomes are the durable
-- outcome/learning record, so they must be included in the same audit boundary.
drop trigger if exists trg_recommendation_outcome_audit on public.recommendation_outcomes;

create trigger trg_recommendation_outcome_audit
after insert or update or delete on public.recommendation_outcomes
for each row
execute function public.audit_decision_runtime_change();
