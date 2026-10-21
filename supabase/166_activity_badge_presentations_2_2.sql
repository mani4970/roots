-- Run the whole file in the Supabase SQL editor before deploying this patch.
-- Pending UI only for the existing 14 activity badges. Existing award RPCs,
-- eligibility, device-local completion dates, streak and progress are unchanged.
-- Existing owned badges are deliberately NOT backfilled.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  v_badge_columns integer;
begin
  select count(*)::integer into v_badge_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and data_type = 'boolean'
    and column_name in (
      'badge_noah', 'badge_joseph', 'badge_prayer_ember', 'badge_prayer_warrior',
      'badge_paul', 'badge_peter', 'badge_roots_together', 'badge_qt_bird',
      'badge_word_peace', 'badge_jesus_love', 'badge_jesus_and_me',
      'badge_receive_my_love', 'badge_prayer_cheer', 'badge_word_fruit'
    );
  if v_badge_columns <> 14 then
    raise exception 'Safety stop: expected the existing 14 activity badge columns';
  end if;
end;
$$;

create table if not exists public.activity_badge_presentations (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  -- These timestamps record award/acknowledgement events only. They do not
  -- determine the user's completion date or any badge eligibility threshold.
  awarded_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  primary key (user_id, badge_key),
  constraint activity_badge_presentations_badge_key_check check (
    badge_key in (
      'badge_noah', 'badge_joseph', 'badge_prayer_ember', 'badge_prayer_warrior',
      'badge_paul', 'badge_peter', 'badge_roots_together', 'badge_qt_bird',
      'badge_word_peace', 'badge_jesus_love', 'badge_jesus_and_me',
      'badge_receive_my_love', 'badge_prayer_cheer', 'badge_word_fruit'
    )
  )
);

comment on table public.activity_badge_presentations is
  'Account-owned unconfirmed activity-badge popups. UI acknowledgements never award badges or change progress.';

create index if not exists activity_badge_presentations_pending_idx
  on public.activity_badge_presentations (user_id, awarded_at, badge_key)
  where acknowledged_at is null;

alter table public.activity_badge_presentations enable row level security;

drop policy if exists activity_badge_presentations_select_own on public.activity_badge_presentations;
create policy activity_badge_presentations_select_own
  on public.activity_badge_presentations for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists activity_badge_presentations_acknowledge_own on public.activity_badge_presentations;
create policy activity_badge_presentations_acknowledge_own
  on public.activity_badge_presentations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and acknowledged_at is not null);

revoke all on table public.activity_badge_presentations from public, anon, authenticated;
grant select on table public.activity_badge_presentations to authenticated;
grant update (acknowledged_at) on table public.activity_badge_presentations to authenticated;

-- The capture function is internal trigger code, outside the exposed public
-- schema, with no EXECUTE/USAGE privilege for API callers. It writes only the
-- new UI table and does not call or replace any award/progress function.
create schema if not exists roots_badge_private;
revoke all on schema roots_badge_private from public, anon, authenticated, service_role;

create or replace function roots_badge_private.capture_activity_badge_presentations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_badge_presentations (user_id, badge_key)
    select new.id, badge.badge_key
    from (values
      ('badge_noah', old.badge_noah, new.badge_noah),
      ('badge_joseph', old.badge_joseph, new.badge_joseph),
      ('badge_prayer_ember', old.badge_prayer_ember, new.badge_prayer_ember),
      ('badge_prayer_warrior', old.badge_prayer_warrior, new.badge_prayer_warrior),
      ('badge_paul', old.badge_paul, new.badge_paul),
      ('badge_peter', old.badge_peter, new.badge_peter),
      ('badge_roots_together', old.badge_roots_together, new.badge_roots_together),
      ('badge_qt_bird', old.badge_qt_bird, new.badge_qt_bird),
      ('badge_word_peace', old.badge_word_peace, new.badge_word_peace),
      ('badge_jesus_love', old.badge_jesus_love, new.badge_jesus_love),
      ('badge_jesus_and_me', old.badge_jesus_and_me, new.badge_jesus_and_me),
      ('badge_receive_my_love', old.badge_receive_my_love, new.badge_receive_my_love),
      ('badge_prayer_cheer', old.badge_prayer_cheer, new.badge_prayer_cheer),
      ('badge_word_fruit', old.badge_word_fruit, new.badge_word_fruit)
    ) as badge(badge_key, was_awarded, is_awarded)
    where not coalesce(badge.was_awarded, false) and badge.is_awarded is true
    on conflict (user_id, badge_key) do nothing;
  return new;
end;
$$;

revoke execute on function roots_badge_private.capture_activity_badge_presentations()
  from public, anon, authenticated, service_role;

