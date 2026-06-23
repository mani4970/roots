-- 38_supabase_grants_rls_audit_1_6.sql
-- Roots 1.6 Supabase GRANT/RLS audit helper.
--
-- STATUS: READ ONLY.
-- This file contains SELECT queries only. It is safe to run in Supabase SQL Editor.
-- It does NOT change grants, policies, functions, storage buckets, progress/streak data,
-- Bible Reflection records, prayers, groups, companions, badges, or reward maps.
--
-- Purpose:
-- - Re-check production after Roots 1.5 before any permission cleanup.
-- - Confirm new 1.5 group challenge tables have explicit Data API grants.
-- - Identify risky broad grants without changing anything.
-- - Prepare for small reviewed cleanup batches in Roots 1.6.
--
-- Supabase Data API reminder:
-- - Tables in public need explicit GRANTs for supabase-js/PostgREST/GraphQL access.
-- - RLS still controls row visibility after a role can reach a table.
-- - Future migrations must include explicit grants plus RLS and policies.

-- ---------------------------------------------------------------------------
-- A. Public table grants by table/role.
-- Save this output before any cleanup.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- B. Anonymous table access focus.
-- anon write/admin-like privileges should normally be removed in a reviewed phase.
-- Do not remove anon SELECT yet until invite/public flows are checked.
-- ---------------------------------------------------------------------------
select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
group by table_name
order by table_name;

select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_write_or_admin_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES')
group by table_name
order by table_name;

-- ---------------------------------------------------------------------------
-- C. authenticated admin-like grants.
-- Normal app users should not need TRUNCATE / TRIGGER / REFERENCES.
-- ---------------------------------------------------------------------------
select
  table_name,
  array_agg(privilege_type order by privilege_type) as authenticated_admin_like_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
group by table_name
order by table_name;

-- ---------------------------------------------------------------------------
-- D. RLS status for public tables.
-- Every app table in public should have RLS enabled.
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- ---------------------------------------------------------------------------
-- E. Public RLS policies.
-- Inspect before changing any grants or function execute privileges.
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- E2. Policies that are especially sensitive for app behavior.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    tablename in (
      'profiles',
      'qt_records',
      'qt_record_recipients',
      'prayer_items',
      'prayer_item_recipients',
      'groups',
      'group_members',
      'companions',
      'group_challenge_requests',
      'group_challenges',
      'group_challenge_participants',
      'group_challenge_awards'
    )
    or coalesce(qual, '') ~ 'can_view|is_group_member|can_share|get_group_invite|claim_group_challenge'
    or coalesce(with_check, '') ~ 'can_view|is_group_member|can_share|get_group_invite|claim_group_challenge'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- F. Explicit grant sanity check for newer Roots tables.
