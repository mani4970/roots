-- 135_enable_agape_easy_bible_2_2.sql
-- Christian Roots 2.2 Agape Easy Bible activation
--
-- Scope (additive only):
--   - Refuse activation unless the server-only Easy Bible corpus has the
--     complete bridge-aware structure verified before this migration.
--   - Allow existing Roots translation ID 88 in the current profile preference RPC.
--   - Preserve Spanish language support and NVI translation ID 101.
--   - Preserve the RPC's SECURITY DEFINER owner, empty search_path, and
--     authenticated-only EXECUTE boundary.
--
-- Safety guarantees:
--   - No profile, Bible Reflection, check-in, streak, progress, reward, badge,
--     challenge, prayer, group, companion, or Bible corpus row is changed.
--   - No table grant, RLS policy, default privilege, or storage policy changes.
--   - Safe to rerun after successful activation.
--
-- Apply only after:
--   npm run bible:audit:easy -- --live
-- has passed with 31,098 rows, 31,102 canonical verse coverage, 66 books,
-- 1,189 chapters, 4 publisher verse bridges, 0 manual verses, and a live hash
-- identical to the validated local corpus.
-- Expected content SHA-256:
-- 86fc92862d033f57fba3ea60e14d733bc8dfb8a784b9ffa77e52bfe634709111


-- =========================================================
-- A. READ-ONLY PRECHECK
-- =========================================================

select
  count(*)::integer as row_count,
  coalesce(sum(verse_end - verse_start + 1), 0)::integer
    as canonical_verse_coverage,
  count(*) filter (where verse_end > verse_start)::integer
    as bridge_count,
  count(distinct book_number)::integer as book_count,
  count(distinct (book_number, chapter))::integer as chapter_count
from public.agape_bible_verses
where translation_id = 88;

select
  pg_get_userbyid(p.proowner) as owner_name,
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


-- =========================================================
-- B. EXECUTE
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Stop instead of activating against an incomplete corpus or an unexpected
-- profile-preference security boundary.
do $precheck$
declare
  v_function_oid oid;
  v_function_definition text;
  v_normalized_definition text;
  v_function_owner text;
  v_security_definer boolean;
  v_function_config text[];
  v_corpus_rls boolean;
  v_profiles_rls boolean;
  v_row_count integer;
  v_verse_coverage integer;
  v_bridge_count integer;
  v_book_count integer;
  v_chapter_count integer;
