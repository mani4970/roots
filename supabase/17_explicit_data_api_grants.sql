-- Explicit Data API grants for existing Roots support tables.
--
-- Keep this file for the planned 1.1 deployment/check window.
-- Do not run broad security hardening SQL during live stabilization without regression testing.
-- These grants are intentionally limited to authenticated/service_role; no anon grants are added.

-- Reports: app users can create/read their own reports through RLS; service role can moderate.
grant select, insert on public.content_reports to authenticated;
grant select, insert, update, delete on public.content_reports to service_role;

-- Hidden community content: users manage only their own hidden rows through RLS.
grant select, insert, update, delete on public.hidden_community_items to authenticated;
grant select, insert, update, delete on public.hidden_community_items to service_role;

-- Hidden community authors: users manage only their own hidden rows through RLS.
grant select, insert, update, delete on public.hidden_community_users to authenticated;
grant select, insert, update, delete on public.hidden_community_users to service_role;
