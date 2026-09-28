-- 최초 설치 통합 파일. 아래 세 단계를 순서대로 실행하며 수집은 OFF로 남습니다.
-- 이미 설치한 프로젝트에는 재실행하지 마세요. 부분 실패 시 README의 복구 안내를 사용하세요.

-- Roots operational diagnostics v3. Run ONCE in Supabase SQL Editor.
-- Creates only app_ops_* objects. Existing Auth/business tables and policies are unchanged.
-- Collection stays OFF until enable.sql is explicitly executed after deployment.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

create table public.app_ops_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  protocol integer not null default 3 check (protocol = 3),
  daily_event_limit integer not null default 25000 check (daily_event_limit between 1000 and 100000),
  detail_started_at timestamptz,
  detail_until timestamptz,
  created_at timestamptz not null default now(),
  check ((detail_started_at is null and detail_until is null) or
    (detail_started_at is not null and detail_until > detail_started_at and detail_until <= detail_started_at + interval '7 days'))
);
insert into public.app_ops_settings (id) values (true);

create table public.app_ops_events (
  event_id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid not null,
  flow_id uuid not null,
  scope text not null check (scope in ('qt_write', 'qt_photo', 'prayer', 'home', 'home_popup', 'app', 'auth')),
  event_name text not null check (event_name in ('auth_requested', 'auth_succeeded', 'auth_failed', 'auth_redirect_started', 'notice_rendered', 'app_heartbeat', 'flow_started', 'client_error', 'app_ready', 'app_backgrounded', 'app_foregrounded', 'telemetry_dropped', 'draft_requested', 'draft_saved', 'draft_error', 'draft_skipped', 'draft_local_only', 'complete_clicked', 'save_requested', 'save_error', 'save_ok', 'save_skipped', 'body_saved', 'progress_requested', 'progress_ok', 'progress_error', 'progress_skipped', 'recipients_requested', 'recipients_ok', 'recipients_error', 'retry_shown', 'retry_clicked', 'completion_ready', 'completion_visible', 'completion_confirmed', 'automatic_retry', 'action_started', 'stage_started', 'stage_succeeded', 'stage_failed', 'action_completed', 'action_failed', 'popup_queued', 'popup_visible', 'popup_overlap', 'popup_acknowledged', 'popup_closed', 'popup_unshown', 'popup_eligibility_checked')),
  client_kind text not null check (client_kind in ('web-android', 'web-ios', 'web-ipad', 'web-mac', 'web-desktop', 'native-ios', 'native-ipad', 'native-android', 'unknown')),
  build_tag text not null check (build_tag = 'obs-20260916-v1'),
  record_id uuid,
  client_at timestamptz not null,
  received_at timestamptz not null default now(),
  elapsed_ms integer check (elapsed_ms between 0 and 86400000),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 2048),

  check ((details - array['browser_name','browser_major','native_version','native_build','action','attempt','auth_action','auth_stage','automatic','caller_column','caller_line','caller_script','cause_name','count','diagnostic_version','eligible','error_code','error_column','error_kind','error_line','error_name','error_present','error_script','existing_record','foreground','http_status','interrupted','local_backup','measurement','message_present','mode','notice_key','online','outcome','past_date','persisted','phase','progress_days','reason','recovery','reduced_motion','release','retry','reward_kind','route','sharing_failed','source','streak_days','total_days','updated','upload_attempt','wrapper_code']::text[]) = '{}'::jsonb),
  check (user_id is not null or (scope = 'auth' and record_id is null and event_name in
    ('flow_started','auth_requested','auth_succeeded','auth_failed','auth_redirect_started','notice_rendered')))
);
create index app_ops_events_received on public.app_ops_events(received_at desc);
create index app_ops_events_user_record on public.app_ops_events(user_id, record_id, received_at desc) where user_id is not null;
create index app_ops_events_flow on public.app_ops_events(flow_id, session_id, client_at);

create table public.app_ops_limits (
  bucket text not null check (length(bucket) <= 80),
  period_start timestamptz not null,
  used integer not null check (used >= 0),
  primary key(bucket, period_start)
);
create index app_ops_limits_age on public.app_ops_limits(period_start);
create table public.app_ops_maintenance (
  id boolean primary key default true check (id),
  last_cleanup_at timestamptz,
  deleted_events bigint not null default 0
);
insert into public.app_ops_maintenance(id) values (true);

