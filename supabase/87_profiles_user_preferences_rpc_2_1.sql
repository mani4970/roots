-- 87_profiles_user_preferences_rpc_2_1.sql
-- Christian Roots 2.1 profile preference-write stabilization (phase 1)
--
-- Confirmed app-owned preference fields:
--   - name
--   - preferred_language
--   - preferred_translation
--   - avatar_type
--   - avatar_choice_seen
--
-- Scope of this migration:
--   - Add one authenticated-only RPC that updates only the caller's own
--     user-controlled profile preferences.
--   - Validate every accepted value inside the database boundary.
--   - Keep direct authenticated UPDATE on public.profiles unchanged for now.
--   - Keep every existing RLS policy unchanged.
--   - Keep avatar URLs, badges, streaks, progress, rewards, signup, account
--     deletion, Storage, and all profile rows unchanged.
--
-- Safe deployment order:
--   1. Run this SQL file.
--   2. Deploy the matching app patch.
--   3. Verify nickname, app language, Bible translation, and character choice.
--   4. Move managed badge/progress writes before considering any later revoke
--      of direct authenticated UPDATE on public.profiles.
--
-- This migration is idempotent. It creates/replaces function metadata only;
-- it does not update any user row when the SQL file itself is executed.


-- =========================================================
-- A. PRECHECK - required columns and current UPDATE boundary
-- =========================================================

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'id',
    'name',
    'preferred_language',
    'preferred_translation',
    'avatar_type',
    'avatar_choice_seen'
  )
order by ordinal_position;

select
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update;


-- =========================================================
-- B. EXECUTE - own-user preference RPC
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
    and table_name = 'profiles'
    and (
      (column_name = 'id' and data_type = 'uuid')
      or (column_name = 'name' and data_type = 'text')
      or (column_name = 'preferred_language' and data_type = 'text')
      or (column_name = 'preferred_translation' and data_type = 'integer')
      or (column_name = 'avatar_type' and data_type = 'text')
      or (column_name = 'avatar_choice_seen' and data_type = 'boolean')
    );

  if required_column_count <> 6 then
    raise exception 'Safety stop: unexpected public.profiles preference schema';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) then
    raise exception 'Safety stop: authenticated SELECT on profiles is missing';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) then
    raise exception 'Safety stop: authenticated UPDATE on profiles is missing';
  end if;
end;
$$;

create or replace function public.update_own_profile_preferences(
  p_name text default null,
  p_preferred_language text default null,
  p_preferred_translation integer default null,
  p_avatar_type text default null,
  p_avatar_choice_seen boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_name is not null then
    v_name := btrim(p_name);
    if char_length(v_name) < 1 or char_length(v_name) > 20 then
      return jsonb_build_object('updated', false, 'reason', 'invalid_name');
    end if;
  end if;

  if p_preferred_language is not null
     and p_preferred_language not in ('ko', 'de', 'en', 'fr') then
    return jsonb_build_object('updated', false, 'reason', 'invalid_language');
  end if;

  if p_preferred_translation is not null
     and p_preferred_translation not in (
       24, 26, 27, 29, 62, 80, 81, 82, 83,
       84, 88, 89, 92, 95, 97, 98, 99, 100
     ) then
    return jsonb_build_object('updated', false, 'reason', 'invalid_translation');
  end if;

  if p_avatar_type is not null
     and p_avatar_type not in ('rootsman', 'rootswoman') then
    return jsonb_build_object('updated', false, 'reason', 'invalid_avatar_type');
  end if;

  if p_name is null
     and p_preferred_language is null
     and p_preferred_translation is null
     and p_avatar_type is null
     and p_avatar_choice_seen is null then
    return jsonb_build_object('updated', false, 'reason', 'no_changes');
  end if;

  update public.profiles as profile
  set
    name = case
      when p_name is null then profile.name
      else v_name
    end,
    preferred_language = coalesce(
      p_preferred_language,
      profile.preferred_language
    ),
    preferred_translation = coalesce(
      p_preferred_translation,
      profile.preferred_translation
    ),
    avatar_type = coalesce(
      p_avatar_type,
      profile.avatar_type
    ),
    avatar_choice_seen = case
      when p_avatar_choice_seen is null then profile.avatar_choice_seen
      else p_avatar_choice_seen
    end
  where profile.id = v_user_id;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('updated', true, 'reason', 'updated');
end;
$$;

comment on function public.update_own_profile_preferences(
  text, text, integer, text, boolean
) is
  'Updates only validated user-controlled profile preferences for auth.uid().';

revoke execute
  on function public.update_own_profile_preferences(
    text, text, integer, text, boolean
  )
  from public, anon, authenticated, service_role;

grant execute
  on function public.update_own_profile_preferences(
    text, text, integer, text, boolean
  )
  to authenticated;

commit;


-- =========================================================
-- C. POSTCHECK - function properties and exact RPC grants
-- =========================================================
-- Expected:
--   security_definer              = true
--   search_path                   = search_path=""
--   anon/service_role             = false
--   authenticated                 = true

select
  proc.prosecdef as security_definer,
  proc.proconfig as function_settings,
  pg_get_userbyid(proc.proowner) as function_owner
from pg_proc as proc
join pg_namespace as namespace
  on namespace.oid = proc.pronamespace
where proc.oid = to_regprocedure(
  'public.update_own_profile_preferences(text,text,integer,text,boolean)'
);

select
  has_function_privilege(
    'anon',
    'public.update_own_profile_preferences(text,text,integer,text,boolean)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.update_own_profile_preferences(text,text,integer,text,boolean)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.update_own_profile_preferences(text,text,integer,text,boolean)',
    'EXECUTE'
  ) as service_role_can_execute;


-- =========================================================
-- D. SAFETY CHECK - this phase must preserve current table writes
-- =========================================================
-- Expected: authenticated_can_update remains true.

select
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update;


-- =========================================================
-- E. EMERGENCY ROLLBACK ONLY - do not run during normal setup
-- =========================================================
-- Revert the matching app patch first, then run:
--
-- drop function if exists public.update_own_profile_preferences(
--   text, text, integer, text, boolean
-- );
