-- READ ONLY. Run after the observation migration with an administrative read connection.
-- Both new tables: RLS=true. PUBLIC/anon/authenticated: no table privileges.
-- service_role: campaigns SELECT/UPDATE, events SELECT/INSERT only.
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('app_observation_campaigns', 'app_observation_events');

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('app_observation_campaigns', 'app_observation_events')
order by table_name, grantee, privilege_type;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename in ('app_observation_campaigns', 'app_observation_events');

select campaign_key, enabled, starts_at, ends_at, build_tag,
  enabled and starts_at <= now() and now() < ends_at as currently_active
from public.app_observation_campaigns
where campaign_key = 'roots-observation-20260916';

-- An empty observation result means no received observations in this window,
-- not zero business errors. Use business rows and telemetry coverage together.
select scope, event_name, count(*) as event_count, count(distinct user_id) as reporting_users
from public.app_observation_events
where campaign_key = 'roots-observation-20260916' and received_at >= now() - interval '24 hours'
group by scope, event_name
order by scope, event_name;