-- Expected grants are intentionally conservative and exclude anon.
-- Missing rows here should be reviewed before October 30 enforcement.
-- ---------------------------------------------------------------------------
with expected(table_name, grantee, privilege_type) as (
  values
    -- 1.1 / moderation / hidden content support
    ('content_reports', 'authenticated', 'SELECT'),
    ('content_reports', 'authenticated', 'INSERT'),
    ('content_reports', 'service_role', 'SELECT'),
    ('content_reports', 'service_role', 'INSERT'),
    ('content_reports', 'service_role', 'UPDATE'),
    ('content_reports', 'service_role', 'DELETE'),
    ('hidden_community_items', 'authenticated', 'SELECT'),
    ('hidden_community_items', 'authenticated', 'INSERT'),
    ('hidden_community_items', 'authenticated', 'UPDATE'),
    ('hidden_community_items', 'authenticated', 'DELETE'),
    ('hidden_community_items', 'service_role', 'SELECT'),
    ('hidden_community_items', 'service_role', 'INSERT'),
    ('hidden_community_items', 'service_role', 'UPDATE'),
    ('hidden_community_items', 'service_role', 'DELETE'),
    ('hidden_community_users', 'authenticated', 'SELECT'),
    ('hidden_community_users', 'authenticated', 'INSERT'),
    ('hidden_community_users', 'authenticated', 'UPDATE'),
    ('hidden_community_users', 'authenticated', 'DELETE'),
    ('hidden_community_users', 'service_role', 'SELECT'),
    ('hidden_community_users', 'service_role', 'INSERT'),
    ('hidden_community_users', 'service_role', 'UPDATE'),
    ('hidden_community_users', 'service_role', 'DELETE'),

    -- 1.1 / 1.2 companion and partner sharing
    ('companions', 'authenticated', 'SELECT'),
    ('companions', 'authenticated', 'INSERT'),
    ('companions', 'authenticated', 'UPDATE'),
    ('companions', 'authenticated', 'DELETE'),
    ('companions', 'service_role', 'SELECT'),
    ('companions', 'service_role', 'INSERT'),
    ('companions', 'service_role', 'UPDATE'),
    ('companions', 'service_role', 'DELETE'),
    ('companion_preferences', 'authenticated', 'SELECT'),
    ('companion_preferences', 'authenticated', 'INSERT'),
    ('companion_preferences', 'authenticated', 'UPDATE'),
    ('companion_preferences', 'authenticated', 'DELETE'),
    ('companion_preferences', 'service_role', 'SELECT'),
    ('companion_preferences', 'service_role', 'INSERT'),
    ('companion_preferences', 'service_role', 'UPDATE'),
    ('companion_preferences', 'service_role', 'DELETE'),
    ('qt_record_recipients', 'authenticated', 'SELECT'),
    ('qt_record_recipients', 'authenticated', 'INSERT'),
    ('qt_record_recipients', 'authenticated', 'DELETE'),
    ('qt_record_recipients', 'service_role', 'SELECT'),
    ('qt_record_recipients', 'service_role', 'INSERT'),
    ('qt_record_recipients', 'service_role', 'UPDATE'),
    ('qt_record_recipients', 'service_role', 'DELETE'),
    ('prayer_item_recipients', 'authenticated', 'SELECT'),
    ('prayer_item_recipients', 'authenticated', 'INSERT'),
    ('prayer_item_recipients', 'authenticated', 'DELETE'),
    ('prayer_item_recipients', 'service_role', 'SELECT'),
    ('prayer_item_recipients', 'service_role', 'INSERT'),
    ('prayer_item_recipients', 'service_role', 'UPDATE'),
    ('prayer_item_recipients', 'service_role', 'DELETE'),

    -- 1.5 group challenge tables
    ('group_challenge_requests', 'authenticated', 'SELECT'),
    ('group_challenge_requests', 'authenticated', 'INSERT'),
    ('group_challenge_requests', 'service_role', 'SELECT'),
    ('group_challenge_requests', 'service_role', 'INSERT'),
    ('group_challenge_requests', 'service_role', 'UPDATE'),
    ('group_challenge_requests', 'service_role', 'DELETE'),
    ('group_challenges', 'authenticated', 'SELECT'),
    ('group_challenges', 'service_role', 'SELECT'),
    ('group_challenges', 'service_role', 'INSERT'),
    ('group_challenges', 'service_role', 'UPDATE'),
    ('group_challenges', 'service_role', 'DELETE'),
    ('group_challenge_participants', 'authenticated', 'SELECT'),
    ('group_challenge_participants', 'service_role', 'SELECT'),
    ('group_challenge_participants', 'service_role', 'INSERT'),
    ('group_challenge_participants', 'service_role', 'UPDATE'),
    ('group_challenge_participants', 'service_role', 'DELETE'),
    ('group_challenge_awards', 'authenticated', 'SELECT'),
    ('group_challenge_awards', 'service_role', 'SELECT'),
    ('group_challenge_awards', 'service_role', 'INSERT'),
    ('group_challenge_awards', 'service_role', 'UPDATE'),
    ('group_challenge_awards', 'service_role', 'DELETE')
), actual as (
  select table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
)
select
  e.table_name,
  e.grantee,
  e.privilege_type as missing_expected_privilege
from expected e
left join actual a
  on a.table_name = e.table_name
 and a.grantee = e.grantee
 and a.privilege_type = e.privilege_type
where a.table_name is null
order by e.table_name, e.grantee, e.privilege_type;

-- ---------------------------------------------------------------------------
-- G. Check unexpected anon access on newer private/support tables.
-- Any rows returned here should be reviewed carefully.
-- ---------------------------------------------------------------------------
select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'content_reports',
    'hidden_community_items',
    'hidden_community_users',
    'companions',
    'companion_preferences',
    'qt_record_recipients',
    'prayer_item_recipients',
    'group_challenge_requests',
    'group_challenges',
    'group_challenge_participants',
    'group_challenge_awards'
  )
group by table_name
order by table_name;

-- ---------------------------------------------------------------------------
-- H. Routine/function execute grants.
-- Do not change function grants before checking RLS policy dependencies.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
order by routine_name, grantee, privilege_type;

-- H2. App-relevant functions and security mode.
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as owner,
  n.nspname as schema
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_group_invite',
    'get_my_group_preferences',
    'can_view_qt_record',
    'can_view_prayer_item',
    'can_share_prayer_visibility',
    'is_group_member',
    'handle_new_user',
    'increment_prayer_count',
    'touch_companions_updated_at',
    'guard_companion_updates',
    'claim_group_challenge_award'
  )
order by p.proname, arguments;

-- ---------------------------------------------------------------------------
-- I. Storage buckets and policies.
-- Important: qt-photos must remain private. group-challenge-badges may stay public.
-- ---------------------------------------------------------------------------
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by id;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- J. Default privileges overview.
-- Review only. Do not change default privileges until every future migration has
-- explicit table/function grants.
-- ---------------------------------------------------------------------------
select
  defaclrole::regrole as role,
  defaclnamespace::regnamespace as schema,
  defaclobjtype as object_type,
  defaclacl as acl
from pg_default_acl
where defaclnamespace = 'public'::regnamespace
order by defaclrole::regrole::text, defaclobjtype;
