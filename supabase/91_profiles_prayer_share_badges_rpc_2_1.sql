-- 91_profiles_prayer_share_badges_rpc_2_1.sql
-- Christian Roots 2.1 prayer-share badge write stabilization
--
-- Scope is intentionally limited to the existing badge_prayer_ember and
-- badge_prayer_warrior award writes:
--   - prayer screen: public/group visibility plus direct partner recipients
--   - profile repair: the existing visibility-only historical repair rule
--
-- The function recalculates eligibility from server-owned rows, locks only the
-- signed-in user's profile, and can update only these two permanent badges.
-- Running this SQL creates/replaces function metadata only. It does not award,
-- revoke, repair, or otherwise update any existing user data.
--
-- Existing sharing, notification, prayer statistics, popup priority, streak,
-- every other badge, RLS policy, and direct profiles UPDATE compatibility stay
-- unchanged in this phase.


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
        'badge_prayer_ember',
        'badge_prayer_warrior'
      )
    )
    or (
      table_name = 'prayer_items'
      and column_name in ('id', 'user_id', 'visibility')
    )
    or (
      table_name = 'prayer_item_recipients'
      and column_name in ('prayer_item_id', 'owner_id')
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
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.prayer_item_recipients'::regclass
  ) as prayer_item_recipients_rls,
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select_profiles,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update_profiles,
  has_table_privilege(
    'authenticated', 'public.prayer_items', 'SELECT'
  ) as authenticated_can_select_prayer_items,
  has_table_privilege(
    'authenticated', 'public.prayer_item_recipients', 'SELECT'
  ) as authenticated_can_select_recipients,
  has_table_privilege(
    'authenticated', 'public.prayer_item_recipients', 'INSERT'
  ) as authenticated_can_insert_recipients,
  has_table_privilege(
    'authenticated', 'public.prayer_item_recipients', 'DELETE'
  ) as authenticated_can_delete_recipients;

with visibility_shared as (
  select distinct prayer.user_id, prayer.id as prayer_item_id
  from public.prayer_items as prayer
  where exists (
    select 1
    from unnest(
      string_to_array(coalesce(prayer.visibility, 'private'), ',')
    ) as visibility_target(target)
    where btrim(visibility_target.target) <> ''
      and btrim(visibility_target.target) <> 'private'
  )
),
partner_shared as (
  select distinct recipient.owner_id as user_id, recipient.prayer_item_id
  from public.prayer_item_recipients as recipient
  join public.prayer_items as prayer
    on prayer.id = recipient.prayer_item_id
   and prayer.user_id = recipient.owner_id
),
shared_counts as (
  select shared.user_id, count(*)::integer as shared_count
  from (
    select user_id, prayer_item_id from visibility_shared
    union
    select user_id, prayer_item_id from partner_shared
  ) as shared
  group by shared.user_id
)
select
  count(*) filter (
    where coalesce(profile.badge_prayer_ember, false)
  )::integer as ember_awarded_profiles,
  count(*) filter (
    where coalesce(profile.badge_prayer_warrior, false)
  )::integer as warrior_awarded_profiles,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 7
  )::integer as ember_eligible_profiles,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 15
  )::integer as warrior_eligible_profiles,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 7
      and not coalesce(profile.badge_prayer_ember, false)
  )::integer as ember_eligible_but_unawarded,
  count(*) filter (
    where coalesce(shared.shared_count, 0) >= 15
      and not coalesce(profile.badge_prayer_warrior, false)
  )::integer as warrior_eligible_but_unawarded
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
      or (table_name = 'profiles' and column_name = 'badge_prayer_ember' and data_type = 'boolean')
      or (table_name = 'profiles' and column_name = 'badge_prayer_warrior' and data_type = 'boolean')
      or (table_name = 'prayer_items' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'prayer_items' and column_name = 'user_id' and data_type = 'uuid')
      or (table_name = 'prayer_items' and column_name = 'visibility' and data_type = 'text')
      or (table_name = 'prayer_item_recipients' and column_name = 'prayer_item_id' and data_type = 'uuid')
      or (table_name = 'prayer_item_recipients' and column_name = 'owner_id' and data_type = 'uuid')
    );

  if required_column_count <> 8 then
    raise exception 'Safety stop: unexpected prayer-share badge schema';
  end if;

  if not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.profiles'::regclass
  ), false) or not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.prayer_items'::regclass
  ), false) or not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.prayer_item_recipients'::regclass
  ), false) then
    raise exception 'Safety stop: expected RLS is not enabled';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) or not has_table_privilege(
    'authenticated', 'public.prayer_items', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.prayer_item_recipients', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.prayer_item_recipients', 'INSERT'
  ) or not has_table_privilege(
    'authenticated', 'public.prayer_item_recipients', 'DELETE'
  ) then
    raise exception 'Safety stop: existing app compatibility is missing';
  end if;
