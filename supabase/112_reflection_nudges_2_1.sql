-- Christian Roots 2.1 reflection nudges
--
-- Purpose:
--   - Let accepted companions and joined groups encourage one another to
--     complete today's Bible Reflection.
--   - Enforce one partner nudge per sender/recipient/device-local date.
--   - Enforce one group nudge per group/device-local date.
--   - Keep the send ledger server-only and reuse the existing push pipeline.
--
-- Safety:
--   - Does not change Bible Reflection completion, progress, streak, rewards,
--     badges, gardens, the Ark map, challenges, prayers, or sharing.
--   - Does not grant anon or authenticated access to the send ledger.
--   - The application route verifies auth, accepted companion relationships,
--     group membership, completion state, and notification preferences.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists public.reflection_nudge_sends (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null
    references public.profiles(id)
    on delete cascade,
  scope text not null
    check (scope in ('group', 'partner')),
  group_id uuid
    references public.groups(id)
    on delete cascade,
  recipient_id uuid
    references public.profiles(id)
    on delete cascade,
  local_date date not null,
  created_at timestamptz not null default now(),
  constraint reflection_nudge_sends_target_check check (
    (
      scope = 'group'
      and group_id is not null
      and recipient_id is null
    )
    or
    (
      scope = 'partner'
      and group_id is null
      and recipient_id is not null
      and sender_id <> recipient_id
    )
  )
);

comment on table public.reflection_nudge_sends is
  'Server-only daily rate-limit ledger for Roots reflection nudges.';
comment on column public.reflection_nudge_sends.local_date is
  'Calendar date supplied from the sender device and validated by the server.';

create unique index if not exists
  reflection_nudge_sends_partner_daily_unique
on public.reflection_nudge_sends (
  sender_id,
  recipient_id,
  local_date
)
where scope = 'partner';

create unique index if not exists
  reflection_nudge_sends_group_daily_unique
on public.reflection_nudge_sends (
  group_id,
  local_date
)
where scope = 'group';

create index if not exists reflection_nudge_sends_sender_date_idx
  on public.reflection_nudge_sends (sender_id, local_date desc);

create index if not exists reflection_nudge_sends_group_date_idx
  on public.reflection_nudge_sends (group_id, local_date desc)
  where group_id is not null;

create index if not exists reflection_nudge_sends_recipient_idx
  on public.reflection_nudge_sends (recipient_id)
  where recipient_id is not null;

alter table public.reflection_nudge_sends enable row level security;

revoke all privileges
  on table public.reflection_nudge_sends
  from public;
revoke all privileges
  on table public.reflection_nudge_sends
  from anon;
revoke all privileges
  on table public.reflection_nudge_sends
  from authenticated;
revoke all privileges
  on table public.reflection_nudge_sends
  from service_role;

grant select, insert, update, delete
  on table public.reflection_nudge_sends
  to service_role;

-- The existing notifications table only accepted shared QT/prayer event types.
-- Add the two nudge types while preserving every existing type and scope rule.
do $$
begin
  if to_regclass('public.notifications') is null then
    raise exception 'Safety stop: public.notifications is missing';
  end if;

  if exists (
    select 1
    from public.notifications
    where type not in (
      'group_qt_shared',
      'group_prayer_shared',
      'group_prayer_answered',
      'partner_qt_shared',
      'partner_prayer_shared',
      'partner_prayer_answered',
      'group_reflection_nudge',
      'partner_reflection_nudge'
    )
  ) then
    raise exception 'Safety stop: unexpected public.notifications type exists';
  end if;
end
$$;

alter table public.notifications
  drop constraint if exists notifications_content_target_check,
  drop constraint if exists notifications_type_scope_check,
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'group_qt_shared',
      'group_prayer_shared',
      'group_prayer_answered',
      'partner_qt_shared',
      'partner_prayer_shared',
      'partner_prayer_answered',
      'group_reflection_nudge',
      'partner_reflection_nudge'
    )
  ),
  add constraint notifications_type_scope_check check (
    (
      scope = 'group'
      and type in (
        'group_qt_shared',
        'group_prayer_shared',
        'group_prayer_answered',
        'group_reflection_nudge'
      )
      and group_id is not null
      and companion_user_id is null
    )
    or
    (
      scope = 'partner'
      and type in (
        'partner_qt_shared',
        'partner_prayer_shared',
        'partner_prayer_answered',
        'partner_reflection_nudge'
      )
      and companion_user_id is not null
      and group_id is null
    )
  ),
  add constraint notifications_content_target_check check (
    (
      type in ('group_qt_shared', 'partner_qt_shared')
      and qt_record_id is not null
    )
    or
    (
      type in (
        'group_prayer_shared',
        'group_prayer_answered',
        'partner_prayer_shared',
        'partner_prayer_answered'
      )
      and prayer_item_id is not null
    )
    or
    (
      type in ('group_reflection_nudge', 'partner_reflection_nudge')
      and qt_record_id is null
      and prayer_item_id is null
    )
  );

do $$
begin
  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.reflection_nudge_sends'::regclass
  ) then
    raise exception 'Postcheck failed: reflection nudge RLS is not enabled';
  end if;

  if has_table_privilege(
    'anon',
    'public.reflection_nudge_sends',
    'SELECT'
  )
  or has_table_privilege(
    'authenticated',
    'public.reflection_nudge_sends',
    'SELECT'
  )
  or has_table_privilege(
    'authenticated',
    'public.reflection_nudge_sends',
    'INSERT'
  )
  then
    raise exception 'Postcheck failed: client roles can access nudge ledger';
  end if;

  if not (
    has_table_privilege(
      'service_role',
      'public.reflection_nudge_sends',
      'SELECT'
    )
    and has_table_privilege(
      'service_role',
      'public.reflection_nudge_sends',
      'INSERT'
    )
    and has_table_privilege(
      'service_role',
      'public.reflection_nudge_sends',
      'UPDATE'
    )
    and has_table_privilege(
      'service_role',
      'public.reflection_nudge_sends',
      'DELETE'
    )
  ) then
    raise exception 'Postcheck failed: service role nudge grants are incomplete';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_type_check'
      and pg_get_constraintdef(oid) like '%group_reflection_nudge%'
      and pg_get_constraintdef(oid) like '%partner_reflection_nudge%'
  ) then
    raise exception 'Postcheck failed: notification nudge types are missing';
  end if;
end
$$;

commit;
