-- 105_profiles_revoke_authenticated_update_2_1.sql
-- Christian Roots 2.1 final profile-write boundary
--
-- Confirmed production architecture:
--   - User preferences are written through update_own_profile_preferences(...).
--   - Reflection progress/streak is written through
--     record_bible_reflection_progress(...).
--   - Profile badges are written through authenticated, server-validated RPCs.
--   - Effective profile avatars are written through
--     set_profile_avatar_display(...).
--   - Current app code does not directly UPDATE public.profiles.
--
-- Scope:
--   - Revoke direct UPDATE on public.profiles from authenticated clients.
--   - Keep authenticated SELECT unchanged.
--   - Keep service_role and postgres privileges unchanged.
--   - Keep every RLS policy, function, trigger, profile row, and app feature
--     unchanged.
--
-- Operational safety:
--   - Execution verifies every profile-writing RPC before the REVOKE.
--   - Each RPC must be SECURITY DEFINER, executable by authenticated, and owned
--     by a role that can update profiles.
--   - A failed dependency or postcheck rolls back the entire transaction.
--   - No user row is inserted, updated, deleted, or returned by this migration.
--   - Re-running the migration is safe.


-- =========================================================
-- A. PRECHECK - current direct grants
-- =========================================================
-- Expected before first execution:
--   authenticated_can_select = true
--   authenticated_can_update = true
-- Expected after a safe re-run:
--   authenticated_can_select = true
--   authenticated_can_update = false

select
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update,
  has_table_privilege(
    'authenticated', 'public.profiles', 'INSERT'
  ) as authenticated_can_insert,
  has_table_privilege(
    'authenticated', 'public.profiles', 'DELETE'
  ) as authenticated_can_delete;


-- =========================================================
-- B. PRECHECK - all deployed profile-writing RPCs
-- =========================================================
-- Expected: nine rows; every boolean is true.

with required_functions(signature) as (
  values
    ('public.update_own_profile_preferences(text,text,integer,text,boolean)'),
    ('public.record_bible_reflection_progress(uuid,date)'),
    ('public.award_own_reward_badge(uuid,text)'),
    ('public.award_own_noah_badge(uuid,uuid)'),
    ('public.award_own_prayer_share_badges(uuid,boolean)'),
    ('public.award_own_qt_share_badges(uuid,boolean)'),
    ('public.award_own_group_activity_badges(uuid,uuid)'),
    ('public.award_own_paul_badge(uuid)'),
    ('public.set_profile_avatar_display(text,text,text,text,text)')
)
select
  required.signature,
  proc.oid is not null as function_exists,
  proc.prosecdef as security_definer,
  pg_get_userbyid(proc.proowner) as function_owner,
  has_table_privilege(
    proc.proowner, 'public.profiles', 'UPDATE'
  ) as owner_can_update_profiles,
  has_function_privilege(
    'authenticated', proc.oid, 'EXECUTE'
  ) as authenticated_can_execute
from required_functions as required
left join pg_proc as proc
  on proc.oid = to_regprocedure(required.signature)
order by required.signature;


-- =========================================================
-- C. EXECUTE - guarded final UPDATE revoke
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  missing_or_unsafe_functions text;
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Safety stop: public.profiles is missing';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) then
    raise exception 'Safety stop: authenticated profiles SELECT is missing';
  end if;

  if has_table_privilege(
    'authenticated', 'public.profiles', 'INSERT'
  ) or has_table_privilege(
    'authenticated', 'public.profiles', 'DELETE'
  ) then
    raise exception
      'Safety stop: authenticated profiles lifecycle grants are unexpectedly open';
  end if;

  if not has_table_privilege(
    'service_role', 'public.profiles', 'SELECT'
  ) or not has_table_privilege(
    'service_role', 'public.profiles', 'UPDATE'
  ) then
    raise exception 'Safety stop: service_role profile access is incomplete';
  end if;

  with required_functions(signature) as (
    values
      ('public.update_own_profile_preferences(text,text,integer,text,boolean)'),
      ('public.record_bible_reflection_progress(uuid,date)'),
      ('public.award_own_reward_badge(uuid,text)'),
      ('public.award_own_noah_badge(uuid,uuid)'),
      ('public.award_own_prayer_share_badges(uuid,boolean)'),
      ('public.award_own_qt_share_badges(uuid,boolean)'),
      ('public.award_own_group_activity_badges(uuid,uuid)'),
      ('public.award_own_paul_badge(uuid)'),
      ('public.set_profile_avatar_display(text,text,text,text,text)')
  )
  select string_agg(
    required.signature,
    ', '
    order by required.signature
  )
  into missing_or_unsafe_functions
  from required_functions as required
  left join pg_proc as proc
    on proc.oid = to_regprocedure(required.signature)
  where proc.oid is null
     or not proc.prosecdef
     or not has_table_privilege(
       proc.proowner, 'public.profiles', 'UPDATE'
     )
     or not has_function_privilege(
       'authenticated', proc.oid, 'EXECUTE'
     );

  if missing_or_unsafe_functions is not null then
    raise exception
      'Safety stop: missing or unsafe profile RPC(s): %',
      missing_or_unsafe_functions;
  end if;
end;
$$;

revoke update
  on table public.profiles
  from authenticated;

do $$
begin
  if has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) then
    raise exception 'Postcheck failed: authenticated profiles UPDATE remains';
  end if;

  if exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) then
    raise exception
      'Postcheck failed: authenticated profile column UPDATE remains';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) then
    raise exception 'Postcheck failed: authenticated profiles SELECT was lost';
  end if;

  if not has_table_privilege(
    'service_role', 'public.profiles', 'UPDATE'
  ) then
    raise exception 'Postcheck failed: service_role profiles UPDATE was lost';
  end if;
end;
$$;

commit;


-- =========================================================
-- D. POSTCHECK - exact authenticated boundary
-- =========================================================
-- Expected:
--   SELECT                                  = true
--   INSERT, UPDATE, DELETE, special grants = false
--   authenticated_profile_update_columns   = 0

select
  has_table_privilege(
    'authenticated', 'public.profiles', 'SELECT'
  ) as authenticated_can_select,
  has_table_privilege(
    'authenticated', 'public.profiles', 'INSERT'
  ) as authenticated_can_insert,
  has_table_privilege(
    'authenticated', 'public.profiles', 'UPDATE'
  ) as authenticated_can_update,
  has_table_privilege(
    'authenticated', 'public.profiles', 'DELETE'
  ) as authenticated_can_delete,
  has_table_privilege(
    'authenticated', 'public.profiles', 'TRUNCATE'
  ) as authenticated_can_truncate,
  has_table_privilege(
    'authenticated', 'public.profiles', 'REFERENCES'
  ) as authenticated_can_reference,
  has_table_privilege(
    'authenticated', 'public.profiles', 'TRIGGER'
  ) as authenticated_can_create_trigger,
  (
    select count(*)::integer
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) as authenticated_profile_update_columns;


-- =========================================================
-- E. POLICY SNAPSHOT - this migration must not change it
-- =========================================================

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;


-- =========================================================
-- F. EMERGENCY ROLLBACK ONLY - do not run normally
-- =========================================================
-- Restore direct UPDATE only after sharing a concrete production RPC error
-- that proves a deployed client still depends on it.
--
-- grant update on table public.profiles to authenticated;
