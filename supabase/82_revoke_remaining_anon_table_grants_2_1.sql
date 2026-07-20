-- 82_revoke_remaining_anon_table_grants_2_1.sql
-- Christian Roots 2.1 Supabase login-boundary stabilization
--
-- Confirmed product rule:
--   Roots profiles, shared Bible Reflections, prayer wishes, groups, memberships,
--   and check-in data are available only after authentication.
--
-- Scope of this migration:
--   - Revoke every direct table privilege from the `anon` role on the six
--     remaining core tables that were deliberately deferred in cleanup 1.9.
--   - Keep all `authenticated` and `service_role` privileges unchanged.
--   - Keep every RLS policy unchanged in this step.
--   - Keep group invite RPC behavior unchanged in this step.
--   - Do not touch Storage, functions, progress, badges, or app source code.
--
-- Safe execution:
--   The statements are idempotent. Running the file again leaves the same grant state.


-- =========================================================
-- A. PRECHECK - the remaining anon table grants
-- =========================================================
-- Expected before section C:
--   rows for only these six tables:
--   daily_checkins, group_members, groups, prayer_items, profiles, qt_records

select
  table_name,
  array_agg(privilege_type::text order by privilege_type::text) as anon_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
group by table_name
order by table_name;


-- =========================================================
-- B. SAFETY SNAPSHOT - authenticated access is not changed
-- =========================================================

select
  table_name,
  array_agg(privilege_type::text order by privilege_type::text) as authenticated_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in (
    'daily_checkins',
    'group_members',
    'groups',
    'prayer_items',
    'profiles',
    'qt_records'
  )
group by table_name
order by table_name;


-- =========================================================
-- C. EXECUTE - close the logged-out Data API boundary
-- =========================================================

begin;

revoke all privileges on table
  public.daily_checkins,
  public.group_members,
  public.groups,
  public.prayer_items,
  public.profiles,
  public.qt_records
from anon;

commit;


-- =========================================================
-- D. POSTCHECK - expected result: 0 rows
-- =========================================================
-- After section C, anon must have no direct table privileges anywhere in public.

select
  table_name,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_anon_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
group by table_name
order by table_name;


-- =========================================================
-- E. TARGETED POSTCHECK - every value must be false
-- =========================================================

select
  has_table_privilege('anon', 'public.daily_checkins', 'SELECT') as anon_can_select_daily_checkins,
  has_table_privilege('anon', 'public.group_members', 'SELECT') as anon_can_select_group_members,
  has_table_privilege('anon', 'public.groups', 'SELECT') as anon_can_select_groups,
  has_table_privilege('anon', 'public.prayer_items', 'SELECT') as anon_can_select_prayer_items,
  has_table_privilege('anon', 'public.profiles', 'SELECT') as anon_can_select_profiles,
  has_table_privilege('anon', 'public.qt_records', 'SELECT') as anon_can_select_qt_records;


-- =========================================================
-- F. EMERGENCY ROLLBACK ONLY - do not run during normal setup
-- =========================================================
-- This rollback recreates the overly broad legacy state and is intentionally
-- commented out. Share the exact regression before considering it.
--
-- begin;
-- grant select, insert, update, delete, truncate, references, trigger on table
--   public.daily_checkins,
--   public.group_members,
--   public.groups,
--   public.prayer_items,
--   public.profiles,
--   public.qt_records
-- to anon;
-- commit;
