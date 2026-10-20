-- CYCLE-015 follow-up: close SECURITY DEFINER default PUBLIC EXECUTE exposure.
-- SECURITY DEFINER lifecycle RPCs are authenticated-only APIs.

REVOKE ALL ON FUNCTION public.create_runtime_recommendation(text,text,text,text,jsonb,numeric,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_runtime_recommendation(text,text,text,text,jsonb,numeric,uuid,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.create_runtime_decision(text,text,numeric,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_runtime_decision(text,text,numeric,numeric,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.notify_decision_work_item(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_decision_work_item(uuid,text,text) TO authenticated;
