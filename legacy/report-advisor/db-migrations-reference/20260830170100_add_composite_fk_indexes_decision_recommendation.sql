-- Cover composite tenant-bound foreign keys used by decision/recommendation joins.
CREATE INDEX IF NOT EXISTS idx_bi_decisions_company_recommendation
  ON public.business_intelligence_decisions (company_id, recommendation_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_company_decision
  ON public.recommendations (company_id, decision_id);
