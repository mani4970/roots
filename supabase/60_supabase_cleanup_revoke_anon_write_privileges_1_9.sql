-- 60_supabase_cleanup_revoke_anon_write_privileges_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 60
-- Purpose:
--   Remove anonymous write privileges from the same small non-guardrail table set used in batches 58 and 59.
--
-- Why this is intentionally small:
--   Batch 57 showed broad anon table grants on several public tables.
--   Batch 58 removed authenticated TRUNCATE/REFERENCES/TRIGGER from a non-core table set.
--   Batch 59 removed anon TRUNCATE/REFERENCES/TRIGGER from the same non-core table set.
--   This batch removes ONLY anon INSERT/UPDATE/DELETE from that same small table set.
--   It intentionally keeps anon SELECT for a later separate review.
--
-- Target tables:
--   - daily_prayer_completions
--   - feedback
--   - follows
--   - prayer_likes
--   - qt_reactions
--   - qt_schedule
--   - user_prayer_logs
--
-- NOT touched in this batch:
--   - daily_checkins
--   - profiles
--   - qt_records
--   - groups
--   - group_members
--   - prayer_items
--   - anon SELECT privileges
--   - any authenticated grants
--   - any service_role grants
--   - any RLS policies
--   - any functions/RPCs
--   - any storage buckets
--   - any default privileges
--
-- Run order in Supabase SQL Editor:
--   1) Run section A first. It verifies batch 59 stayed clean.
--   2) Run section B and confirm only the 7 target tables appear.
--   3) Run section C and confirm policies are authenticated-focused, not anon-focused.
--   4) Run section D once.
--   5) Run section E and confirm it returns 0 rows.
--   6) Section F is a read-only snapshot for the next batch. Rows there are expected.
--   7) Keep section G only for emergency rollback. Do not run G unless something breaks.


-- =========================================================
-- A. POSTCHECK FOR BATCH 59 - anon admin-like privileges should be gone
-- =========================================================
-- Expected result after batch 59: 0 rows.
-- If rows appear here, stop and send the result before running section D.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_anon_admin_like_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
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
-- B. PRECHECK - anon write privileges on the small non-guardrail target set
-- =========================================================
-- Expected before section D: rows may appear for INSERT/UPDATE/DELETE.
-- Confirm the tables are limited to the 7 target tables listed above.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as anon_write_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
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
-- C. SAFETY PRECHECK - policies on the target tables
-- =========================================================
-- Review before section D.
-- Expected: policies should be for authenticated users, not anon.
-- Supabase may display roles as {authenticated}.

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
  and tablename in (
    'daily_prayer_completions',
    'feedback',
    'follows',
    'prayer_likes',
    'qt_reactions',
    'qt_schedule',
    'user_prayer_logs'
  )
order by tablename, policyname;


-- =========================================================
-- D. EXECUTE - revoke only anonymous write privileges
-- =========================================================
-- This removes only INSERT/UPDATE/DELETE from anon.
-- It does not remove anon SELECT in this batch.

begin;

revoke insert, update, delete on table
  public.daily_prayer_completions,
  public.feedback,
  public.follows,
  public.prayer_likes,
  public.qt_reactions,
  public.qt_schedule,
  public.user_prayer_logs
from anon;

commit;


-- =========================================================
-- E. POSTCHECK - should return 0 rows after section D
-- =========================================================

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_anon_write_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
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
-- F. READ-ONLY SNAPSHOT FOR NEXT BATCH - remaining anon SELECT grants
-- =========================================================
-- Rows here are expected after section D, because batch 60 intentionally keeps anon SELECT.
-- Do not treat section F rows as a failure.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_anon_select_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
  and privilege_type = 'SELECT'
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
-- G. EMERGENCY ROLLBACK ONLY
-- =========================================================
-- Do not run this unless an unexpected regression is found and you intentionally want to restore
-- the exact anonymous write privileges removed by section D.
-- Prefer sharing the exact app error first, because restoring all anon writes should rarely be needed.
--
-- begin;
--
-- grant insert, update, delete on table
--   public.daily_prayer_completions,
--   public.feedback,
--   public.follows,
--   public.prayer_likes,
--   public.qt_reactions,
--   public.qt_schedule,
--   public.user_prayer_logs
-- to anon;
--
-- commit;
