-- 92_profiles_qt_share_badges_rpc_2_1.sql
-- Christian Roots 2.1 Bible Reflection share-badge write stabilization
--
-- Scope is intentionally limited to the existing badge_joseph,
-- badge_qt_bird, and badge_word_peace award writes:
--   - reflection record screen: visibility shares plus direct partner shares
--   - profile repair: the existing visibility-only historical repair rule
--
-- The function recalculates eligibility from server-owned rows, locks only the
-- signed-in user's profile, and can update only these three permanent badges.
-- Running this SQL creates/replaces function metadata only. It does not award,
-- revoke, repair, or otherwise update any existing user data.
--
-- Existing reflection completion/streak logic, sharing, notifications, popup
-- priority, statistics, every other badge, RLS policy, and direct profiles
-- UPDATE compatibility remain unchanged in this phase.


-- =========================================================
-- A. PRECHECK - exact schema, RLS, compatibility, live scope
-- =========================================================

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (
      table_name = 'profiles'
      and column_name in (
        'id',
        'badge_joseph',
        'badge_qt_bird',
        'badge_word_peace'
      )
    )
    or (
      table_name = 'qt_records'
      and column_name in ('id', 'user_id', 'is_draft', 'visibility')
    )
    or (
      table_name = 'qt_record_recipients'
      and column_name in ('qt_record_id', 'owner_id')
    )
  )
order by table_name, ordinal_position;

select
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.profiles'::regclass
  ) as profiles_rls,
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.qt_records'::regclass
  ) as qt_records_rls,
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.qt_record_recipients'::regclass
  ) as qt_record_recipients_rls,
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select_profiles,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update_profiles,
  has_table_privilege(
    'authenticated', 'public.qt_records', 'SELECT'
  ) as authenticated_can_select_qt_records,
  has_table_privilege(
    'authenticated', 'public.qt_record_recipients', 'SELECT'
  ) as authenticated_can_select_recipients,
  has_table_privilege(
    'authenticated', 'public.qt_record_recipients', 'INSERT'
  ) as authenticated_can_insert_recipients,
  has_table_privilege(
    'authenticated', 'public.qt_record_recipients', 'DELETE'
  ) as authenticated_can_delete_recipients;

with visibility_shared as (
  select distinct record.user_id, record.id as qt_record_id
  from public.qt_records as record
  where record.user_id is not null
    and record.is_draft is false
    and record.visibility is not null
    and record.visibility <> 'private'
    and record.visibility <> ''
),
partner_shared as (
  select distinct recipient.owner_id as user_id, recipient.qt_record_id
  from public.qt_record_recipients as recipient
  join public.qt_records as record
    on record.id = recipient.qt_record_id
   and record.user_id = recipient.owner_id
),
shared_counts as (
  select shared.user_id, count(*)::integer as shared_count
  from (
    select user_id, qt_record_id from visibility_shared
    union
    select user_id, qt_record_id from partner_shared
  ) as shared
  group by shared.user_id
)
select
  count(*) filter (
    where coalesce(profile.badge_joseph, false)
  )::integer as joseph_awarded_profiles,
  count(*) filter (
    where coalesce(profile.badge_qt_bird, false)
  )::integer as qt_bird_awarded_profiles,
  count(*) filter (
    where coalesce(profile.badge_word_peace, false)
  )::integer as word_peace_awarded_profiles,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 1
  )::integer as joseph_eligible_profiles,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 30
  )::integer as qt_bird_eligible_profiles,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 50
  )::integer as word_peace_eligible_profiles,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 1
      and not coalesce(profile.badge_joseph, false)
  )::integer as joseph_eligible_but_unawarded,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 30
      and not coalesce(profile.badge_qt_bird, false)
  )::integer as qt_bird_eligible_but_unawarded,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 50
      and not coalesce(profile.badge_word_peace, false)
  )::integer as word_peace_eligible_but_unawarded
from public.profiles as profile
left join shared_counts as shared
  on shared.user_id = profile.id;


-- =========================================================
-- B. EXECUTE - authenticated-only, server-counted RPC
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  required_column_count integer;
begin
  select count(*)::integer
  into required_column_count
  from information_schema.columns
  where table_schema = 'public'
    and (
      (table_name = 'profiles' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'profiles' and column_name = 'badge_joseph' and data_type = 'boolean')
      or (table_name = 'profiles' and column_name = 'badge_qt_bird' and data_type = 'boolean')
      or (table_name = 'profiles' and column_name = 'badge_word_peace' and data_type = 'boolean')
      or (table_name = 'qt_records' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'qt_records' and column_name = 'user_id' and data_type = 'uuid')
      or (table_name = 'qt_records' and column_name = 'is_draft' and data_type = 'boolean')
      or (table_name = 'qt_records' and column_name = 'visibility' and data_type = 'text')
      or (table_name = 'qt_record_recipients' and column_name = 'qt_record_id' and data_type = 'uuid')
      or (table_name = 'qt_record_recipients' and column_name = 'owner_id' and data_type = 'uuid')
    );

  if required_column_count <> 10 then
    raise exception 'Safety stop: unexpected Bible Reflection share-badge schema';
  end if;

  if not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.profiles'::regclass
  ), false) or not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.qt_records'::regclass
  ), false) or not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.qt_record_recipients'::regclass
  ), false) then
    raise exception 'Safety stop: expected RLS is not enabled';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) or not has_table_privilege(
    'authenticated', 'public.qt_records', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.qt_record_recipients', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.qt_record_recipients', 'INSERT'
  ) or not has_table_privilege(
    'authenticated', 'public.qt_record_recipients', 'DELETE'
  ) then
    raise exception 'Safety stop: existing app compatibility is missing';
  end if;
