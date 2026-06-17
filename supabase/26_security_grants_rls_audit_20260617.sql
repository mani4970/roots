-- 26_security_grants_rls_audit_20260617.sql
-- Roots 1.4 Supabase GRANT/RLS audit helper.
--
-- Purpose:
-- - READ ONLY audit queries for Supabase Data API grant/RLS readiness.
-- - Prepared after the 2026-06-17 production audit exports.
-- - Safe to run: this file contains SELECT statements only.
--
-- Observed from the 2026-06-17 audit exports:
-- - 20 public tables have RLS enabled.
-- - 18 public tables currently grant very broad privileges to anon:
--   DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE.
-- - qt_record_recipients and prayer_item_recipients do not currently show anon grants.
-- - content_reports_moderation_queue showed only postgres/service_role grants.
-- - storage.buckets:
--   avatars public=true;
--   qt-photos public=false, file_size_limit=5242880, allowed image/jpeg/png/webp.
-- - storage.objects policies exist for avatars and qt-photos.
--
-- IMPORTANT:
-- - Do not run broad REVOKE/GRANT cleanup without a regression test window.
-- - Grants and RLS are separate layers: grants decide whether a role can reach a table;
--   RLS decides which rows the role can access.

-- ---------------------------------------------------------------------------
-- A. Public table grants by table/role.
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
-- B. anon grants. These should be minimized.
-- ---------------------------------------------------------------------------
select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
group by table_name
order by table_name;

-- B2. anon write/admin-like privileges.
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
-- C. authenticated admin-like privileges.
-- App users should not need TRUNCATE / TRIGGER / REFERENCES.
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

-- E2. Policies assigned to public role.
-- These still apply to authenticated users when table grants allow access.
-- If anon table grants are kept, these can also apply to unauthenticated users.
select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and roles::text like '%public%'
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- F. Storage buckets and policies.
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
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- G. Routine/function execute grants.
-- Needed before opting out of default execute grants for future functions/RPCs.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
order by routine_name, grantee, privilege_type;

-- G2. App-relevant helper/RPC functions if present.
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
    'can_view_qt_record',
    'can_view_prayer_item',
    'can_share_prayer_visibility',
    'is_group_member',
    'handle_new_user',
    'increment_prayer_count',
    'touch_companions_updated_at',
    'guard_companion_updates'
  )
order by p.proname;
