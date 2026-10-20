-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default unless revoked.
-- The canonical decision action RPC is SECURITY DEFINER and must be callable only by authenticated users.
REVOKE EXECUTE ON FUNCTION public.create_decision_work_item(uuid, uuid, text, uuid, text, text, text, text, timestamptz, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_decision_work_item(uuid, uuid, text, uuid, text, text, text, text, timestamptz, numeric, jsonb) TO authenticated;
