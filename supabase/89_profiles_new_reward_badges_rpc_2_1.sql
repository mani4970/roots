-- 89_profiles_new_reward_badges_rpc_2_1.sql
-- Christian Roots 2.1 new reward-badge write stabilization
--
-- Scope is intentionally limited to these five existing badges:
--   - badge_jesus_love       : 50 Bible Reflection reactions
--   - badge_jesus_and_me     : 30 answered-prayer testimonies
--   - badge_receive_my_love  : 10 accepted companions
--   - badge_prayer_cheer     : 60 pray-together logs
--   - badge_word_fruit       : 50 distinct Today’s Word dates
--
-- The function derives eligibility from authoritative rows owned by auth.uid().
-- It cannot award any other badge and cannot write another user's profile.
-- Running this SQL creates/replaces function metadata only. It does not update
-- any existing profile or badge row until an eligible authenticated user calls
-- the RPC through the matching app flow.
--
-- Existing streak/progress RPCs, all other badges, UI flows, RLS policies, and
-- direct authenticated profiles UPDATE remain unchanged in this phase.


-- =========================================================
-- A. PRECHECK - exact columns and old-app compatibility
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
        'badge_jesus_love',
        'badge_jesus_and_me',
        'badge_receive_my_love',
        'badge_prayer_cheer',
        'badge_word_fruit'
      )
    )
    or (
      table_name = 'qt_reactions'
      and column_name in ('id', 'user_id')
    )
    or (
      table_name = 'prayer_items'
      and column_name in ('id', 'user_id', 'is_answered', 'testimony')
    )
    or (
      table_name = 'companions'
      and column_name in ('id', 'requester_id', 'receiver_id', 'status')
    )
    or (
      table_name = 'user_prayer_logs'
      and column_name in ('id', 'user_id')
    )
    or (
      table_name = 'daily_checkins'
      and column_name in ('id', 'user_id', 'date', 'verse', 'verse_text')
    )
  )
order by table_name, ordinal_position;

select
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select_profiles,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update_profiles,
  has_table_privilege(
    'authenticated', 'public.qt_reactions', 'SELECT'
  ) as authenticated_can_select_qt_reactions,
  has_table_privilege(
    'authenticated', 'public.prayer_items', 'SELECT'
  ) as authenticated_can_select_prayer_items,
  has_table_privilege(
    'authenticated', 'public.companions', 'SELECT'
  ) as authenticated_can_select_companions,
  has_table_privilege(
    'authenticated', 'public.user_prayer_logs', 'SELECT'
  ) as authenticated_can_select_prayer_logs,
  has_table_privilege(
    'authenticated', 'public.daily_checkins', 'SELECT'
  ) as authenticated_can_select_daily_checkins;


-- =========================================================
-- B. EXECUTE - authenticated-only, server-verified award RPC
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
      or (table_name = 'profiles' and column_name = 'badge_jesus_love' and data_type = 'boolean')
      or (table_name = 'profiles' and column_name = 'badge_jesus_and_me' and data_type = 'boolean')
      or (table_name = 'profiles' and column_name = 'badge_receive_my_love' and data_type = 'boolean')
      or (table_name = 'profiles' and column_name = 'badge_prayer_cheer' and data_type = 'boolean')
      or (table_name = 'profiles' and column_name = 'badge_word_fruit' and data_type = 'boolean')
      or (table_name = 'qt_reactions' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'qt_reactions' and column_name = 'user_id' and data_type = 'uuid')
      or (table_name = 'prayer_items' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'prayer_items' and column_name = 'user_id' and data_type = 'uuid')
      or (table_name = 'prayer_items' and column_name = 'is_answered' and data_type = 'boolean')
      or (table_name = 'prayer_items' and column_name = 'testimony' and data_type = 'text')
      or (table_name = 'companions' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'companions' and column_name = 'requester_id' and data_type = 'uuid')
      or (table_name = 'companions' and column_name = 'receiver_id' and data_type = 'uuid')
      or (table_name = 'companions' and column_name = 'status' and data_type = 'text')
      or (table_name = 'user_prayer_logs' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'user_prayer_logs' and column_name = 'user_id' and data_type = 'uuid')
      or (table_name = 'daily_checkins' and column_name = 'id' and data_type = 'uuid')
      or (table_name = 'daily_checkins' and column_name = 'user_id' and data_type = 'uuid')
      or (table_name = 'daily_checkins' and column_name = 'date' and data_type = 'date')
      or (table_name = 'daily_checkins' and column_name = 'verse' and data_type = 'text')
      or (table_name = 'daily_checkins' and column_name = 'verse_text' and data_type = 'text')
    );

  if required_column_count <> 23 then
    raise exception 'Safety stop: unexpected new reward-badge schema';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) then
    raise exception 'Safety stop: existing profiles compatibility is missing';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.qt_reactions', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.prayer_items', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.companions', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.user_prayer_logs', 'SELECT'
  ) or not has_table_privilege(
    'authenticated', 'public.daily_checkins', 'SELECT'
  ) then
    raise exception 'Safety stop: existing reward-source SELECT is missing';
  end if;
end;
$$;

