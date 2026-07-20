-- 93_profiles_community_badges_rpc_2_1.sql
-- Christian Roots 2.1 community badge write stabilization
--
-- Scope is intentionally limited to these existing permanent badges:
--   - badge_paul           : 30 pray-together logs
--   - badge_peter          : a successfully created group
--   - badge_roots_together : membership in 5 distinct community groups
--
-- The functions recalculate eligibility from server-owned rows, lock only the
-- signed-in user's profile, and can update only the three columns above.
-- Running this SQL creates/replaces function metadata only. It does not award,
-- revoke, repair, or otherwise update any existing user data.
--
-- Existing prayer/group flows, counters, hearts, notifications, popup order,
-- streak, every other badge, RLS policies, and direct profiles UPDATE
-- compatibility remain unchanged in this phase.


-- =========================================================
-- A. PRECHECK - exact schema, RLS, compatibility, live scope
-- =========================================================

select
  column_info.table_name,
  column_info.column_name,
  column_info.data_type,
  column_info.is_nullable
from information_schema.columns as column_info
where column_info.table_schema = 'public'
  and (
    (
      column_info.table_name = 'profiles'
      and column_info.column_name in (
        'id',
        'badge_paul',
        'badge_peter',
        'badge_roots_together'
      )
    )
    or (
      column_info.table_name = 'user_prayer_logs'
      and column_info.column_name in ('id', 'user_id')
    )
    or (
      column_info.table_name = 'groups'
      and column_info.column_name in ('id', 'created_by')
    )
    or (
      column_info.table_name = 'group_members'
      and column_info.column_name in ('group_id', 'user_id')
    )
  )
order by column_info.table_name, column_info.ordinal_position;

select
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.profiles'::regclass
  ) as profiles_rls,
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.user_prayer_logs'::regclass
  ) as user_prayer_logs_rls,
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.groups'::regclass
  ) as groups_rls,
  (
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.group_members'::regclass
  ) as group_members_rls,
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select_profiles,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update_profiles,
  has_table_privilege(
    'authenticated', 'public.user_prayer_logs', 'SELECT'
  ) as authenticated_can_select_prayer_logs,
  has_table_privilege(
    'authenticated', 'public.user_prayer_logs', 'INSERT'
  ) as authenticated_can_insert_prayer_logs,
  has_table_privilege(
    'authenticated', 'public.groups', 'SELECT'
  ) as authenticated_can_select_groups,
  has_table_privilege(
    'authenticated', 'public.groups', 'INSERT'
  ) as authenticated_can_insert_groups,
  has_table_privilege(
    'authenticated', 'public.group_members', 'SELECT'
  ) as authenticated_can_select_group_members,
  has_table_privilege(
    'authenticated', 'public.group_members', 'INSERT'
  ) as authenticated_can_insert_group_members;

with prayer_counts as (
  select
    prayer_log.user_id,
    count(*)::integer as prayer_log_count
  from public.user_prayer_logs as prayer_log
  group by prayer_log.user_id
),
group_creation_counts as (
  select
    community_group.created_by as user_id,
    count(*)::integer as created_group_count
  from public.groups as community_group
  where community_group.created_by is not null
  group by community_group.created_by
),
group_membership_counts as (
  select
    membership.user_id,
    count(distinct membership.group_id)::integer as membership_count
  from public.group_members as membership
  where membership.group_id is not null
  group by membership.user_id
)
select
  count(*) filter (
    where coalesce(profile.badge_paul, false)
  )::integer as paul_awarded_profiles,
  count(*) filter (
    where coalesce(prayer.prayer_log_count, 0) >= 30
  )::integer as paul_eligible_profiles,
  count(*) filter (
    where coalesce(prayer.prayer_log_count, 0) >= 30
      and not coalesce(profile.badge_paul, false)
  )::integer as paul_eligible_but_unawarded,
  count(*) filter (
    where coalesce(profile.badge_paul, false)
      and coalesce(prayer.prayer_log_count, 0) < 30
  )::integer as paul_awarded_below_current_source,
  count(*) filter (
    where coalesce(profile.badge_peter, false)
  )::integer as peter_awarded_profiles,
  count(*) filter (
    where coalesce(group_creation.created_group_count, 0) >= 1
  )::integer as peter_current_source_eligible_profiles,
  count(*) filter (
    where coalesce(group_creation.created_group_count, 0) >= 1
      and not coalesce(profile.badge_peter, false)
  )::integer as peter_current_source_eligible_but_unawarded,
  count(*) filter (
    where coalesce(profile.badge_peter, false)
      and coalesce(group_creation.created_group_count, 0) < 1
  )::integer as peter_awarded_below_current_source,
  count(*) filter (
    where coalesce(profile.badge_roots_together, false)
  )::integer as roots_together_awarded_profiles,
  count(*) filter (
    where coalesce(group_membership.membership_count, 0) >= 5
  )::integer as roots_together_eligible_profiles,
  count(*) filter (
    where coalesce(group_membership.membership_count, 0) >= 5
      and not coalesce(profile.badge_roots_together, false)
  )::integer as roots_together_eligible_but_unawarded,
  count(*) filter (
    where coalesce(profile.badge_roots_together, false)
      and coalesce(group_membership.membership_count, 0) < 5
  )::integer as roots_together_awarded_below_current_source
