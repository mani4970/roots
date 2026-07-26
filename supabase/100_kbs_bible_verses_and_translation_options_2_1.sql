-- 100_kbs_bible_verses_and_translation_options_2_1.sql
-- Christian Roots 2.1 Korean Bible corpus and translation-option update
--
-- Scope:
--   - Create a server-only table for the licensed KBS verse corpus.
--   - Keep RLS enabled and deny anon/authenticated direct access.
--   - Allow only the server secret role to read/import corpus rows.
--   - Keep only the four requested Korean translations in preference validation.
--   - Add Schlachter (translation ID 31) to preference validation.
--   - Preserve all reflection completion, streak, progress, reward, and badge data.


-- =========================================================
-- A. PRECHECK
-- =========================================================

select
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regprocedure(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'
  ) is not null as preference_rpc_exists,
  to_regclass('public.kbs_bible_verses') as existing_kbs_bible_table;

select
  preferred_translation,
  count(*)::integer as profile_count
from public.profiles
where preferred_translation in (81, 83, 88, 99)
group by preferred_translation
order by preferred_translation;


-- =========================================================
-- B. EXECUTE
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

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
      or (column_name = 'preferred_translation' and data_type = 'integer')
    );

  if required_column_count <> 2 then
    raise exception 'Safety stop: unexpected public.profiles schema';
  end if;

  if to_regprocedure(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'
  ) is null then
    raise exception 'Safety stop: profile preference RPC is missing';
  end if;
end;
$$;

create table if not exists public.kbs_bible_verses (
  translation_id smallint not null,
  translation_code text not null,
  book_number smallint not null,
  book_code text not null,
  chapter smallint not null,
  verse_start smallint not null,
  verse_end smallint not null,
  text text not null,
  imported_at timestamptz not null default now(),
  constraint kbs_bible_verses_pkey
    primary key (translation_id, book_number, chapter, verse_start),
  constraint kbs_bible_verses_translation_check
    check (
      (translation_id = 92 and translation_code = 'NKRV')
      or (translation_id = 84 and translation_code = 'KRV')
      or (translation_id = 98 and translation_code = 'RNKSV')
    ),
  constraint kbs_bible_verses_book_number_check
    check (book_number between 1 and 66),
  constraint kbs_bible_verses_book_code_check
    check (book_code ~ '^[1-3]?[A-Z]{2,3}$'),
  constraint kbs_bible_verses_chapter_check
    check (chapter between 1 and 150),
  constraint kbs_bible_verses_verse_range_check
    check (
      verse_start between 1 and 176
      and verse_end between verse_start and 176
    ),
  constraint kbs_bible_verses_text_check
    check (char_length(btrim(text)) > 0)
);

comment on table public.kbs_bible_verses is
  'Licensed KBS Korean Bible corpus. Direct client access is denied; Roots server routes query it with the server secret key.';

alter table public.kbs_bible_verses enable row level security;

revoke all
  on table public.kbs_bible_verses
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.kbs_bible_verses
  to service_role;

update public.profiles
set preferred_translation = 92
where preferred_translation in (81, 83, 88, 99);

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
       84, 89, 92, 95, 97, 98, 100
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
  c.relrowsecurity as rls_enabled,
  has_table_privilege(
    'anon', 'public.kbs_bible_verses', 'SELECT'
  ) as anon_can_select,
  has_table_privilege(
    'authenticated', 'public.kbs_bible_verses', 'SELECT'
  ) as authenticated_can_select,
  has_table_privilege(
    'service_role', 'public.kbs_bible_verses', 'SELECT'
  ) as service_role_can_select,
  has_table_privilege(
    'service_role', 'public.kbs_bible_verses', 'INSERT'
  ) as service_role_can_insert,
  has_table_privilege(
    'service_role', 'public.kbs_bible_verses', 'UPDATE'
  ) as service_role_can_update,
  has_table_privilege(
    'service_role', 'public.kbs_bible_verses', 'DELETE'
  ) as service_role_can_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'kbs_bible_verses';

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
  preferred_translation,
  count(*)::integer as profile_count
from public.profiles
where preferred_translation in (81, 83, 88, 99)
group by preferred_translation
order by preferred_translation;