begin
  if to_regclass('public.agape_bible_verses') is null then
    raise exception 'Safety stop: public.agape_bible_verses is missing';
  end if;

  select
    c.relrowsecurity
  into
    v_corpus_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'agape_bible_verses'
    and c.relkind = 'r';

  if v_corpus_rls is distinct from true then
    raise exception 'Safety stop: Easy Bible corpus RLS is not enabled';
  end if;

  if has_table_privilege('anon', 'public.agape_bible_verses', 'SELECT')
     or has_table_privilege('anon', 'public.agape_bible_verses', 'INSERT')
     or has_table_privilege('anon', 'public.agape_bible_verses', 'UPDATE')
     or has_table_privilege('anon', 'public.agape_bible_verses', 'DELETE')
     or has_table_privilege('authenticated', 'public.agape_bible_verses', 'SELECT')
     or has_table_privilege('authenticated', 'public.agape_bible_verses', 'INSERT')
     or has_table_privilege('authenticated', 'public.agape_bible_verses', 'UPDATE')
     or has_table_privilege('authenticated', 'public.agape_bible_verses', 'DELETE')
     or not has_table_privilege('service_role', 'public.agape_bible_verses', 'SELECT')
     or not has_table_privilege('service_role', 'public.agape_bible_verses', 'INSERT')
     or not has_table_privilege('service_role', 'public.agape_bible_verses', 'UPDATE')
     or has_table_privilege('service_role', 'public.agape_bible_verses', 'DELETE') then
    raise exception 'Safety stop: unexpected Easy Bible corpus table privileges';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'agape_bible_verses'
  ) then
    raise exception 'Safety stop: Easy Bible corpus must have no client RLS policies';
  end if;

  select
    count(*)::integer,
    coalesce(sum(verse_end - verse_start + 1), 0)::integer,
    count(*) filter (where verse_end > verse_start)::integer,
    count(distinct book_number)::integer,
    count(distinct (book_number, chapter))::integer
  into
    v_row_count,
    v_verse_coverage,
    v_bridge_count,
    v_book_count,
    v_chapter_count
  from public.agape_bible_verses
  where translation_id = 88;

  if v_row_count <> 31098
     or v_verse_coverage <> 31102
     or v_bridge_count <> 4
     or v_book_count <> 66
     or v_chapter_count <> 1189 then
    raise exception
      'Safety stop: incomplete Easy Bible corpus rows=% coverage=% bridges=% books=% chapters=%',
      v_row_count,
      v_verse_coverage,
      v_bridge_count,
      v_book_count,
      v_chapter_count;
  end if;

  if not exists (
    select 1 from public.agape_bible_verses
    where translation_id = 88 and book_number = 7 and chapter = 20
      and verse_start = 22 and verse_end = 23
  )
  or not exists (
    select 1 from public.agape_bible_verses
    where translation_id = 88 and book_number = 9 and chapter = 30
      and verse_start = 30 and verse_end = 31
  )
  or not exists (
    select 1 from public.agape_bible_verses
    where translation_id = 88 and book_number = 10 and chapter = 4
      and verse_start = 6 and verse_end = 7
  )
  or not exists (
    select 1 from public.agape_bible_verses
    where translation_id = 88 and book_number = 11 and chapter = 8
      and verse_start = 41 and verse_end = 42
  ) then
    raise exception 'Safety stop: expected Easy Bible publisher bridge is missing';
  end if;

  v_function_oid := to_regprocedure(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'
  );

  if v_function_oid is null then
    raise exception 'Safety stop: profile preference RPC is missing';
  end if;

  select
    pg_get_functiondef(p.oid),
    pg_get_userbyid(p.proowner),
    p.prosecdef,
    p.proconfig
  into
    v_function_definition,
    v_function_owner,
    v_security_definer,
    v_function_config
  from pg_proc p
  where p.oid = v_function_oid;

  v_normalized_definition := regexp_replace(
    v_function_definition, '[[:space:]]+', ' ', 'g'
  );

  if v_function_owner <> 'postgres' then
    raise exception 'Safety stop: unexpected profile preference RPC owner: %',
      v_function_owner;
  end if;

  if not v_security_definer then
    raise exception 'Safety stop: profile preference RPC is not SECURITY DEFINER';
  end if;

  if v_function_config is distinct from array['search_path=""']::text[] then
    raise exception 'Safety stop: unexpected profile preference RPC config: %',
      v_function_config;
  end if;

  if not has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
     or has_function_privilege('anon', v_function_oid, 'EXECUTE')
     or has_function_privilege('service_role', v_function_oid, 'EXECUTE') then
    raise exception 'Safety stop: unexpected profile preference RPC grants';
  end if;

  if position('update public.profiles as profile' in v_function_definition) = 0
     or position('where profile.id = v_user_id' in v_function_definition) = 0
     or position($needle$p_avatar_type not in ('rootsman', 'rootswoman')$needle$ in v_function_definition) = 0
     or position($needle$return jsonb_build_object('updated', true, 'reason', 'updated')$needle$ in v_function_definition) = 0 then
    raise exception 'Safety stop: unexpected profile preference RPC body';
  end if;

  if position(
    $needle$p_preferred_language not in ('ko', 'de', 'en', 'fr', 'es')$needle$
    in v_function_definition
  ) = 0 then
    raise exception 'Safety stop: Spanish language validation is missing';
  end if;

  if not (
    position(
      'p_preferred_translation not in ( 21, 26, 27, 29, 62, 80, 84, 89, 92, 97, 98, 100, 101 )'
      in v_normalized_definition
    ) > 0
    or position(
      'p_preferred_translation not in ( 21, 26, 27, 29, 62, 80, 84, 88, 89, 92, 97, 98, 100, 101 )'
      in v_normalized_definition
    ) > 0
  ) then
    raise exception 'Safety stop: unexpected translation validation in profile preference RPC';
  end if;

  select c.relrowsecurity
  into v_profiles_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profiles'
    and c.relkind = 'r';

  if v_profiles_rls is distinct from true then
    raise exception 'Safety stop: profiles RLS is not enabled';
  end if;
