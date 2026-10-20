-- Keep the SECURITY DEFINER decision action boundary authenticated-only.
REVOKE EXECUTE ON FUNCTION public.create_decision_work_item(uuid, uuid, text, uuid, text, text, text, text, timestamptz, numeric, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_decision_work_item(uuid, uuid, text, uuid, text, text, text, text, timestamptz, numeric, jsonb) TO authenticated;