alter table public.app_ops_settings enable row level security;
alter table public.app_ops_events enable row level security;
alter table public.app_ops_limits enable row level security;
alter table public.app_ops_maintenance enable row level security;
revoke all on public.app_ops_settings, public.app_ops_events, public.app_ops_limits, public.app_ops_maintenance from public, anon, authenticated;
grant select, insert, update, delete on public.app_ops_settings, public.app_ops_events, public.app_ops_limits, public.app_ops_maintenance to service_role;

create function public.ingest_app_ops(p_user_id uuid, p_session_id uuid, p_network_bucket text, p_events jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  n integer;
  quota integer;
  enabled_now boolean;
  used_now integer;
  minute_start timestamptz := date_trunc('minute', now());
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  actor text := case when p_user_id is null then 'guest:' || p_session_id::text else 'user:' || p_user_id::text end;
begin
  select enabled, daily_event_limit into enabled_now, quota from public.app_ops_settings where id;
  if enabled_now is distinct from true then return jsonb_build_object('ok', true, 'disabled', true, 'accepted', 0); end if;
  if p_session_id is null or p_network_bucket is null or p_network_bucket !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_events) is distinct from 'array' then raise exception 'invalid batch'; end if;
  n := jsonb_array_length(p_events);
  if n < 1 or n > 30 then raise exception 'invalid batch size'; end if;
  -- One transaction / fixed lock order: concurrent workers cannot overrun these caps.
  -- Retransmissions count against traffic caps but cannot overwrite stored evidence.
  insert into public.app_ops_limits as lim values ('global', day_start, n)
    on conflict(bucket, period_start) do update set used = lim.used + n where lim.used + n <= quota returning used into used_now;
  if used_now is null then raise sqlstate 'PT429' using message = 'daily diagnostics limit'; end if;
  insert into public.app_ops_limits as lim values ('net:' || p_network_bucket, minute_start, n)
    on conflict(bucket, period_start) do update set used = lim.used + n where lim.used + n <= 2400 returning used into used_now;
  if used_now is null then raise sqlstate 'PT429' using message = 'network diagnostics limit'; end if;
  insert into public.app_ops_limits as lim values (actor, minute_start, n)
    on conflict(bucket, period_start) do update set used = lim.used + n
      where lim.used + n <= case when p_user_id is null then 60 else 240 end returning used into used_now;
  if used_now is null then raise sqlstate 'PT429' using message = 'actor diagnostics limit'; end if;
  insert into public.app_ops_events(event_id,user_id,session_id,flow_id,scope,event_name,client_kind,build_tag,record_id,client_at,elapsed_ms,details)
    select e.event_id,p_user_id,p_session_id,e.flow_id,e.scope,e.event_name,e.client_kind,e.build_tag,e.record_id,e.client_at,e.elapsed_ms,e.details
    from jsonb_to_recordset(p_events) as e(event_id uuid,flow_id uuid,scope text,event_name text,client_kind text,build_tag text,record_id uuid,client_at timestamptz,elapsed_ms integer,details jsonb)
    on conflict(event_id) do nothing;
  return jsonb_build_object('ok', true, 'accepted', n);
end;
$$;
revoke all on function public.ingest_app_ops(uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.ingest_app_ops(uuid,uuid,text,jsonb) to service_role;

create function public.cleanup_app_ops() returns bigint language plpgsql security invoker set search_path = '' as $$
declare removed bigint;
begin
  delete from public.app_ops_events where received_at < now() - interval '30 days';
  get diagnostics removed = row_count;
  delete from public.app_ops_limits where period_start < now() - interval '2 days';
  update public.app_ops_maintenance set last_cleanup_at = now(), deleted_events = deleted_events + removed where id;
  return removed;
end;
$$;
revoke all on function public.cleanup_app_ops() from public, anon, authenticated;
grant execute on function public.cleanup_app_ops() to service_role;
commit;


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


-- Run after install.sql. Installs Supabase Cron if absent, adds ONE named job.
-- Never unschedules or changes other jobs. Detailed data is kept for 30 days,
-- with up to one hour scheduling lag (longer if the scheduler is unhealthy).
begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('roots-ops-retention-v3', '17 * * * *', 'select public.cleanup_app_ops();');
select public.cleanup_app_ops();
commit;
-- Verify cron.job_run_details after the first scheduled run.
select jobid, jobname, schedule, active from cron.job where jobname = 'roots-ops-retention-v3';
