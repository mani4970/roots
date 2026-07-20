-- 85_profiles_revoke_authenticated_special_privileges_2_1.sql
-- Christian Roots 2.1 profiles grant stabilization (low-risk phase)
--
-- Scope of this migration:
--   - Revoke only TRUNCATE, REFERENCES, and TRIGGER on public.profiles from
--     authenticated users.
--   - Keep SELECT, INSERT, UPDATE, and DELETE unchanged in this phase.
--   - Keep service_role and postgres privileges unchanged.
--   - Keep every profiles RLS policy, function, trigger, and row unchanged.
--   - Do not touch signup, account deletion, badges, progress, Storage, or app
--     source code.
--
-- PostgreSQL meaning of the removed privileges:
--   - TRUNCATE: allows clearing the whole table outside row-level policies.
--   - REFERENCES: allows creating foreign-key references to the table.
--   - TRIGGER: allows creating a new trigger on the table; revoking it does not
--     stop existing triggers from firing.
--
-- Safety:
--   - The app does not use these three schema-level capabilities.
--   - The transaction changes ACL metadata only and does not read or write user
--     rows.
--   - The statements are idempotent.


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
-- B. PRECHECK - preserve normal authenticated app privileges
-- =========================================================
-- Expected before execution: all values are true.

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
  ) as authenticated_can_delete;


-- =========================================================
-- C. EXECUTE - remove only unused special privileges
-- =========================================================

begin;

revoke truncate, references, trigger
  on table public.profiles
  from authenticated;

commit;


-- =========================================================
-- D. POSTCHECK - exact authenticated privilege boundary
-- =========================================================
-- Expected:
--   SELECT, INSERT, UPDATE, DELETE = true
--   TRUNCATE, REFERENCES, TRIGGER  = false

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
  ) as authenticated_can_create_trigger;


-- =========================================================
-- E. POSTCHECK - service lifecycle privileges stay unchanged
-- =========================================================
-- Expected: all values are true.

select
  has_table_privilege(
    'service_role', 'public.profiles', 'SELECT'
  ) as service_role_can_select,
  has_table_privilege(
    'service_role', 'public.profiles', 'INSERT'
  ) as service_role_can_insert,
  has_table_privilege(
    'service_role', 'public.profiles', 'UPDATE'
  ) as service_role_can_update,
  has_table_privilege(
    'service_role', 'public.profiles', 'DELETE'
  ) as service_role_can_delete;


-- =========================================================
-- F. FINAL GRANT SNAPSHOT
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
-- G. POLICY SNAPSHOT - this migration must not change it
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
-- H. EMERGENCY ROLLBACK ONLY - do not run during normal setup
-- =========================================================
-- These privileges are not used by the app. Restore them only after sharing a
-- concrete database error that proves one is required.
--
-- grant truncate, references, trigger
--   on table public.profiles
--   to authenticated;