end;
$precheck$;

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
     and p_preferred_language not in ('ko', 'de', 'en', 'fr', 'es') then
    return jsonb_build_object('updated', false, 'reason', 'invalid_language');
  end if;

  if p_preferred_translation is not null
     and p_preferred_translation not in (
       21, 26, 27, 29, 62, 80,
       84, 88, 89, 92, 97, 98, 100, 101
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

-- Fail the transaction if the activated function or corpus security differs.
do $postcheck$
declare
  v_function_oid oid;
  v_function_definition text;
  v_function_owner text;
  v_security_definer boolean;
  v_function_config text[];
  v_row_count integer;
  v_verse_coverage integer;
  v_bridge_count integer;
  v_book_count integer;
  v_chapter_count integer;
begin
  v_function_oid := to_regprocedure(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'
  );

  select
    pg_get_functiondef(p.oid),
    pg_get_userbyid(p.proowner),
    p.prosecdef,
    p.proconfig
  into
    v_function_definition,
    v_function_owner,
    v_security_definer,
    v_function_config
  from pg_proc p
  where p.oid = v_function_oid;

  if v_function_owner <> 'postgres'
     or not v_security_definer
     or v_function_config is distinct from array['search_path=""']::text[] then
    raise exception 'Postcheck failed: profile preference RPC security changed';
  end if;

  if position(
    $needle$p_preferred_language not in ('ko', 'de', 'en', 'fr', 'es')$needle$
    in v_function_definition
  ) = 0 then
    raise exception 'Postcheck failed: Spanish language validation is missing';
  end if;

  if position('84, 88, 89, 92, 97, 98, 100, 101' in v_function_definition) = 0 then
    raise exception 'Postcheck failed: Easy Bible ID 88 is missing';
  end if;

  if not has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
     or has_function_privilege('anon', v_function_oid, 'EXECUTE')
     or has_function_privilege('service_role', v_function_oid, 'EXECUTE') then
    raise exception 'Postcheck failed: profile preference RPC grants changed';
  end if;

  select
    count(*)::integer,
    coalesce(sum(verse_end - verse_start + 1), 0)::integer,
    count(*) filter (where verse_end > verse_start)::integer,
    count(distinct book_number)::integer,
    count(distinct (book_number, chapter))::integer
  into
    v_row_count,
    v_verse_coverage,
    v_bridge_count,
    v_book_count,
    v_chapter_count
  from public.agape_bible_verses
  where translation_id = 88;

  if v_row_count <> 31098
     or v_verse_coverage <> 31102
     or v_bridge_count <> 4
     or v_book_count <> 66
     or v_chapter_count <> 1189 then
    raise exception 'Postcheck failed: Easy Bible corpus changed during activation';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relkind = 'r'
      and c.relrowsecurity
  ) then
    raise exception 'Postcheck failed: profiles RLS is not enabled';
  end if;
end;
$postcheck$;

commit;


-- =========================================================
-- C. READ-ONLY POSTCHECK
-- =========================================================

select
  count(*)::integer as row_count,
  coalesce(sum(verse_end - verse_start + 1), 0)::integer
    as canonical_verse_coverage,
  count(*) filter (where verse_end > verse_start)::integer
    as bridge_count,
  count(distinct book_number)::integer as book_count,
  count(distinct (book_number, chapter))::integer as chapter_count
from public.agape_bible_verses
where translation_id = 88;

select
  pg_get_userbyid(p.proowner) as owner_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  position(
    $needle$p_preferred_language not in ('ko', 'de', 'en', 'fr', 'es')$needle$
    in pg_get_functiondef(p.oid)
  ) > 0 as spanish_language_allowed,
  position(
    '84, 88, 89, 92, 97, 98, 100, 101'
    in pg_get_functiondef(p.oid)
  ) > 0 as easy_bible_88_allowed,
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
  c.relrowsecurity as corpus_rls_enabled,
  has_table_privilege('anon', 'public.agape_bible_verses', 'SELECT')
    as anon_can_select,
  has_table_privilege('authenticated', 'public.agape_bible_verses', 'SELECT')
    as authenticated_can_select,
  has_table_privilege('service_role', 'public.agape_bible_verses', 'SELECT')
    as service_role_can_select,
  has_table_privilege('service_role', 'public.agape_bible_verses', 'DELETE')
    as service_role_can_delete,
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'agape_bible_verses') as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'agape_bible_verses'
  and c.relkind = 'r';
