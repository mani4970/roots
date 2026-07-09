-- 63_supabase_cleanup_default_privileges_postgres_execute_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 63
--
-- STATUS: EXECUTION CANDIDATE / RUN SECTIONS SEPARATELY.
--
-- Purpose:
--   Clean broad DEFAULT PRIVILEGES for FUTURE public-schema objects created by the
--   postgres owner role. This aligns future Roots migrations with the explicit-GRANT
--   discipline: every new table/function/sequence must grant only the roles it needs.
--
-- Important safety notes:
--   - DEFAULT PRIVILEGES affect FUTURE objects only.
--   - This does NOT change today's existing tables, rows, RLS policies, functions,
--     storage buckets, progress/streak data, Bible Reflection records, prayers,
--     groups, companions, reward maps, or app code.
--   - Batch 62 showed current_user/current_role/session_user = postgres.
--   - Batch 62 showed postgres default privileges are likely executable from SQL Editor.
--   - Batch 62 showed supabase_admin defaults are likely NOT executable from SQL Editor.
--   - Therefore this batch touches ONLY default privileges FOR ROLE postgres.
--   - supabase_admin default privileges are intentionally NOT touched here.
--
-- NOT touched in this batch:
--   - existing object grants
--   - existing anon/authenticated/service_role table grants
--   - daily_checkins
--   - profiles
--   - qt_records
--   - groups / group_members
--   - prayer_items
--   - get_group_invite()
--   - group challenge RPCs
--   - storage buckets
--   - RLS policies
--   - supabase_admin default privileges
--
-- Run order in Supabase SQL Editor:
--   1) Run section A and confirm the role context is still postgres.
--   2) Run section B and confirm rows show postgres defaults for anon/authenticated/service_role.
--   3) Run section C once.
--   4) Run section D and confirm it returns 0 rows.
--   5) Run section E as a snapshot only. Rows for supabase_admin may remain and are expected.
--   6) Keep section F only for emergency rollback. Do not run F unless explicitly needed.


-- =========================================================
-- A. ROLE / PERMISSION GUARD
-- =========================================================
-- Expected:
--   current_user = postgres
--   current_role = postgres
--   session_user = postgres
-- If this is not postgres, stop and do not run section C.

select
  current_user as current_user,
  current_role as current_role,
  session_user as session_user,
  current_database() as database_name,
  current_schema() as current_schema,
  (current_user = 'postgres') as can_run_postgres_default_privilege_cleanup;


-- =========================================================
-- B. PRECHECK - postgres default privileges to remove
-- =========================================================
-- Expected before section C:
--   Rows for owner_role = postgres and grantee in anon/authenticated/service_role.
--   Object types may include:
--     r = tables/views
--     S = sequences
--     f = functions
-- This section is read-only.

select
  n.nspname as schema_name,
  pg_get_userbyid(d.defaclrole) as owner_role,
  d.defaclobjtype as object_type,
  case d.defaclobjtype
    when 'r' then 'tables/views'
    when 'S' then 'sequences'
    when 'f' then 'functions'
    when 'T' then 'types'
    when 'n' then 'schemas'
    else d.defaclobjtype::text
  end as object_type_label,
  coalesce(grantee_role.rolname, 'PUBLIC') as grantee,
  acl.privilege_type,
  acl.is_grantable,
  d.defaclacl as raw_default_acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) as acl
left join pg_roles grantee_role on grantee_role.oid = acl.grantee
where n.nspname = 'public'
  and pg_get_userbyid(d.defaclrole) = 'postgres'
  and coalesce(grantee_role.rolname, 'PUBLIC') in ('anon', 'authenticated', 'service_role')
order by schema_name, owner_role, object_type, grantee, privilege_type;


-- =========================================================
-- C. EXECUTE - remove broad future defaults for postgres-owned public objects
-- =========================================================
-- This affects only objects created in the FUTURE by role postgres in schema public.
-- It removes automatic future grants to anon/authenticated/service_role.
-- Future migrations must add explicit GRANT statements for the roles they require.

begin;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

commit;


-- =========================================================
-- D. POSTCHECK - postgres API-role defaults should be gone
-- =========================================================
-- Expected after section C: 0 rows, or Supabase may display only "success".
-- If rows remain for owner_role = postgres and grantee in anon/authenticated/service_role,
-- stop and send the result before doing anything else.

select
  n.nspname as schema_name,
  pg_get_userbyid(d.defaclrole) as owner_role,
  d.defaclobjtype as object_type,
  case d.defaclobjtype
    when 'r' then 'tables/views'
    when 'S' then 'sequences'
    when 'f' then 'functions'
    when 'T' then 'types'
    when 'n' then 'schemas'
    else d.defaclobjtype::text
  end as object_type_label,
  coalesce(grantee_role.rolname, 'PUBLIC') as grantee,
  acl.privilege_type,
  acl.is_grantable,
  d.defaclacl as raw_default_acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) as acl
left join pg_roles grantee_role on grantee_role.oid = acl.grantee
where n.nspname = 'public'
  and pg_get_userbyid(d.defaclrole) = 'postgres'
  and coalesce(grantee_role.rolname, 'PUBLIC') in ('anon', 'authenticated', 'service_role')
order by schema_name, owner_role, object_type, grantee, privilege_type;


-- =========================================================
-- E. SNAPSHOT - remaining default privileges owned by supabase_admin
-- =========================================================
-- Read-only.
-- Rows here are expected because batch 62 showed the SQL Editor postgres role is
-- likely not allowed to alter default privileges FOR ROLE supabase_admin.
-- Do not try to manually run supabase_admin cleanup from this file.

select
  n.nspname as schema_name,
  pg_get_userbyid(d.defaclrole) as owner_role,
  d.defaclobjtype as object_type,
  case d.defaclobjtype
    when 'r' then 'tables/views'
    when 'S' then 'sequences'
    when 'f' then 'functions'
    when 'T' then 'types'
    when 'n' then 'schemas'
    else d.defaclobjtype::text
  end as object_type_label,
  coalesce(grantee_role.rolname, 'PUBLIC') as grantee,
  acl.privilege_type,
  acl.is_grantable,
  d.defaclacl as raw_default_acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) as acl
left join pg_roles grantee_role on grantee_role.oid = acl.grantee
where n.nspname = 'public'
  and pg_get_userbyid(d.defaclrole) = 'supabase_admin'
  and coalesce(grantee_role.rolname, 'PUBLIC') in ('anon', 'authenticated', 'service_role')
order by schema_name, owner_role, object_type, grantee, privilege_type;


-- =========================================================
-- F. EMERGENCY ROLLBACK ONLY
-- =========================================================
-- Do not run this unless an unexpected issue is clearly traced to default privileges.
-- This rollback restores the broad postgres default privileges that section C removes.
-- Restoring broad defaults is not preferred; explicit GRANTs in future migrations are safer.
--
-- begin;
--
-- alter default privileges for role postgres in schema public
--   grant all privileges on tables to anon, authenticated, service_role;
--
-- alter default privileges for role postgres in schema public
--   grant all privileges on sequences to anon, authenticated, service_role;
--
-- alter default privileges for role postgres in schema public
--   grant execute on functions to anon, authenticated, service_role;
--
-- commit;
