-- Restore the authenticated read boundary required by the Alternative Groups UI.
-- RLS remains the tenant boundary; anonymous access stays explicitly denied.
grant select on table public.alternative_item_groups to authenticated;
grant select on table public.alternative_item_group_members to authenticated;
revoke all on table public.alternative_item_groups from anon;
revoke all on table public.alternative_item_group_members from anon;
