-- 130_spanish_language_preferences_2_2.sql
-- Christian Roots 2.2 Spanish language database activation
--
-- Scope (additive only):
--   - Allow preferred_language = 'es' in update_own_profile_preferences(...).
--   - Allow the licensed NVI Roots translation ID 101 as a profile preference.
--   - Allow notifications.locale = 'es'.
--
-- Safety guarantees:
--   - No existing profile, notification, Bible Reflection, check-in, streak,
--     reward, challenge, or historical Bible data is updated or deleted.
--   - No table grants, RLS policies, default privileges, or column defaults change.
--   - The existing SECURITY DEFINER boundary, empty search_path, function owner,
--     function comment, and authenticated-only EXECUTE access are preserved.
--   - Safe to rerun: the target definition is replaced with the same definition.


-- =========================================================
-- A. READ-ONLY PRECHECK
-- =========================================================

select
  p.oid::regprocedure::text as function_signature,
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

select
  c.conname as constraint_name,
  pg_get_constraintdef(c.oid, true) as constraint_definition,
  c.convalidated as is_validated
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'notifications'
  and c.conname = 'notifications_locale_check';

select
  (select count(*)::integer from public.profiles where preferred_language = 'es')
    as profiles_using_spanish,
  (select count(*)::integer from public.profiles where preferred_translation = 101)
    as profiles_using_nvi_101,
  (select count(*)::integer from public.notifications where locale = 'es')
    as notifications_using_spanish;


-- =========================================================
-- B. EXECUTE
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Stop instead of overwriting an unexpected security or schema state.
do $precheck$
declare
  v_function_oid oid;
  v_function_definition text;
  v_normalized_definition text;
  v_function_owner text;
  v_security_definer boolean;
  v_function_config text[];
  v_constraint_definition text;
  v_profiles_rls boolean;
  v_notifications_rls boolean;
begin
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

  if not has_function_privilege(
    'authenticated', v_function_oid, 'EXECUTE'
  ) then
    raise exception 'Safety stop: authenticated cannot execute profile preference RPC';
  end if;

  if has_function_privilege('anon', v_function_oid, 'EXECUTE') then
    raise exception 'Safety stop: anon can execute profile preference RPC';
  end if;

  if has_function_privilege('service_role', v_function_oid, 'EXECUTE') then
    raise exception 'Safety stop: service_role can execute profile preference RPC';
  end if;

  if position('update public.profiles as profile' in v_function_definition) = 0
     or position('where profile.id = v_user_id' in v_function_definition) = 0
     or position($needle$p_avatar_type not in ('rootsman', 'rootswoman')$needle$ in v_function_definition) = 0
     or position($needle$return jsonb_build_object('updated', true, 'reason', 'updated')$needle$ in v_function_definition) = 0 then
    raise exception 'Safety stop: unexpected profile preference RPC body';
  end if;

  if not (
    position(
      $needle$p_preferred_language not in ('ko', 'de', 'en', 'fr')$needle$
      in v_function_definition
    ) > 0
    or position(
      $needle$p_preferred_language not in ('ko', 'de', 'en', 'fr', 'es')$needle$
      in v_function_definition
    ) > 0
  ) then
    raise exception 'Safety stop: unexpected language validation in profile preference RPC';
  end if;

  if not (
    position(
      'p_preferred_translation not in ( 21, 26, 27, 29, 62, 80, 84, 89, 92, 97, 98, 100 )'
      in v_normalized_definition
    ) > 0
    or position(
      'p_preferred_translation not in ( 21, 26, 27, 29, 62, 80, 84, 89, 92, 97, 98, 100, 101 )'
      in v_normalized_definition
    ) > 0
  ) then
    raise exception 'Safety stop: unexpected translation validation in profile preference RPC';
  end if;

  select pg_get_constraintdef(c.oid, true)
  into v_constraint_definition
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'notifications'
    and c.conname = 'notifications_locale_check';

  if v_constraint_definition is null then
    raise exception 'Safety stop: notifications_locale_check is missing';
  end if;

  if v_constraint_definition not in (
    'CHECK (locale = ANY (ARRAY[''ko''::text, ''de''::text, ''en''::text, ''fr''::text]))',
    'CHECK (locale = ANY (ARRAY[''ko''::text, ''de''::text, ''en''::text, ''fr''::text, ''es''::text]))'
  ) then
    raise exception 'Safety stop: unexpected notifications locale constraint: %',
      v_constraint_definition;
  end if;

  if exists (
    select 1
    from public.notifications
    where locale not in ('ko', 'de', 'en', 'fr', 'es')
  ) then
    raise exception 'Safety stop: unexpected notifications locale data exists';
  end if;

  select c.relrowsecurity
  into v_profiles_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profiles'
    and c.relkind = 'r';

  select c.relrowsecurity
  into v_notifications_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'notifications'
    and c.relkind = 'r';

  if v_profiles_rls is distinct from true
     or v_notifications_rls is distinct from true then
    raise exception 'Safety stop: expected RLS on profiles and notifications';
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
       84, 89, 92, 97, 98, 100, 101
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

