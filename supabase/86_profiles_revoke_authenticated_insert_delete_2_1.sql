-- 86_profiles_revoke_authenticated_insert_delete_2_1.sql
-- Christian Roots 2.1 profiles lifecycle-write stabilization
--
-- Confirmed production architecture:
--   - Signup creates public.profiles through the enabled auth.users trigger
--     backed by public.handle_new_user().
--   - handle_new_user() is SECURITY DEFINER, owned by postgres, and postgres
--     can INSERT into public.profiles.
--   - Account deletion calls the server-only /api/account/delete route and the
--     service_role deletes the profile.
--   - Normal authenticated app code does not directly INSERT or DELETE rows in
--     public.profiles.
--
-- Scope of this migration:
--   - Revoke only direct INSERT and DELETE on public.profiles from the
--     authenticated role.
--   - Keep authenticated SELECT and UPDATE unchanged.
--   - Keep service_role and postgres privileges unchanged.
--   - Keep the signup trigger, account-deletion route, functions, RLS policies,
--     profile rows, badges, progress, Storage, and app source code unchanged.
--
-- Operational safety:
--   - The execution block rechecks every critical signup/deletion dependency.
--   - A failed dependency check aborts the transaction before REVOKE.
--   - A five-second lock timeout prevents this migration from waiting behind a
--     busy production operation. A timeout leaves the old grants unchanged.
--   - No user-data row is read for output, inserted, updated, or deleted.
--   - The migration is idempotent.


-- =========================================================
-- A. PRECHECK - current profiles grants
-- =========================================================

select
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as privileges
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'profiles'
group by grantee
order by grantee;


-- =========================================================
-- B. PRECHECK - signup function and trigger
-- =========================================================
-- Expected:
--   function_exists              = true
--   security_definer             = true
--   function_owner               = postgres
--   function_owner_can_insert    = true
--   enabled_signup_trigger_count = 1
--   auth_admin_can_execute       = true

with signup_function as (
  select
    proc.oid,
    proc.prosecdef,
    proc.proowner
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'handle_new_user'
    and pg_get_function_identity_arguments(proc.oid) = ''
), signup_trigger as (
  select count(*)::integer as enabled_trigger_count
  from pg_trigger trigger_row
  join pg_class table_class
    on table_class.oid = trigger_row.tgrelid
  join pg_namespace table_namespace
    on table_namespace.oid = table_class.relnamespace
  where not trigger_row.tgisinternal
    and table_namespace.nspname = 'auth'
    and table_class.relname = 'users'
    and trigger_row.tgfoid = to_regprocedure('public.handle_new_user()')
    and trigger_row.tgenabled in ('O', 'A')
)
select
  signup_function.oid is not null as function_exists,
  signup_function.prosecdef as security_definer,
  pg_get_userbyid(signup_function.proowner) as function_owner,
  has_table_privilege(
    signup_function.proowner,
    'public.profiles',
    'INSERT'
  ) as function_owner_can_insert,
  signup_trigger.enabled_trigger_count as enabled_signup_trigger_count,
  has_function_privilege(
    'supabase_auth_admin',
    signup_function.oid,
    'EXECUTE'
  ) as auth_admin_can_execute
from signup_function
cross join signup_trigger;


-- =========================================================
-- C. PRECHECK - account deletion remains server-owned
-- =========================================================
-- Expected: both values are true.

select
  has_table_privilege(
    'service_role', 'public.profiles', 'SELECT'
  ) as service_role_can_select_profile,
  has_table_privilege(
    'service_role', 'public.profiles', 'DELETE'
  ) as service_role_can_delete_profile;


-- =========================================================
-- D. EXECUTE - guarded lifecycle-write boundary
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  signup_function_oid oid := to_regprocedure('public.handle_new_user()');
  signup_function_owner oid;