from public.profiles as profile
left join prayer_counts as prayer
  on prayer.user_id = profile.id
left join group_creation_counts as group_creation
  on group_creation.user_id = profile.id
left join group_membership_counts as group_membership
  on group_membership.user_id = profile.id;


-- =========================================================
-- B. EXECUTE - authenticated-only, server-counted RPCs
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
  from information_schema.columns as column_info
  where column_info.table_schema = 'public'
    and (
      (
        column_info.table_name = 'profiles'
        and column_info.column_name = 'id'
        and column_info.data_type = 'uuid'
      )
      or (
        column_info.table_name = 'profiles'
        and column_info.column_name = 'badge_paul'
        and column_info.data_type = 'boolean'
      )
      or (
        column_info.table_name = 'profiles'
        and column_info.column_name = 'badge_peter'
        and column_info.data_type = 'boolean'
      )
      or (
        column_info.table_name = 'profiles'
        and column_info.column_name = 'badge_roots_together'
        and column_info.data_type = 'boolean'
      )
      or (
        column_info.table_name = 'user_prayer_logs'
        and column_info.column_name = 'id'
        and column_info.data_type = 'uuid'
      )
      or (
        column_info.table_name = 'user_prayer_logs'
        and column_info.column_name = 'user_id'
        and column_info.data_type = 'uuid'
      )
      or (
        column_info.table_name = 'groups'
        and column_info.column_name = 'id'
        and column_info.data_type = 'uuid'
      )
      or (
        column_info.table_name = 'groups'
        and column_info.column_name = 'created_by'
        and column_info.data_type = 'uuid'
      )
      or (
        column_info.table_name = 'group_members'
        and column_info.column_name = 'group_id'
        and column_info.data_type = 'uuid'
      )
      or (
        column_info.table_name = 'group_members'
        and column_info.column_name = 'user_id'
        and column_info.data_type = 'uuid'
      )
    );

  if required_column_count <> 10 then
    raise exception 'Safety stop: unexpected community badge schema';
  end if;

  if not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.profiles'::regclass
  ), false) or not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.user_prayer_logs'::regclass
  ), false) or not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.groups'::regclass
  ), false) or not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.group_members'::regclass
  ), false) then
    raise exception 'Safety stop: expected RLS is not enabled';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) or not has_table_privilege(
    'authenticated', 'public.user_prayer_logs', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.user_prayer_logs', 'INSERT'
  ) or not has_table_privilege(
    'authenticated', 'public.groups', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.groups', 'INSERT'
  ) or not has_table_privilege(
    'authenticated', 'public.group_members', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.group_members', 'INSERT'
  ) then
    raise exception 'Safety stop: existing app compatibility is missing';
  end if;
end;
$$;

