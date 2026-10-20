-- Recovered from the live certification project on 2026-08-30.
-- Historical source was not available in the current repository history; the live
-- function definitions are mirrored verbatim so a fresh replay provides the same
-- canonical lifecycle mutation boundary used by the application.

CREATE OR REPLACE FUNCTION public.mark_alert_read(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_company_id uuid;
begin
  v_company_id := public.current_company_id();
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  update public.alerts
     set is_read = true
   where id = p_alert_id
     and company_id = v_company_id;
  if not found then raise exception 'ALERT_NOT_FOUND_OR_FORBIDDEN'; end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_recommendation_status(p_recommendation_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_company_id uuid;
begin
  v_company_id := public.current_company_id();
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_status is null or btrim(p_status) = '' then raise exception 'RECOMMENDATION_STATUS_REQUIRED'; end if;
  if lower(p_status) not in ('new','in_progress','completed','dismissed','approved','rejected') then
    raise exception 'INVALID_RECOMMENDATION_STATUS';
  end if;
  update public.recommendations
     set status = lower(p_status)
   where id = p_recommendation_id
     and company_id = v_company_id;
  if not found then raise exception 'RECOMMENDATION_NOT_FOUND_OR_FORBIDDEN'; end if;
end;
$function$;

REVOKE ALL ON FUNCTION public.mark_alert_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_alert_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_alert_read(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_recommendation_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_recommendation_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_recommendation_status(uuid, text) TO authenticated;
