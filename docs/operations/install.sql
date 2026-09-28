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
