-- 129_remove_unlicensed_bible_options_2_1.sql
-- Christian Roots 2.1 Bible translation licensing cleanup
--
-- Scope:
--   - Remove no-longer-selectable translation IDs from profile preference validation.
--   - Add La Bible du Semeur 2015 (21), which is now an active licensed option.
--   - Preserve all historical QT/daily-checkin records and all streak/progress/reward data.
--
-- Removed from new selection/preference use:
--   24 Jérusalem (legacy)
--   31 Schlachter
--   82 NLT
--   88 쉬운성경
--   95 The Message


-- =========================================================
-- A. PRECHECK
-- =========================================================

select
  preferred_language,
  preferred_translation,
  count(*)::integer as profile_count
from public.profiles
where preferred_translation in (24, 31, 82, 88, 95)
group by preferred_language, preferred_translation
order by preferred_translation, preferred_language;


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

-- Safety fallback only. The 2026-08-13 read-only precheck found zero
-- profiles using these IDs, so this is expected to update zero rows.
update public.profiles
set preferred_translation = case preferred_language
  when 'de' then 97
  when 'en' then 80
  when 'fr' then 21
  else 92
end
where preferred_translation in (24, 31, 82, 88, 95);

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
       21, 26, 27, 29, 62, 80,
       84, 89, 92, 97, 98, 100
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
  preferred_language,
  preferred_translation,
  count(*)::integer as profile_count
from public.profiles
where preferred_translation in (24, 31, 82, 88, 95)
group by preferred_language, preferred_translation
order by preferred_translation, preferred_language;

select
  position('21, 26, 27, 29, 62, 80' in pg_get_functiondef(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'::regprocedure
  )) > 0 as active_translation_set_present,
  position('31, 82' in pg_get_functiondef(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'::regprocedure
  )) = 0 as removed_translation_set_absent;