begin
  if signup_function_oid is null then
    raise exception 'Safety stop: public.handle_new_user() is missing';
  end if;

  select proc.proowner
  into signup_function_owner
  from pg_proc proc
  where proc.oid = signup_function_oid
    and proc.prosecdef;

  if signup_function_owner is null then
    raise exception 'Safety stop: handle_new_user() is not SECURITY DEFINER';
  end if;

  if pg_get_userbyid(signup_function_owner) <> 'postgres' then
    raise exception 'Safety stop: unexpected handle_new_user() owner: %',
      pg_get_userbyid(signup_function_owner);
  end if;

  if not has_table_privilege(
    signup_function_owner,
    'public.profiles',
    'INSERT'
  ) then
    raise exception 'Safety stop: signup function owner cannot insert profiles';
  end if;

  if not exists (
    select 1
    from pg_trigger trigger_row
    join pg_class table_class
      on table_class.oid = trigger_row.tgrelid
    join pg_namespace table_namespace
      on table_namespace.oid = table_class.relnamespace
    where not trigger_row.tgisinternal
      and table_namespace.nspname = 'auth'
      and table_class.relname = 'users'
      and trigger_row.tgfoid = signup_function_oid
      and trigger_row.tgenabled in ('O', 'A')
  ) then
    raise exception 'Safety stop: enabled auth.users signup trigger is missing';
  end if;

  if not exists (
    select 1
    from pg_roles
    where rolname = 'supabase_auth_admin'
  ) then
    raise exception 'Safety stop: supabase_auth_admin role is missing';
  end if;

  if not has_function_privilege(
    'supabase_auth_admin',
    signup_function_oid,
    'EXECUTE'
  ) then
    raise exception 'Safety stop: supabase_auth_admin cannot execute signup trigger';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.profiles',
    'SELECT'
  ) then
    raise exception 'Safety stop: service_role cannot select profiles';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.profiles',
    'DELETE'
  ) then
    raise exception 'Safety stop: service_role cannot delete profiles';
  end if;
end;
$$;

revoke insert, delete
  on table public.profiles
  from authenticated;

commit;


-- =========================================================
-- E. POSTCHECK - exact authenticated privilege boundary
-- =========================================================
-- Expected:
--   SELECT, UPDATE                         = true
--   INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER = false

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
  ) as authenticated_can_delete,
  has_table_privilege(
    'authenticated', 'public.profiles', 'TRUNCATE'
  ) as authenticated_can_truncate,
  has_table_privilege(
    'authenticated', 'public.profiles', 'REFERENCES'
  ) as authenticated_can_reference,
  has_table_privilege(
    'authenticated', 'public.profiles', 'TRIGGER'
  ) as authenticated_can_create_trigger;


-- =========================================================
-- F. POSTCHECK - signup and deletion service paths remain available
-- =========================================================
-- Expected: all values are true and trigger count is 1.

select
  has_function_privilege(
    'supabase_auth_admin',
    'public.handle_new_user()',
    'EXECUTE'
  ) as auth_admin_can_execute_signup_trigger,
  has_table_privilege(
    'service_role', 'public.profiles', 'SELECT'
  ) as service_role_can_select_profile,
  has_table_privilege(
    'service_role', 'public.profiles', 'DELETE'
  ) as service_role_can_delete_profile,
  (
    select count(*)
    from pg_trigger trigger_row
    join pg_class table_class
      on table_class.oid = trigger_row.tgrelid
    join pg_namespace table_namespace
      on table_namespace.oid = table_class.relnamespace
    where not trigger_row.tgisinternal
      and table_namespace.nspname = 'auth'
      and table_class.relname = 'users'
      and trigger_row.tgfoid = to_regprocedure('public.handle_new_user()')
      and trigger_row.tgenabled in ('O', 'A')
  ) as enabled_signup_trigger_count;


-- =========================================================
-- G. FINAL GRANT SNAPSHOT
-- =========================================================

select
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as privileges
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'profiles'
group by grantee
order by grantee;


-- =========================================================
-- H. POLICY SNAPSHOT - this migration must not change it
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
-- I. EMERGENCY ROLLBACK ONLY - do not run during normal setup
-- =========================================================
-- Restore only after sharing a concrete signup or deletion regression and
-- confirming that the trigger/service paths above are not being used.
--
-- grant insert, delete
--   on table public.profiles
--   to authenticated;
