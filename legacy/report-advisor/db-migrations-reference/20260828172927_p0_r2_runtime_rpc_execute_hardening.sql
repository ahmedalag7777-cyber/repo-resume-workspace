REVOKE ALL ON FUNCTION public.request_decision_approval(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_approval(uuid,boolean,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_decision_approval(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_approval(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) TO authenticated;