create or replace function public.award_own_paul_badge(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_has_paul boolean;
  v_prayer_log_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;

  -- Serialize same-user award attempts and never revoke an earned badge.
  select coalesce(profile.badge_paul, false)
  into v_has_paul
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_has_paul then
    return jsonb_build_object(
      'awarded', false,
      'reason', 'already_awarded',
      'badge_key', 'badge_paul',
      'badge_paul', true
    );
  end if;

  select count(*)::integer
  into v_prayer_log_count
  from (
    select 1
    from public.user_prayer_logs as prayer_log
    where prayer_log.user_id = v_user_id
    limit 30
  ) as eligible_rows;

  if v_prayer_log_count < 30 then
    return jsonb_build_object(
      'awarded', false,
      'reason', 'not_eligible',
      'badge_key', 'badge_paul',
      'prayer_log_count', v_prayer_log_count,
      'badge_paul', false
    );
  end if;

  update public.profiles as profile
  set badge_paul = true
  where profile.id = v_user_id;

  return jsonb_build_object(
    'awarded', true,
    'reason', 'awarded',
    'badge_key', 'badge_paul',
    'prayer_log_count', v_prayer_log_count,
    'badge_paul', true
  );
end;
$$;

comment on function public.award_own_paul_badge(uuid) is
  'Awards the permanent Paul badge to auth.uid() after server-side counting of 30 pray-together logs.';

alter function public.award_own_paul_badge(uuid) owner to postgres;

revoke execute
  on function public.award_own_paul_badge(uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function public.award_own_paul_badge(uuid)
  to authenticated;

create or replace function public.award_own_group_activity_badges(
  p_user_id uuid,
  p_created_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_has_peter boolean;
  v_has_roots_together boolean;
  v_group_membership_count integer := 0;
  v_awarded_badges text[] := array[]::text[];
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;

  -- A non-null group ID is accepted only for a group created by auth.uid().
  -- Join/profile repair calls pass NULL and therefore can never award Peter.
  if p_created_group_id is not null and not exists (
    select 1
    from public.groups as community_group
    where community_group.id = p_created_group_id
      and community_group.created_by = v_user_id
  ) then
    raise exception 'created group mismatch' using errcode = '42501';
  end if;

  -- All community badge award attempts lock the same profile row first.
  select
    coalesce(profile.badge_peter, false),
    coalesce(profile.badge_roots_together, false)
  into v_has_peter, v_has_roots_together
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_created_group_id is not null and not v_has_peter then
    v_has_peter := true;
    v_awarded_badges := array_append(v_awarded_badges, 'badge_peter');
  end if;

  if not v_has_roots_together then
    select count(*)::integer
    into v_group_membership_count
    from (
      select membership.group_id
      from public.group_members as membership
      where membership.user_id = v_user_id
        and membership.group_id is not null
      group by membership.group_id
      limit 5
    ) as distinct_memberships;

    if v_group_membership_count >= 5 then
      v_has_roots_together := true;
      v_awarded_badges := array_append(
        v_awarded_badges,
        'badge_roots_together'
      );
    end if;
  end if;

  if cardinality(v_awarded_badges) > 0 then
    update public.profiles as profile
    set
      badge_peter = v_has_peter,
      badge_roots_together = v_has_roots_together
    where profile.id = v_user_id;
  end if;

  return jsonb_build_object(
    'awarded_badges', to_jsonb(v_awarded_badges),
    'group_membership_count', v_group_membership_count,
    'badge_peter', v_has_peter,
    'badge_roots_together', v_has_roots_together
  );
end;
$$;

comment on function public.award_own_group_activity_badges(uuid, uuid) is
  'Awards permanent Peter and Roots Together badges to auth.uid() after server-side verification of group creation and membership.';

alter function public.award_own_group_activity_badges(uuid, uuid)
  owner to postgres;

revoke execute
  on function public.award_own_group_activity_badges(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function public.award_own_group_activity_badges(uuid, uuid)
  to authenticated;

commit;


-- =========================================================
-- C. POSTCHECK - function properties and exact grants
-- =========================================================

select
  proc.proname as function_name,
  proc.prosecdef as security_definer,
  proc.proconfig as function_settings,
  pg_get_userbyid(proc.proowner) as function_owner
from pg_proc as proc
where proc.oid in (
  to_regprocedure('public.award_own_paul_badge(uuid)'),
  to_regprocedure(
    'public.award_own_group_activity_badges(uuid,uuid)'
  )
)
order by proc.proname;


-- =========================================================
-- D. FINAL SAFETY SUMMARY - final SQL Editor result grid
-- =========================================================
-- Expected for both functions:
--   function_exists           = true
--   security_definer          = true
--   function_settings         = search_path=""
--   function_owner            = postgres
--   anon_can_execute          = false
--   authenticated_can_execute = true
--   service_role_can_execute  = false
-- Existing old-app compatibility:
--   authenticated_can_update_profiles = true

select
  to_regprocedure(
    'public.award_own_paul_badge(uuid)'
  ) is not null as paul_function_exists,
  coalesce((
    select proc.prosecdef
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_paul_badge(uuid)'
    )
  ), false) as paul_security_definer,
  (
    select proc.proconfig
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_paul_badge(uuid)'
    )
  ) as paul_function_settings,
  (
    select pg_get_userbyid(proc.proowner)
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_paul_badge(uuid)'
    )
  ) as paul_function_owner,
  has_function_privilege(
    'anon',
    'public.award_own_paul_badge(uuid)',
    'EXECUTE'
  ) as paul_anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_paul_badge(uuid)',
    'EXECUTE'
  ) as paul_authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_paul_badge(uuid)',
    'EXECUTE'
  ) as paul_service_role_can_execute,
  to_regprocedure(
    'public.award_own_group_activity_badges(uuid,uuid)'
  ) is not null as group_function_exists,
  coalesce((
    select proc.prosecdef
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_group_activity_badges(uuid,uuid)'
    )
  ), false) as group_security_definer,
  (
    select proc.proconfig
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_group_activity_badges(uuid,uuid)'
    )
  ) as group_function_settings,
  (
    select pg_get_userbyid(proc.proowner)
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_group_activity_badges(uuid,uuid)'
    )
  ) as group_function_owner,
  has_function_privilege(
    'anon',
    'public.award_own_group_activity_badges(uuid,uuid)',
    'EXECUTE'
  ) as group_anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_group_activity_badges(uuid,uuid)',
    'EXECUTE'
  ) as group_authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_group_activity_badges(uuid,uuid)',
    'EXECUTE'
  ) as group_service_role_can_execute,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update_profiles;


-- =========================================================
-- E. EMERGENCY ROLLBACK ONLY - do not run normally
-- =========================================================
-- Revert app/community/page.tsx and app/profile/page.tsx first, then run:
-- drop function if exists public.award_own_paul_badge(uuid);
-- drop function if exists
--   public.award_own_group_activity_badges(uuid, uuid);
