-- 90_profiles_noah_badge_rpc_2_1.sql
-- Christian Roots 2.1 Noah-badge write stabilization
--
-- Scope is intentionally limited to the existing badge_noah flow:
--   - award after the user's first successfully saved answered-prayer testimony
--   - preserve the existing Noah popup priority over the 30-testimony badge
--
-- The function verifies the exact prayer item against auth.uid() before it can
-- write badge_noah. It cannot write another badge or another user's profile.
-- Running this SQL creates/replaces function metadata only. It does not update,
-- revoke, or repair any existing profile, prayer item, or badge row.
--
-- Existing streak/progress RPCs, all other badges, UI flows, RLS policies, and
-- direct authenticated profiles UPDATE remain unchanged in this phase.


-- =========================================================
-- A. PRECHECK - exact schema, RLS, and old-app compatibility
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
      and column_name in ('id', 'badge_noah')
    )
    or (
      table_name = 'prayer_items'
      and column_name in ('id', 'user_id', 'is_answered', 'testimony')
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
    where relation.oid = 'public.prayer_items'::regclass
  ) as prayer_items_rls,
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select_profiles,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update_profiles,
  has_table_privilege(
    'authenticated', 'public.prayer_items', 'SELECT'
  ) as authenticated_can_select_prayer_items;

with eligible_users as (
  select distinct prayer.user_id
  from public.prayer_items as prayer
  where prayer.user_id is not null
    and prayer.is_answered is true
    and btrim(coalesce(prayer.testimony, '')) <> ''
)
select
  count(*) filter (
    where coalesce(profile.badge_noah, false)
  )::integer as noah_awarded_profiles,
  (select count(*)::integer from eligible_users) as eligible_users,
  count(*) filter (
    where eligible.user_id is not null
      and not coalesce(profile.badge_noah, false)
  )::integer as eligible_but_unawarded,
  count(*) filter (
    where coalesce(profile.badge_noah, false)
      and eligible.user_id is null
  )::integer as awarded_without_current_source_row
from public.profiles as profile
left join eligible_users as eligible
  on eligible.user_id = profile.id;


-- =========================================================
-- B. EXECUTE - authenticated-only, exact-row-verified RPC
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
      or (table_name = 'profiles' and column_name = 'badge_noah' and data_type = 'boolean')
      or (table_name = 'prayer_items' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'prayer_items' and column_name = 'user_id' and data_type = 'uuid')
      or (table_name = 'prayer_items' and column_name = 'is_answered' and data_type = 'boolean')
      or (table_name = 'prayer_items' and column_name = 'testimony' and data_type = 'text')
    );

  if required_column_count <> 6 then
    raise exception 'Safety stop: unexpected Noah-badge schema';
  end if;

  if not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.profiles'::regclass
  ), false) or not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.prayer_items'::regclass
  ), false) then
    raise exception 'Safety stop: expected RLS is not enabled';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) or not has_table_privilege(
    'authenticated', 'public.prayer_items', 'SELECT'
  ) then
    raise exception 'Safety stop: existing app compatibility is missing';
  end if;
end;
$$;

create or replace function public.award_own_noah_badge(
  p_user_id uuid,
  p_prayer_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_already_awarded boolean;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;

  if p_prayer_item_id is null then
    raise exception 'prayer item is required' using errcode = '22004';
  end if;

  -- Serialize same-user award attempts and preserve every badge already earned,
  -- even if its historical source row was later deleted.
  select coalesce(profile.badge_noah, false)
  into v_already_awarded
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_already_awarded then
    return jsonb_build_object(
      'awarded', false,
      'reason', 'already_awarded',
      'badge_key', 'badge_noah'
    );
  end if;

  -- The primary-key lookup verifies the exact testimony that the client just
  -- saved, without scanning or trusting any client-provided eligibility count.
  if not exists (
    select 1
    from public.prayer_items as prayer
    where prayer.id = p_prayer_item_id
      and prayer.user_id = v_user_id
      and prayer.is_answered is true
      and btrim(coalesce(prayer.testimony, '')) <> ''
  ) then
    return jsonb_build_object(
      'awarded', false,
      'reason', 'not_eligible',
      'badge_key', 'badge_noah'
    );
  end if;

  update public.profiles as profile
  set badge_noah = true
  where profile.id = v_user_id;

  return jsonb_build_object(
    'awarded', true,
    'reason', 'awarded',
    'badge_key', 'badge_noah'
  );
end;
$$;

comment on function public.award_own_noah_badge(uuid, uuid) is
  'Awards badge_noah to auth.uid() only after verifying the exact owned answered-prayer testimony.';

revoke execute
  on function public.award_own_noah_badge(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function public.award_own_noah_badge(uuid, uuid)
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
  'public.award_own_noah_badge(uuid,uuid)'
);

select
  has_function_privilege(
    'anon',
    'public.award_own_noah_badge(uuid,uuid)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_noah_badge(uuid,uuid)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_noah_badge(uuid,uuid)',
    'EXECUTE'
  ) as service_role_can_execute;


-- =========================================================
-- D. FINAL SAFETY SUMMARY - preserve deployed-app compatibility
-- =========================================================
-- This is deliberately the final result grid shown by Supabase SQL Editor.
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
    'public.award_own_noah_badge(uuid,uuid)'
  ) is not null as function_exists,
  coalesce((
    select proc.prosecdef
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_noah_badge(uuid,uuid)'
    )
  ), false) as security_definer,
  (
    select proc.proconfig
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_noah_badge(uuid,uuid)'
    )
  ) as function_settings,
  (
    select pg_get_userbyid(proc.proowner)
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_noah_badge(uuid,uuid)'
    )
  ) as function_owner,
  has_function_privilege(
    'anon',
    'public.award_own_noah_badge(uuid,uuid)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_noah_badge(uuid,uuid)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_noah_badge(uuid,uuid)',
    'EXECUTE'
  ) as service_role_can_execute,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update;


-- =========================================================
-- E. EMERGENCY ROLLBACK ONLY - do not run normally
-- =========================================================
-- Revert app/prayer/page.tsx first, then run:
-- drop function if exists public.award_own_noah_badge(uuid, uuid);