create or replace function public.award_own_reward_badge(
  p_user_id uuid,
  p_badge_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_already_awarded boolean;
  v_activity_count integer := 0;
  v_threshold integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;

  if p_badge_key is null or p_badge_key not in (
    'badge_jesus_love',
    'badge_jesus_and_me',
    'badge_receive_my_love',
    'badge_prayer_cheer',
    'badge_word_fruit'
  ) then
    raise exception 'unsupported reward badge' using errcode = '22023';
  end if;

  -- Serialize concurrent checks for this user's profile and read only the
  -- allow-listed badge requested by the caller.
  select case p_badge_key
    when 'badge_jesus_love' then profile.badge_jesus_love
    when 'badge_jesus_and_me' then profile.badge_jesus_and_me
    when 'badge_receive_my_love' then profile.badge_receive_my_love
    when 'badge_prayer_cheer' then profile.badge_prayer_cheer
    when 'badge_word_fruit' then profile.badge_word_fruit
  end
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
      'badge_key', p_badge_key
    );
  end if;

  case p_badge_key
    when 'badge_jesus_love' then
      v_threshold := 50;
      select count(*)::integer
      into v_activity_count
      from (
        select 1
        from public.qt_reactions as reaction
        where reaction.user_id = v_user_id
        limit 50
      ) as eligible_rows;

    when 'badge_jesus_and_me' then
      v_threshold := 30;
      select count(*)::integer
      into v_activity_count
      from (
        select 1
        from public.prayer_items as prayer
        where prayer.user_id = v_user_id
          and prayer.is_answered is true
          and btrim(coalesce(prayer.testimony, '')) <> ''
        limit 30
      ) as eligible_rows;

    when 'badge_receive_my_love' then
      v_threshold := 10;
      select count(*)::integer
      into v_activity_count
      from (
        select distinct case
          when companion.requester_id = v_user_id
            then companion.receiver_id
          else companion.requester_id
        end as partner_id
        from public.companions as companion
        where companion.status = 'accepted'
          and (
            companion.requester_id = v_user_id
            or companion.receiver_id = v_user_id
          )
        limit 10
      ) as eligible_rows;

    when 'badge_prayer_cheer' then
      v_threshold := 60;
      select count(*)::integer
      into v_activity_count
      from (
        select 1
        from public.user_prayer_logs as prayer_log
        where prayer_log.user_id = v_user_id
        limit 60
      ) as eligible_rows;

    when 'badge_word_fruit' then
      v_threshold := 50;
      select count(*)::integer
      into v_activity_count
      from (
        select distinct checkin.date
        from public.daily_checkins as checkin
        where checkin.user_id = v_user_id
          and checkin.date is not null
          and btrim(
            coalesce(checkin.verse_text, checkin.verse, '')
          ) <> ''
        limit 50
      ) as eligible_rows;
  end case;

  if v_activity_count < v_threshold then
    return jsonb_build_object(
      'awarded', false,
      'reason', 'not_eligible',
      'badge_key', p_badge_key
    );
  end if;

  update public.profiles as profile
  set
    badge_jesus_love = case
      when p_badge_key = 'badge_jesus_love'
        then true
      else profile.badge_jesus_love
    end,
    badge_jesus_and_me = case
      when p_badge_key = 'badge_jesus_and_me'
        then true
      else profile.badge_jesus_and_me
    end,
    badge_receive_my_love = case
      when p_badge_key = 'badge_receive_my_love'
        then true
      else profile.badge_receive_my_love
    end,
    badge_prayer_cheer = case
      when p_badge_key = 'badge_prayer_cheer'
        then true
      else profile.badge_prayer_cheer
    end,
    badge_word_fruit = case
      when p_badge_key = 'badge_word_fruit'
        then true
      else profile.badge_word_fruit
    end
  where profile.id = v_user_id;

  return jsonb_build_object(
    'awarded', true,
    'reason', 'awarded',
    'badge_key', p_badge_key
  );
end;
$$;

comment on function public.award_own_reward_badge(uuid, text) is
  'Awards one allow-listed activity badge to auth.uid() only after server-side eligibility verification.';

revoke execute
  on function public.award_own_reward_badge(uuid, text)
  from public, anon, authenticated, service_role;

grant execute
  on function public.award_own_reward_badge(uuid, text)
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
  'public.award_own_reward_badge(uuid,text)'
);

select
  has_function_privilege(
    'anon',
    'public.award_own_reward_badge(uuid,text)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_reward_badge(uuid,text)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_reward_badge(uuid,text)',
    'EXECUTE'
  ) as service_role_can_execute;


-- =========================================================
-- D. FINAL SAFETY SUMMARY - preserve old deployed app compatibility
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
    'public.award_own_reward_badge(uuid,text)'
  ) is not null as function_exists,
  coalesce((
    select proc.prosecdef
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_reward_badge(uuid,text)'
    )
  ), false) as security_definer,
  (
    select proc.proconfig
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_reward_badge(uuid,text)'
    )
  ) as function_settings,
  (
    select pg_get_userbyid(proc.proowner)
    from pg_proc as proc
    where proc.oid = to_regprocedure(
      'public.award_own_reward_badge(uuid,text)'
    )
  ) as function_owner,
  has_function_privilege(
    'anon',
    'public.award_own_reward_badge(uuid,text)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.award_own_reward_badge(uuid,text)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.award_own_reward_badge(uuid,text)',
    'EXECUTE'
  ) as service_role_can_execute,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update;


-- =========================================================
-- E. EMERGENCY ROLLBACK ONLY - do not run normally
-- =========================================================
-- Revert lib/rewardBadges.ts first, then run:
-- drop function if exists public.award_own_reward_badge(uuid, text);
