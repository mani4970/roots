-- Roots 1.6 notification foundation
-- Purpose:
-- - Add the database foundation for partner/group push notifications.
-- - Store user notification preferences, native push tokens, and notification rows.
--
-- Safety notes:
-- - This migration does NOT send push notifications yet.
-- - This migration does NOT change Bible Reflection completion/progress/streak logic.
-- - This migration does NOT change qt_records, daily_checkins, profiles progress fields,
--   prayer_items behavior, community feed visibility, group challenge logic, reward maps,
--   or storage behavior.
-- - There are no anon grants on these new tables.
-- - Explicit GRANTs, RLS, and policies are included for Supabase Data API readiness.

begin;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default true,
  group_notifications_enabled boolean not null default true,
  partner_notifications_enabled boolean not null default true,
  group_qt_enabled boolean not null default true,
  group_prayer_enabled boolean not null default true,
  group_answered_prayer_enabled boolean not null default true,
  partner_qt_enabled boolean not null default true,
  partner_prayer_enabled boolean not null default true,
  partner_answered_prayer_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Per-user Roots push notification preferences for partner and group activity.';
comment on column public.notification_preferences.push_enabled is
  'Master push notification switch for partner/group push notifications.';

alter table public.notification_preferences enable row level security;

drop policy if exists "roots_notification_preferences_select_own" on public.notification_preferences;
create policy "roots_notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "roots_notification_preferences_insert_own" on public.notification_preferences;
create policy "roots_notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "roots_notification_preferences_update_own" on public.notification_preferences;
create policy "roots_notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create table if not exists public.notification_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token_provider text not null check (token_provider in ('apns', 'fcm')),
  token text not null check (char_length(token) between 1 and 4096),
  device_id text,
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token_provider, token)
);

comment on table public.notification_push_tokens is
  'Native iOS/Android push tokens registered by signed-in Roots users.';
comment on column public.notification_push_tokens.token_provider is
  'Expected provider for delivery: apns for iOS APNs tokens, fcm for Android FCM tokens.';

create index if not exists notification_push_tokens_user_enabled_idx
  on public.notification_push_tokens (user_id, enabled, last_seen_at desc);

create index if not exists notification_push_tokens_provider_enabled_idx
  on public.notification_push_tokens (token_provider, enabled, last_seen_at desc);

alter table public.notification_push_tokens enable row level security;

drop policy if exists "roots_notification_push_tokens_select_own" on public.notification_push_tokens;
create policy "roots_notification_push_tokens_select_own"
on public.notification_push_tokens
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "roots_notification_push_tokens_insert_own" on public.notification_push_tokens;
create policy "roots_notification_push_tokens_insert_own"
on public.notification_push_tokens
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "roots_notification_push_tokens_update_own" on public.notification_push_tokens;
create policy "roots_notification_push_tokens_update_own"
on public.notification_push_tokens
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "roots_notification_push_tokens_delete_own" on public.notification_push_tokens;
create policy "roots_notification_push_tokens_delete_own"
on public.notification_push_tokens
for delete
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in (
    'group_qt_shared',
    'group_prayer_shared',
    'group_prayer_answered',
    'partner_qt_shared',
    'partner_prayer_shared',
    'partner_prayer_answered'
  )),
  scope text not null check (scope in ('group', 'partner')),
  group_id uuid references public.groups(id) on delete cascade,
  companion_user_id uuid references public.profiles(id) on delete cascade,
  qt_record_id uuid references public.qt_records(id) on delete cascade,
  prayer_item_id uuid references public.prayer_items(id) on delete cascade,
  locale text not null default 'ko' check (locale in ('ko', 'de', 'en', 'fr')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 240),
  deep_link text not null check (char_length(deep_link) between 1 and 500),
  push_status text not null default 'pending' check (push_status in ('pending', 'sent', 'failed', 'skipped')),
  push_sent_at timestamptz,
  push_error text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_scope_check check (
    (scope = 'group' and type in ('group_qt_shared', 'group_prayer_shared', 'group_prayer_answered') and group_id is not null and companion_user_id is null)
    or
    (scope = 'partner' and type in ('partner_qt_shared', 'partner_prayer_shared', 'partner_prayer_answered') and companion_user_id is not null and group_id is null)
  ),
  constraint notifications_content_target_check check (
    (type in ('group_qt_shared', 'partner_qt_shared') and qt_record_id is not null)
    or
    (type in ('group_prayer_shared', 'group_prayer_answered', 'partner_prayer_shared', 'partner_prayer_answered') and prayer_item_id is not null)
  )
);

comment on table public.notifications is
  'Per-recipient Roots notification rows for partner/group activity and future native push delivery.';
comment on column public.notifications.deep_link is
  'Internal app route target to open when the notification is tapped. Final route format must match tested community routing.';
comment on column public.notifications.push_status is
  'Delivery status for the future Edge Function / native push delivery step.';

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create index if not exists notifications_push_pending_idx
  on public.notifications (push_status, created_at)
  where push_status = 'pending';

create index if not exists notifications_group_idx
  on public.notifications (group_id, created_at desc)
  where group_id is not null;

create index if not exists notifications_partner_idx
  on public.notifications (companion_user_id, created_at desc)
  where companion_user_id is not null;

alter table public.notifications enable row level security;

drop policy if exists "roots_notifications_select_own" on public.notifications;
create policy "roots_notifications_select_own"
on public.notifications
for select
to authenticated
using (recipient_id = (select auth.uid()));

drop policy if exists "roots_notifications_mark_own_read" on public.notifications;
create policy "roots_notifications_mark_own_read"
on public.notifications
for update
to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

-- Clean up broad default privileges first because existing project default privileges
-- may be wider than desired. Then add only the explicit minimum grants needed.
revoke all privileges on table public.notification_preferences from public;
revoke all privileges on table public.notification_preferences from anon;
revoke all privileges on table public.notification_preferences from authenticated;
revoke all privileges on table public.notification_preferences from service_role;

grant select, insert, update on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.notification_preferences to service_role;

revoke all privileges on table public.notification_push_tokens from public;
revoke all privileges on table public.notification_push_tokens from anon;
revoke all privileges on table public.notification_push_tokens from authenticated;
revoke all privileges on table public.notification_push_tokens from service_role;

grant select, insert, update, delete on table public.notification_push_tokens to authenticated;
grant select, insert, update, delete on table public.notification_push_tokens to service_role;

revoke all privileges on table public.notifications from public;
revoke all privileges on table public.notifications from anon;
revoke all privileges on table public.notifications from authenticated;
revoke all privileges on table public.notifications from service_role;

grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant select, insert, update, delete on table public.notifications to service_role;

commit;