end;
$$;

create or replace function public.award_own_qt_share_badges(
  p_user_id uuid,
  p_include_partner_recipients boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_has_joseph boolean;
  v_has_qt_bird boolean;
  v_has_word_peace boolean;
  v_shared_count integer := 0;
  v_awarded_badges text[] := array[]::text[];
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;

  if p_include_partner_recipients is null then
    raise exception 'share-count mode is required' using errcode = '22004';
  end if;

  -- Serialize same-user award attempts and preserve every badge already earned,
  -- even when an old shared reflection is later made private or deleted.
  select
    coalesce(profile.badge_joseph, false),
    coalesce(profile.badge_qt_bird, false),
    coalesce(profile.badge_word_peace, false)
  into v_has_joseph, v_has_qt_bird, v_has_word_peace
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_include_partner_recipients then
    -- Reflection-record behavior: exactly preserve the existing union of
    -- visibility shares and direct faith-partner recipient rows.
    select count(*)::integer
    into v_shared_count
    from (
      select record.id as qt_record_id
      from public.qt_records as record
      where record.user_id = v_user_id
        and record.is_draft is false
        and record.visibility is not null
        and record.visibility <> 'private'
        and record.visibility <> ''

      union

      select recipient.qt_record_id
      from public.qt_record_recipients as recipient
      join public.qt_records as record
        on record.id = recipient.qt_record_id
       and record.user_id = recipient.owner_id
      where recipient.owner_id = v_user_id
    ) as shared_reflections;
  else
    -- Profile behavior: exactly preserve its existing visibility-only repair.
    select count(*)::integer
    into v_shared_count
    from public.qt_records as record
    where record.user_id = v_user_id
      and record.is_draft is false
      and record.visibility is not null
      and record.visibility <> 'private'
      and record.visibility <> '';
  end if;

  if not v_has_joseph and v_shared_count >= 1 then
    v_has_joseph := true;
    v_awarded_badges := array_append(v_awarded_badges, 'badge_joseph');
  end if;

  if not v_has_qt_bird and v_shared_count >= 30 then
    v_has_qt_bird := true;
    v_awarded_badges := array_append(v_awarded_badges, 'badge_qt_bird');
  end if;

  if not v_has_word_peace and v_shared_count >= 50 then
    v_has_word_peace := true;
    v_awarded_badges := array_append(v_awarded_badges, 'badge_word_peace');
  end if;

  if cardinality(v_awarded_badges) > 0 then
    update public.profiles as profile
    set
      badge_joseph = v_has_joseph,
      badge_qt_bird = v_has_qt_bird,
      badge_word_peace = v_has_word_peace
    where profile.id = v_user_id;
  end if;

  return jsonb_build_object(
    'awarded_badges', to_jsonb(v_awarded_badges),
    'shared_count', v_shared_count,
    'badge_joseph', v_has_joseph,
    'badge_qt_bird', v_has_qt_bird,
    'badge_word_peace', v_has_word_peace
  );
end;
$$;

comment on function public.award_own_qt_share_badges(uuid, boolean) is
  'Awards permanent Bible Reflection share badges to auth.uid() after server-side counting of the existing share sources.';

revoke execute
  on function public.award_own_qt_share_badges(uuid, boolean)
  from public, anon, authenticated, service_role;

grant execute
  on function public.award_own_qt_share_badges(uuid, boolean)
  to authenticated;

commit;


-- =========================================================
-- C. POSTCHECK - function properties and exact grants
-- =========================================================
-- Expected:
--   function_exists           = true
--   security_definer          = true
--   function_settings         = search_path=""
--   function_owner            = postgres
--   anon_can_execute          = false
--   authenticated_can_execute = true
--   service_role_can_execute  = false

select
  proc.oid is not null as function_exists,
  proc.prosecdef as security_definer,
  proc.proconfig as function_settings,
  pg_get_userbyid(proc.proowner) as function_owner
from pg_proc as proc
where proc.oid = to_regprocedure(
  'public.award_own_qt_share_badges(uuid,boolean)'
);

select
  has_function_privilege(
    'anon',
    'public.award_own_qt_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_qt_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_qt_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as service_role_can_execute;


-- =========================================================
-- D. FINAL SAFETY SUMMARY - final SQL Editor result grid
-- =========================================================
-- Expected:
--   function_exists           = true
--   security_definer          = true
--   function_settings         = search_path=""
--   function_owner            = postgres
--   anon_can_execute          = false
--   authenticated_can_execute = true
--   service_role_can_execute  = false
--   authenticated_can_update  = true

select
  to_regprocedure(
    'public.award_own_qt_share_badges(uuid,boolean)'
  ) is not null as function_exists,
  coalesce((
    select proc.prosecdef
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_qt_share_badges(uuid,boolean)'
    )
  ), false) as security_definer,
  (
    select proc.proconfig
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_qt_share_badges(uuid,boolean)'
    )
  ) as function_settings,
  (
    select pg_get_userbyid(proc.proowner)
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_qt_share_badges(uuid,boolean)'
    )
  ) as function_owner,
  has_function_privilege(
    'anon',
    'public.award_own_qt_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_qt_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_qt_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as service_role_can_execute,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update;


-- =========================================================
-- E. EMERGENCY ROLLBACK ONLY - do not run normally
-- =========================================================
-- Revert app/qt/record/page.tsx and app/profile/page.tsx first, then run:
-- drop function if exists public.award_own_qt_share_badges(uuid, boolean);
