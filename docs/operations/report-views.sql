-- Install after install.sql. Private read-only views for SQL Editor / service_role.
begin;
create view public.app_ops_cases with (security_invoker = true) as
select e.event_id as error_event_id, e.received_at, e.client_at, e.user_id, e.session_id,
  e.flow_id, e.scope, e.event_name, e.client_kind, e.details->>'release' as release,
  e.details->>'native_version' as native_version, e.details->>'native_build' as native_build,
  e.details->>'browser_name' as browser_name, e.details->>'browser_major' as browser_major,
  e.details->>'phase' as phase, e.details->>'auth_action' as auth_action,
  e.details->>'error_code' as error_code, e.details->>'error_kind' as error_kind,
  case when e.details->>'error_code' in ('invalid_credentials','user_already_exists','email_exists','email_not_confirmed','weak_password','validation_failed','email_address_invalid') then 'expected_input'
    when e.details->>'error_kind' in ('resize_observer','script_redacted') then 'browser_warning'
    when e.event_name in ('popup_overlap','popup_unshown','draft_local_only') then 'warning'
    else 'investigate' end as category,
  coalesce(e.record_id, r.record_id) as record_id,
  recovery.event_name as recovery_event, recovery.client_at as recovery_client_at,
  case when recovery.event_name is null then 'no_recovery_evidence' else 'client_reported_recovery' end as recovery_state,
  recovery.user_id as later_authenticated_user_id,
  notice.details->>'notice_key' as notice_key, notice.client_at as notice_rendered_at,
  ui.completion_visible_at, ui.completion_confirmed_at, ui.retries_after_error
from public.app_ops_events e
left join lateral (
  select s.record_id from public.app_ops_events s
  where s.flow_id = e.flow_id and s.user_id is not distinct from e.user_id
    and (e.user_id is not null or s.session_id = e.session_id) and s.record_id is not null
  order by s.client_at desc limit 1
) r on true
left join lateral (
  select s.event_name,s.client_at,s.user_id from public.app_ops_events s
  where s.flow_id = e.flow_id and s.scope = e.scope
    and (s.user_id is not distinct from e.user_id or (e.scope = 'auth' and e.user_id is null))
    and (e.user_id is not null or s.session_id = e.session_id)
    and s.client_at > e.client_at
    and (
      (e.event_name in ('draft_error','draft_local_only') and s.event_name in ('draft_saved','save_ok','completion_ready')) or
      (e.event_name = 'save_error' and s.event_name in ('save_ok','completion_ready')) or
      (e.event_name = 'progress_error' and s.event_name = 'progress_ok') or
      (e.event_name = 'recipients_error' and s.event_name = 'recipients_ok' and (e.details->>'phase' is null or s.details->>'phase' = e.details->>'phase')) or
      (e.event_name = 'stage_failed' and s.event_name = 'stage_succeeded' and s.details->>'phase' = e.details->>'phase') or
      (e.event_name = 'action_failed' and s.event_name = 'action_completed') or
      (e.event_name = 'auth_failed' and s.event_name = 'auth_succeeded' and s.details->>'auth_action' = e.details->>'auth_action')
    )
  order by s.client_at limit 1
) recovery on true
left join lateral (
  select s.details,s.client_at from public.app_ops_events s
  where s.flow_id = e.flow_id and s.event_name = 'notice_rendered'
    and s.session_id = e.session_id and s.client_at >= e.client_at
    and s.details->>'attempt' = e.details->>'attempt'
    and s.details->>'auth_action' = e.details->>'auth_action'
  order by s.client_at limit 1
) notice on true
left join lateral (
  select min(s.client_at) filter (where s.event_name='completion_visible') as completion_visible_at,
    min(s.client_at) filter (where s.event_name='completion_confirmed') as completion_confirmed_at,
    count(*) filter (where s.event_name in ('retry_clicked','automatic_retry') or (s.event_name='auth_requested' and s.details->>'retry'='true')) as retries_after_error
  from public.app_ops_events s where s.flow_id=e.flow_id and s.scope=e.scope
    and s.user_id is not distinct from e.user_id and (e.user_id is not null or s.session_id=e.session_id)
    and s.client_at >= e.client_at
) ui on true
where e.event_name in ('client_error','draft_error','draft_local_only','save_error','progress_error','recipients_error','stage_failed','action_failed','auth_failed','popup_overlap','popup_unshown');

create view public.app_ops_health_report with (security_invoker = true) as
select s.enabled, s.protocol, s.detail_until,
  (select max(received_at) from public.app_ops_events) as last_received_at,
  (select count(*) from public.app_ops_events where received_at >= now()-interval '24 hours') as events_24h,
  (select count(distinct user_id) from public.app_ops_events where received_at >= now()-interval '24 hours') as observed_users_24h,
  (select coalesce(sum((details->>'count')::integer),0) from public.app_ops_events where event_name='telemetry_dropped' and received_at >= now()-interval '24 hours') as reported_lost_events_24h,
  (select count(*) from public.app_ops_events where received_at >= now()-interval '24 hours' and details->>'release' in ('local','unknown')) as unknown_release_events_24h,
  coalesce((select used from public.app_ops_limits where bucket='global' and period_start = date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0) as traffic_today,
  s.daily_event_limit, m.last_cleanup_at, m.deleted_events,
  case when not s.enabled then 'disabled'
    when not exists(select 1 from public.app_ops_events where received_at >= now()-interval '30 minutes') then 'no_recent_evidence'
    else 'partial_client_coverage' end as coverage
from public.app_ops_settings s cross join public.app_ops_maintenance m;

create view public.app_ops_daily_totals with (security_invoker = true) as
select (received_at at time zone 'UTC')::date as day_utc,scope,event_name,client_kind,details->>'release' as release,
  count(*) as events, count(distinct user_id) as authenticated_users, count(distinct flow_id) as flows
from public.app_ops_events group by 1,2,3,4,5;
revoke all on public.app_ops_cases,public.app_ops_health_report,public.app_ops_daily_totals from public,anon,authenticated;
grant select on public.app_ops_cases,public.app_ops_health_report,public.app_ops_daily_totals to service_role;
commit;
