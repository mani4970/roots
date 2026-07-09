-- 62_supabase_cleanup_default_privileges_permission_precheck_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 62
--
-- STATUS: READ ONLY PRECHECK.
-- This file contains SELECT queries only. It is safe to run in Supabase SQL Editor.
-- It does NOT change grants, policies, functions, storage buckets, progress/streak data,
-- Bible Reflection records, prayers, groups, companions, reward maps, or app code.
--
-- Purpose:
--   Batches 58-61 cleaned current anon/authenticated table grants only for one small
--   non-guardrail table set. Batch 62 does not change any current object.
--   It re-checks DEFAULT PRIVILEGES, because those broad defaults can expose FUTURE
--   public tables/functions/sequences unless future migrations include explicit GRANTs.
--
-- Why this is precheck-only:
--   A previous default privilege cleanup candidate was deferred because Supabase returned
--   a permission error. This batch only identifies the current SQL role, default ACL owner
--   roles, and whether an execution batch is likely possible.
--
-- Run order in Supabase SQL Editor:
--   1) Run each section separately, not the whole file.
--   2) Save/export sections B, C, D, E, F, and G if they return rows.
--   3) Do NOT copy/run any generated candidate SQL from section G yet.
--   4) Send the results first so the next batch can be chosen safely.


-- =========================================================
-- A. POSTCHECK FOR BATCHES 58-61 - anon grants on the small target set should be gone
-- =========================================================
-- Expected after batch 61: 0 rows, or Supabase may display only "success".
-- If rows appear here, stop and send the result before continuing.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_anon_table_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
  and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  and table_name in (
    'daily_prayer_completions',
    'feedback',
    'follows',
    'prayer_likes',
    'qt_reactions',
    'qt_schedule',
    'user_prayer_logs'
  )
group by table_schema, table_name, grantee
order by table_name;


-- =========================================================
-- B. CURRENT SQL EDITOR ROLE CONTEXT
-- =========================================================
-- Read-only.
-- This helps explain whether ALTER DEFAULT PRIVILEGES can be executed later.

select
  current_user as current_user,
  current_role as current_role,
  session_user as session_user,
  current_database() as database_name,
  current_schema() as current_schema;


-- =========================================================
-- C. CURRENT RAW DEFAULT PRIVILEGES IN PUBLIC
-- =========================================================
-- Read-only.
-- Object types:
--   r = tables/views
--   S = sequences
--   f = functions
-- Broad default ACLs here affect future objects only, not existing tables/functions.

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
  d.defaclacl as raw_default_acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'public'
order by schema_name, owner_role, object_type;


-- =========================================================
-- D. EXPANDED DEFAULT PRIVILEGES FOR SUPABASE API ROLES
-- =========================================================
-- Read-only.
-- This expands the raw ACL to show exactly which default privileges are granted to
-- anon/authenticated/service_role/PUBLIC for future public objects.

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
  and coalesce(grantee_role.rolname, 'PUBLIC') in ('anon', 'authenticated', 'service_role', 'PUBLIC')
order by schema_name, owner_role, object_type, grantee, privilege_type;


-- =========================================================
-- E. DEFAULT PRIVILEGE OWNER / PERMISSION FEASIBILITY CHECK
-- =========================================================
-- Read-only.
-- ALTER DEFAULT PRIVILEGES FOR ROLE <owner_role> usually requires that the SQL role
-- is the owner role or can act as that owner role. If this shows false for an owner,
-- a later execute batch may fail with permission denied and should not be improvised.

with default_owners as (
  select distinct
    d.defaclrole,
    pg_get_userbyid(d.defaclrole) as owner_role
  from pg_default_acl d
  left join pg_namespace n on n.oid = d.defaclnamespace
  where n.nspname = 'public'
)
select
  current_user as current_user,
  current_role as current_role,
  session_user as session_user,
  owner_role,
  (current_user = owner_role) as current_user_is_owner_role,
  pg_has_role(owner_role, 'MEMBER') as current_user_has_owner_role_membership,
  case
    when current_user = owner_role then 'LIKELY_CAN_ALTER_DEFAULT_PRIVILEGES_FOR_THIS_OWNER'
    when pg_has_role(owner_role, 'MEMBER') then 'MAYBE_CAN_ALTER_DEFAULT_PRIVILEGES_FOR_THIS_OWNER'
    else 'LIKELY_PERMISSION_DENIED_IF_EXECUTED_FOR_THIS_OWNER'
  end as execution_feasibility_note
