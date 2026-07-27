-- 103_easy_bible_translation_option_2_1.sql
-- Christian Roots 2.1 Easy Bible preference option
--
-- Scope:
--   - Allow Easy Bible (translation ID 88) in the existing profile preference RPC.
--   - Keep the translation on the existing server-side Bible API path.
--   - Preserve all profile, reflection, progress, streak, reward, and badge data.


-- =========================================================
-- A. PRECHECK
-- =========================================================

select
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regprocedure(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'
  ) is not null as preference_rpc_exists;


-- =========================================================
-- B. EXECUTE
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
begin
  if to_regprocedure(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'
  ) is null then
    raise exception 'Safety stop: profile preference RPC is missing';
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
       24, 26, 27, 29, 31, 62, 80, 82,
       84, 88, 89, 92, 95, 97, 98, 100
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
-- C. POSTCHECK
-- =========================================================

select
  p.prosecdef as security_definer,
  p.proconfig as function_config,
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
  ) as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'update_own_profile_preferences'
  and pg_get_function_identity_arguments(p.oid) =
    'p_name text, p_preferred_language text, p_preferred_translation integer, p_avatar_type text, p_avatar_choice_seen boolean';

select
  position(
    '84, 88, 89, 92'
    in pg_get_functiondef(
      'public.update_own_profile_preferences(text,text,integer,text,boolean)'::regprocedure
    )
  ) > 0 as easy_bible_allowed;