end;
$$;

create or replace function public.award_own_prayer_share_badges(
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
  v_has_ember boolean;
  v_has_warrior boolean;
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
  -- even when an old shared prayer is later made private or deleted.
  select
    coalesce(profile.badge_prayer_ember, false),
    coalesce(profile.badge_prayer_warrior, false)
  into v_has_ember, v_has_warrior
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_include_partner_recipients then
    -- Prayer-screen behavior: exactly preserve the existing union of
    -- public/group targets and direct faith-partner recipient rows.
    select count(*)::integer
    into v_shared_count
    from (
      select prayer.id as prayer_item_id
      from public.prayer_items as prayer
      where prayer.user_id = v_user_id
        and exists (
          select 1
          from unnest(
            string_to_array(coalesce(prayer.visibility, 'private'), ',')
          ) as visibility_target(target)
          where btrim(visibility_target.target) <> ''
            and btrim(visibility_target.target) <> 'private'
        )

      union

      select recipient.prayer_item_id
      from public.prayer_item_recipients as recipient
      join public.prayer_items as prayer
        on prayer.id = recipient.prayer_item_id
       and prayer.user_id = recipient.owner_id
      where recipient.owner_id = v_user_id
    ) as shared_prayers;
  else
    -- Profile behavior: exactly preserve its existing visibility-only repair
    -- check (a truthy string other than the exact value "private").
    select count(*)::integer
    into v_shared_count
    from public.prayer_items as prayer
    where prayer.user_id = v_user_id
      and prayer.visibility is not null
      and prayer.visibility <> ''
      and prayer.visibility <> 'private';
  end if;

  if not v_has_ember and v_shared_count >= 7 then
    v_has_ember := true;
    v_awarded_badges := array_append(
      v_awarded_badges,
      'badge_prayer_ember'
    );
  end if;

  if not v_has_warrior and v_shared_count >= 15 then
    v_has_warrior := true;
    v_awarded_badges := array_append(
      v_awarded_badges,
      'badge_prayer_warrior'
    );
  end if;

  if cardinality(v_awarded_badges) > 0 then
    update public.profiles as profile
    set
      badge_prayer_ember = v_has_ember,
      badge_prayer_warrior = v_has_warrior
    where profile.id = v_user_id;
  end if;

  return jsonb_build_object(
    'awarded_badges', to_jsonb(v_awarded_badges),
    'shared_count', v_shared_count,
    'badge_prayer_ember', v_has_ember,
    'badge_prayer_warrior', v_has_warrior
  );
end;
$$;

comment on function public.award_own_prayer_share_badges(uuid, boolean) is
  'Awards permanent prayer-share badges to auth.uid() after server-side counting of the existing share sources.';

revoke execute
  on function public.award_own_prayer_share_badges(uuid, boolean)
  from public, anon, authenticated, service_role;

grant execute
  on function public.award_own_prayer_share_badges(uuid, boolean)
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
  'public.award_own_prayer_share_badges(uuid,boolean)'
);

select
  has_function_privilege(
    'anon',
    'public.award_own_prayer_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_prayer_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_prayer_share_badges(uuid,boolean)',
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
    'public.award_own_prayer_share_badges(uuid,boolean)'
  ) is not null as function_exists,
  coalesce((
    select proc.prosecdef
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_prayer_share_badges(uuid,boolean)'
    )
  ), false) as security_definer,
  (
    select proc.proconfig
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_prayer_share_badges(uuid,boolean)'
    )
  ) as function_settings,
  (
    select pg_get_userbyid(proc.proowner)
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_prayer_share_badges(uuid,boolean)'
    )
  ) as function_owner,
  has_function_privilege(
    'anon',
    'public.award_own_prayer_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_prayer_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_prayer_share_badges(uuid,boolean)',
    'EXECUTE'
  ) as service_role_can_execute,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update;


-- =========================================================
-- E. EMERGENCY ROLLBACK ONLY - do not run normally
-- =========================================================
-- Revert app/prayer/page.tsx and app/profile/page.tsx first, then run:
-- drop function if exists public.award_own_prayer_share_badges(uuid, boolean);