from default_owners
order by owner_role;


-- =========================================================
-- F. EXISTING PUBLIC OBJECT OWNER SUMMARY
-- =========================================================
-- Read-only.
-- This does not decide cleanup by itself. It helps identify which owner roles commonly
-- create Roots public objects.

with table_like_objects as (
  select
    'table_like' as object_family,
    pg_get_userbyid(c.relowner) as owner_role,
    case c.relkind
      when 'r' then 'table'
      when 'p' then 'partitioned_table'
      when 'v' then 'view'
      when 'm' then 'materialized_view'
      when 'S' then 'sequence'
      else c.relkind::text
    end as object_type,
    count(*) as object_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'S')
  group by pg_get_userbyid(c.relowner), c.relkind
), function_objects as (
  select
    'function' as object_family,
    pg_get_userbyid(p.proowner) as owner_role,
    'function' as object_type,
    count(*) as object_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  group by pg_get_userbyid(p.proowner)
)
select * from table_like_objects
union all
select * from function_objects
order by owner_role, object_family, object_type;


-- =========================================================
-- G. GENERATED CANDIDATE SQL TEXT ONLY - DO NOT RUN FROM THIS SECTION
-- =========================================================
-- Read-only.
-- These are generated as text to support review only. They are NOT executed.
-- The next batch, if any, should be a separate file with precheck/execute/postcheck/rollback.
--
-- There are two possible scopes:
--   1) ANON_ONLY_MINIMAL: removes automatic logged-out defaults for future public objects.
--   2) FULL_EXPLICIT_GRANTS_DISCIPLINE: removes automatic anon/authenticated/service_role
--      defaults so every future migration must explicitly GRANT what it needs.
--
-- Do not run any of these lines yet.

with owners as (
  select distinct pg_get_userbyid(d.defaclrole) as owner_role
  from pg_default_acl d
  left join pg_namespace n on n.oid = d.defaclnamespace
  where n.nspname = 'public'
)
select
  owner_role,
  'ANON_ONLY_MINIMAL' as candidate_scope,
  command_order,
  candidate_sql
from owners
cross join lateral (
  values
    (1, format('alter default privileges for role %I in schema public revoke all privileges on tables from anon;', owner_role)),
    (2, format('alter default privileges for role %I in schema public revoke all privileges on sequences from anon;', owner_role)),
    (3, format('alter default privileges for role %I in schema public revoke execute on functions from anon;', owner_role))
) as commands(command_order, candidate_sql)
union all
select
  owner_role,
  'FULL_EXPLICIT_GRANTS_DISCIPLINE' as candidate_scope,
  command_order,
  candidate_sql
from owners
cross join lateral (
  values
    (11, format('alter default privileges for role %I in schema public revoke all privileges on tables from anon, authenticated, service_role;', owner_role)),
    (12, format('alter default privileges for role %I in schema public revoke all privileges on sequences from anon, authenticated, service_role;', owner_role)),
    (13, format('alter default privileges for role %I in schema public revoke execute on functions from anon, authenticated, service_role;', owner_role))
) as commands(command_order, candidate_sql)
order by owner_role, candidate_scope, command_order;


-- =========================================================
-- H. DECISION NOTES
-- =========================================================
-- 1. If section A returns rows, stop and fix/review batches 58-61 first.
-- 2. If section E says permission is unlikely for postgres or supabase_admin,
--    do not run default privilege execute SQL blindly.
-- 3. Default privilege cleanup affects FUTURE objects only. It should not change today's app behavior.
-- 4. After any future default privilege cleanup, every new migration must include explicit GRANTs.
-- 5. Do not change progress/streak tables, qt_records, daily_checkins, profiles, group invite RPC,
--    group challenge RPC, or storage policies from this default privilege review.