-- Keep the existing authenticated-only execution boundary explicit.
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

-- Replace only the locale check. Existing rows remain untouched.
alter table public.notifications
  drop constraint notifications_locale_check;

alter table public.notifications
  add constraint notifications_locale_check
  check (locale in ('ko', 'de', 'en', 'fr', 'es'))
  not valid;

alter table public.notifications
  validate constraint notifications_locale_check;

-- Fail the transaction if any target security or validation property differs.
do $postcheck$
declare
  v_function_oid oid;
  v_function_definition text;
  v_constraint_definition text;
  v_function_owner text;
  v_security_definer boolean;
  v_function_config text[];
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

  if position('84, 89, 92, 97, 98, 100, 101' in v_function_definition) = 0 then
    raise exception 'Postcheck failed: NVI Roots translation ID 101 is missing';
  end if;

  if not has_function_privilege(
    'authenticated', v_function_oid, 'EXECUTE'
  )
     or has_function_privilege('anon', v_function_oid, 'EXECUTE')
     or has_function_privilege('service_role', v_function_oid, 'EXECUTE') then
    raise exception 'Postcheck failed: profile preference RPC grants changed';
  end if;

  select pg_get_constraintdef(c.oid, true)
  into v_constraint_definition
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'notifications'
    and c.conname = 'notifications_locale_check'
    and c.convalidated;

  if v_constraint_definition is distinct from
    'CHECK (locale = ANY (ARRAY[''ko''::text, ''de''::text, ''en''::text, ''fr''::text, ''es''::text]))' then
    raise exception 'Postcheck failed: unexpected notifications locale constraint: %',
      v_constraint_definition;
  end if;

  if exists (
    select 1
    from public.notifications
    where locale not in ('ko', 'de', 'en', 'fr', 'es')
  ) then
    raise exception 'Postcheck failed: unexpected notifications locale data exists';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relkind = 'r'
      and c.relrowsecurity
  )
  or not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'notifications'
      and c.relkind = 'r'
      and c.relrowsecurity
  ) then
    raise exception 'Postcheck failed: expected RLS on profiles and notifications';
  end if;
end;
$postcheck$;

commit;


-- =========================================================
-- C. READ-ONLY POSTCHECK
-- =========================================================

select
  pg_get_userbyid(p.proowner) as owner_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  position(
    $needle$p_preferred_language not in ('ko', 'de', 'en', 'fr', 'es')$needle$
    in pg_get_functiondef(p.oid)
  ) > 0 as spanish_language_allowed,
  position(
    '84, 89, 92, 97, 98, 100, 101'
    in pg_get_functiondef(p.oid)
  ) > 0 as nvi_101_allowed,
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
  pg_get_constraintdef(c.oid, true) as constraint_definition,
  c.convalidated as is_validated
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'notifications'
  and c.conname = 'notifications_locale_check';

select
  (select relrowsecurity
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'profiles' and c.relkind = 'r')
    as profiles_rls_enabled,
  (select relrowsecurity
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'notifications' and c.relkind = 'r')
    as notifications_rls_enabled,
  (select count(*)::integer
   from public.notifications
   where locale not in ('ko', 'de', 'en', 'fr', 'es'))
    as invalid_notification_locale_rows;

select
  preferred_language,
  preferred_translation,
  count(*)::integer as profile_count
from public.profiles
group by preferred_language, preferred_translation
order by preferred_language, preferred_translation;
