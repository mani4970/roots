-- Temporary, server-only observation storage. No business tables/functions are changed.
-- The campaign stays disabled until the reviewed client/API deployment is ready.
-- Re-running this file does not activate, extend, or reset an existing campaign.
begin;

create table if not exists public.app_observation_campaigns (
  campaign_key text primary key,
  enabled boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  build_tag text not null,
  created_at timestamptz not null default now(),
  constraint app_observation_campaign_key_length check (length(campaign_key) between 1 and 80),
  constraint app_observation_campaign_build_length check (length(build_tag) between 1 and 80),
  constraint app_observation_campaign_window check (
    (starts_at is null and ends_at is null) or
    (starts_at is not null and ends_at is not null and ends_at > starts_at and ends_at <= starts_at + interval '7 days')
  ),
  constraint app_observation_enabled_has_window check (not enabled or (starts_at is not null and ends_at is not null))
);

create table if not exists public.app_observation_events (
  event_id uuid primary key,
  campaign_key text not null references public.app_observation_campaigns(campaign_key),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid not null,
  scope text not null,
  event_name text not null,
  client_kind text not null,
  build_tag text not null,
  record_id uuid,
  client_at timestamptz not null,
  received_at timestamptz not null default now(),
  elapsed_ms integer,
  details jsonb not null default '{}'::jsonb,
  constraint app_observation_scope check (scope in ('qt_write','qt_photo','prayer','home','home_popup','app')),
  constraint app_observation_event_name check (event_name in (
    'flow_started','client_error','app_ready','app_backgrounded','app_foregrounded','telemetry_dropped',
    'draft_requested','draft_saved','draft_error','draft_skipped','draft_local_only',
    'complete_clicked','save_requested','save_error','save_ok','save_skipped','body_saved',
    'progress_requested','progress_ok','progress_error','progress_skipped',
    'recipients_requested','recipients_ok','recipients_error','retry_shown','retry_clicked',
    'completion_ready','completion_visible','completion_confirmed','automatic_retry',
    'action_started','stage_started','stage_succeeded','stage_failed','action_completed','action_failed',
    'popup_queued','popup_visible','popup_overlap','popup_acknowledged','popup_closed','popup_unshown','popup_eligibility_checked'
  )),
  constraint app_observation_client_kind check (client_kind in (
    'web-android','web-ios','web-ipad','web-mac','web-desktop','native-ios','native-ipad','native-android','unknown'
  )),
  constraint app_observation_build_length check (length(build_tag) between 1 and 80),
  constraint app_observation_elapsed check (elapsed_ms is null or elapsed_ms between 0 and 86400000),
  constraint app_observation_details_shape check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 2048),
  constraint app_observation_details_keys check (
    details - array[
      'mode','phase','source','reason','reward_kind','action','measurement','outcome','error_code',
      'updated','eligible','foreground','interrupted','reduced_motion','automatic','recovery','persisted',
      'past_date','retry','local_backup','existing_record','sharing_failed',
      'streak_days','total_days','count','attempt','upload_attempt','progress_days'
    ]::text[] = '{}'::jsonb
  )
);

create index if not exists app_observation_events_campaign_received_idx
  on public.app_observation_events (campaign_key, received_at desc);
create index if not exists app_observation_events_user_received_idx
  on public.app_observation_events (user_id, received_at desc);
create index if not exists app_observation_events_flow_received_idx
  on public.app_observation_events (flow_id, received_at);

alter table public.app_observation_campaigns enable row level security;
alter table public.app_observation_events enable row level security;

-- RLS intentionally has no browser policies: only the server secret may access
-- these tables. No PUBLIC/anon/authenticated CRUD and no security-definer RPC.
revoke all on table public.app_observation_campaigns from public, anon, authenticated, service_role;
revoke all on table public.app_observation_events from public, anon, authenticated, service_role;
grant select, update on table public.app_observation_campaigns to service_role;
grant select, insert on table public.app_observation_events to service_role;

comment on table public.app_observation_campaigns is
  'Server-only technical observation configuration. Explicit activation; maximum seven-day window.';
comment on table public.app_observation_events is
  'Append-only client-reported technical events. Server authenticates identity and allowlists fields. No writing content, messages, URLs or recipients. Delete with auth user deletion.';
comment on column public.app_observation_events.client_at is
  'Advisory client clock; not a trusted success time. Daily ingestion/rate checks use server received_at.';
comment on column public.app_observation_events.record_id is
  'Optional correlation UUID only; its presence does not prove ownership or successful business persistence.';

insert into public.app_observation_campaigns (campaign_key, enabled, starts_at, ends_at, build_tag)
values ('roots-observation-20260916', false, null, null, 'obs-20260916-v1')
on conflict (campaign_key) do nothing;

notify pgrst, 'reload schema';
commit;
