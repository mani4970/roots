-- Roots Supabase public table GRANT cleanup plan
-- Created from the actual production public table privilege export.
--
-- IMPORTANT:
-- - This file is a REVIEW / PLANNING file for feature/roots-1.1.
-- - Do NOT run the cleanup section blindly in production.
-- - Current live iOS/Android/web apps are using the production Supabase project.
-- - Run only the audit SELECT statements first.
-- - Prepare an explicit rollback/test window before executing any REVOKE.
--
-- Why this exists:
-- Supabase Data API access requires table-level GRANT plus RLS.
-- Current production grants are very broad: most public tables grant many privileges
-- to anon, authenticated, service_role, and postgres.
-- RLS is currently doing most of the protection. We should move toward least privilege,
-- but only during a planned 1.1 deployment/check window with regression testing.

-- ---------------------------------------------------------------------------
-- A. SAFE AUDIT QUERIES
-- ---------------------------------------------------------------------------

-- A1. Current public table grants by role.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
order by table_name, grantee, privilege_type;

-- A2. Tables where anon currently has broad write/admin-like privileges.
select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
group by table_name
having bool_or(privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'))
order by table_name;

-- A3. RLS status for public tables.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- A4. Public RLS policies.
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

-- ---------------------------------------------------------------------------
-- B. OBSERVED TABLES FROM THE PRODUCTION EXPORT
-- ---------------------------------------------------------------------------
--
-- Base tables/views observed:
-- - companions
-- - content_reports
-- - content_reports_moderation_queue
-- - daily_checkins
-- - daily_prayer_completions
-- - feedback
-- - follows
-- - group_members
-- - groups
-- - hidden_community_items
-- - hidden_community_users
-- - prayer_items
-- - prayer_likes
-- - profiles
-- - qt_reactions
-- - qt_records
-- - qt_schedule
-- - user_prayer_logs
--
-- Current observation:
-- - Most base tables grant broad privileges to anon/authenticated/service_role/postgres.
-- - RLS is enabled on base tables, but broad anon grants should still be reduced.
-- - Do not change this during Google Closed Test/live app stabilization without a rollback plan.

-- ---------------------------------------------------------------------------
-- C. TARGET GRANT MODEL, REVIEW ONLY
-- ---------------------------------------------------------------------------
--
-- Suggested long-term direction:
--
-- anon:
--   Usually no table grants.
--   Exception only if a logged-out landing/invite page truly needs direct Data API access.
--   Prefer making invite landing pages require login before querying private data.
--
-- authenticated:
--   Grant only the privileges needed by app users.
--   Let RLS decide row-level access.
--   Avoid TRUNCATE, TRIGGER, REFERENCES for app users.
--
-- service_role:
--   Keep broad operational access.
--   For Data API readiness, explicit SELECT/INSERT/UPDATE/DELETE is enough for most use.
--
-- postgres:
--   Owned/admin role. Usually do not touch in app migration cleanup.

-- ---------------------------------------------------------------------------
-- D. CANDIDATE CLEANUP SQL — DO NOT RUN BLINDLY
-- ---------------------------------------------------------------------------
--
-- The following block is intentionally commented out.
-- Review table-by-table, test in a safe window, and run only after 1.1 readiness.
--
-- Recommended execution approach:
-- 1) Run A audit queries and export results.
-- 2) Confirm all needed RLS policies exist.
-- 3) Apply grants in a transaction.
-- 4) Immediately regression test:
--    - login/signup/password reset
--    - Bible Reflection save/complete/progress/watering
--    - prayer create/share/answered/pray together
--    - community/group feed
--    - group invite/join/favorite/seen/leave
--    - reports/hide content/hide users
--    - profile photo
--    - faith partner invite/accept/remove
-- 5) Roll back quickly if any permission error appears.
--
-- BEGIN;
--
-- -- Remove broad anon access from user/app tables.
-- revoke all privileges on table
--   public.companions,
--   public.content_reports,
--   public.daily_checkins,
--   public.daily_prayer_completions,
--   public.feedback,
--   public.follows,
--   public.group_members,
--   public.groups,
--   public.hidden_community_items,
--   public.hidden_community_users,
--   public.prayer_items,
--   public.prayer_likes,
--   public.profiles,
--   public.qt_reactions,
--   public.qt_records,
--   public.qt_schedule,
--   public.user_prayer_logs
-- from anon;
--
-- -- Remove admin-like privileges from authenticated users first.
-- revoke truncate, references, trigger on table
--   public.companions,
--   public.content_reports,
--   public.daily_checkins,
--   public.daily_prayer_completions,
--   public.feedback,
--   public.follows,
--   public.group_members,
--   public.groups,
--   public.hidden_community_items,
--   public.hidden_community_users,
--   public.prayer_items,
--   public.prayer_likes,
--   public.profiles,
--   public.qt_reactions,
--   public.qt_records,
--   public.qt_schedule,
--   public.user_prayer_logs
-- from authenticated;
--
-- -- Explicit authenticated grants by feature area.
-- -- Profiles: users read/update through RLS; insert may be trigger-driven, but keep insert
-- -- only if current app/signup flow needs it.
-- grant select, insert, update on public.profiles to authenticated;
--
-- -- Bible Reflection/QT records: users create/read/update/delete their own rows and
-- -- view allowed shared/group rows via RLS.
-- grant select, insert, update, delete on public.qt_records to authenticated;
-- grant select, insert, update, delete on public.qt_reactions to authenticated;
--
-- -- Prayer flows.
-- grant select, insert, update, delete on public.prayer_items to authenticated;
-- grant select, insert, update, delete on public.prayer_likes to authenticated;
-- grant select, insert, delete on public.user_prayer_logs to authenticated;
-- grant select, insert, update, delete on public.daily_prayer_completions to authenticated;
--
-- -- Groups.
-- grant select, insert, update, delete on public.groups to authenticated;
-- grant select, insert, update, delete on public.group_members to authenticated;
--
-- -- Faith partners.
-- grant select, insert, update, delete on public.companions to authenticated;
--
-- -- Reports/hide/user safety.
-- grant select, insert on public.content_reports to authenticated;
-- grant select, insert, update, delete on public.hidden_community_items to authenticated;
-- grant select, insert, update, delete on public.hidden_community_users to authenticated;
--
-- -- Feedback and follows / legacy.
-- grant select, insert on public.feedback to authenticated;
-- grant select, insert, update, delete on public.follows to authenticated;
--
-- -- Schedule/checkins. Verify actual app usage before reducing further.
-- grant select, insert, update, delete on public.daily_checkins to authenticated;
-- grant select, insert, update, delete on public.qt_schedule to authenticated;
--
-- -- Service role explicit grants.
-- grant select, insert, update, delete on table
--   public.companions,
--   public.content_reports,
--   public.daily_checkins,
--   public.daily_prayer_completions,
--   public.feedback,
--   public.follows,
--   public.group_members,
--   public.groups,
--   public.hidden_community_items,
--   public.hidden_community_users,
--   public.prayer_items,
--   public.prayer_likes,
--   public.profiles,
--   public.qt_reactions,
--   public.qt_records,
--   public.qt_schedule,
--   public.user_prayer_logs
-- to service_role;
--
-- -- Moderation view should remain service_role only unless there is a deliberate admin UI.
-- revoke all privileges on table public.content_reports_moderation_queue from anon, authenticated;
-- grant select on public.content_reports_moderation_queue to service_role;
--
-- COMMIT;

-- ---------------------------------------------------------------------------
-- E. POST-CLEANUP VERIFICATION QUERIES
-- ---------------------------------------------------------------------------
--
-- E1. Confirm anon no longer has broad write/admin privileges.
select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
group by table_name
order by table_name;

-- E2. Confirm authenticated has no TRUNCATE/TRIGGER/REFERENCES.
select
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
order by table_name, privilege_type;

-- E3. Confirm service_role has explicit operational grants.
select
  table_name,
  array_agg(privilege_type order by privilege_type) as service_role_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'service_role'
group by table_name
order by table_name;