drop trigger if exists roots_activity_badge_presentation_capture on public.profiles;
create trigger roots_activity_badge_presentation_capture
  after update of
    badge_noah, badge_joseph, badge_prayer_ember, badge_prayer_warrior,
    badge_paul, badge_peter, badge_roots_together, badge_qt_bird,
    badge_word_peace, badge_jesus_love, badge_jesus_and_me,
    badge_receive_my_love, badge_prayer_cheer, badge_word_fruit
  on public.profiles
  for each row
  when (
    (old.badge_noah is not true and new.badge_noah is true)
    or (old.badge_joseph is not true and new.badge_joseph is true)
    or (old.badge_prayer_ember is not true and new.badge_prayer_ember is true)
    or (old.badge_prayer_warrior is not true and new.badge_prayer_warrior is true)
    or (old.badge_paul is not true and new.badge_paul is true)
    or (old.badge_peter is not true and new.badge_peter is true)
    or (old.badge_roots_together is not true and new.badge_roots_together is true)
    or (old.badge_qt_bird is not true and new.badge_qt_bird is true)
    or (old.badge_word_peace is not true and new.badge_word_peace is true)
    or (old.badge_jesus_love is not true and new.badge_jesus_love is true)
    or (old.badge_jesus_and_me is not true and new.badge_jesus_and_me is true)
    or (old.badge_receive_my_love is not true and new.badge_receive_my_love is true)
    or (old.badge_prayer_cheer is not true and new.badge_prayer_cheer is true)
    or (old.badge_word_fruit is not true and new.badge_word_fruit is true)
  )
  execute function roots_badge_private.capture_activity_badge_presentations();

create or replace function public.acknowledge_activity_badge_presentations(
  p_user_id uuid,
  p_badge_keys text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;
  if p_badge_keys is null or cardinality(p_badge_keys) > 14 then
    raise exception 'expected at most 14 activity badge keys' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_badge_keys) as requested(badge_key)
    where requested.badge_key is null or requested.badge_key not in (
      'badge_noah', 'badge_joseph', 'badge_prayer_ember', 'badge_prayer_warrior',
      'badge_paul', 'badge_peter', 'badge_roots_together', 'badge_qt_bird',
      'badge_word_peace', 'badge_jesus_love', 'badge_jesus_and_me',
      'badge_receive_my_love', 'badge_prayer_cheer', 'badge_word_fruit'
    )
  ) then
    raise exception 'unsupported activity badge key' using errcode = '22023';
  end if;

  update public.activity_badge_presentations as presentation
    set acknowledged_at = now()
    where presentation.user_id = v_user_id
      and presentation.badge_key = any(p_badge_keys)
      and presentation.acknowledged_at is null;
end;
$$;

revoke execute on function public.acknowledge_activity_badge_presentations(uuid, text[])
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_activity_badge_presentations(uuid, text[]) to authenticated;

commit;

-- One row: all booleans below should be true.
select
  (select relrowsecurity from pg_class where oid = 'public.activity_badge_presentations'::regclass) as activity_badges_rls_enabled,
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'activity_badge_presentations_pending_idx') as pending_index_exists,
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'roots_activity_badge_presentation_capture'
      and not tgisinternal and tgenabled = 'O'
      and cardinality(tgattr::smallint[]) = 14
  ) as capture_trigger_enabled_for_14_badges,
  (select prosecdef from pg_proc where oid = 'roots_badge_private.capture_activity_badge_presentations()'::regprocedure) as capture_is_security_definer,
  not has_schema_privilege('authenticated', 'roots_badge_private', 'usage') as private_schema_hidden,
  not has_function_privilege('authenticated', 'roots_badge_private.capture_activity_badge_presentations()', 'execute') as capture_not_callable_by_users,
  (select not prosecdef from pg_proc where oid = 'public.acknowledge_activity_badge_presentations(uuid,text[])'::regprocedure) as acknowledge_is_security_invoker,
  has_function_privilege('authenticated', 'public.acknowledge_activity_badge_presentations(uuid,text[])', 'execute') as authenticated_acknowledge_allowed,
  not has_function_privilege('anon', 'public.acknowledge_activity_badge_presentations(uuid,text[])', 'execute') as anonymous_acknowledge_blocked,
  not has_table_privilege('authenticated', 'public.activity_badge_presentations', 'insert') as direct_insert_blocked,
  has_column_privilege('authenticated', 'public.activity_badge_presentations', 'acknowledged_at', 'update') as own_acknowledgement_column_allowed,
  not has_column_privilege('authenticated', 'public.activity_badge_presentations', 'awarded_at', 'update') as award_timestamp_changes_blocked;
