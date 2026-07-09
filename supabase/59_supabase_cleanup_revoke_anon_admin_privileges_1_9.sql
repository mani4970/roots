-- 59_supabase_cleanup_revoke_anon_admin_privileges_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 59
-- Purpose:
--   Remove admin-like table privileges from anon on the same small non-guardrail table set used in batch 58.
--
-- Why this is intentionally small:
--   Batch 57 showed anon still has broad table privileges on several public tables.
--   Batch 58 removed only authenticated TRUNCATE/REFERENCES/TRIGGER from a non-core table set.
--   This batch does the matching anon cleanup for ONLY TRUNCATE/REFERENCES/TRIGGER.
--   It intentionally does NOT remove anon SELECT/INSERT/UPDATE/DELETE yet.
--
-- NOT touched in this batch:
--   - daily_checkins
--   - profiles
--   - qt_records
--   - groups
--   - group_members
--   - prayer_items
--   - any anon SELECT/INSERT/UPDATE/DELETE privileges
--   - any authenticated grants beyond the batch 58 postcheck
--   - any RLS policies
--   - any functions/RPCs
--   - any storage buckets
--   - any default privileges
--
-- Run order in Supabase SQL Editor:
--   1) Run section A first. It verifies batch 58 stayed clean.
--   2) Run section B and confirm the listed rows match the expected target list.
--   3) Run section C once.
--   4) Run section D and confirm it returns 0 rows.
--   5) Section E is a read-only snapshot for the next batch. Do not treat it as an error.
--   6) Keep section F only for emergency rollback. Do not run F unless something breaks.


-- =========================================================
-- A. POSTCHECK FOR BATCH 58 - authenticated admin-like privileges should be gone
-- =========================================================
-- Expected result after batch 58: 0 rows.
-- If rows appear here, stop and send the result before running section C.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_authenticated_admin_like_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'authenticated'
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
-- B. PRECHECK - anon admin-like privileges on the small non-guardrail target set
-- =========================================================
-- Expected before section C: rows may appear for REFERENCES/TRIGGER/TRUNCATE.
-- Target tables should be limited to:
--   daily_prayer_completions, feedback, follows, prayer_likes,
--   qt_reactions, qt_schedule, user_prayer_logs

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as anon_admin_like_privileges
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
-- C. EXECUTE - revoke only admin-like privileges from anon
-- =========================================================
-- This removes only TRUNCATE/REFERENCES/TRIGGER.
-- It does not remove anon SELECT/INSERT/UPDATE/DELETE in this batch.

begin;

revoke truncate, references, trigger on table
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
-- D. POSTCHECK - should return 0 rows after section C
-- =========================================================

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
-- E. READ-ONLY SNAPSHOT FOR NEXT BATCH - remaining anon DML/read grants
-- =========================================================
-- This is expected to still show rows after section C, because this batch does not
-- touch anon SELECT/INSERT/UPDATE/DELETE. We will review this separately in the next batch.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_anon_non_admin_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
  and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
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
-- F. EMERGENCY ROLLBACK ONLY
-- =========================================================
-- Do not run this unless an unexpected regression is found and you intentionally want to restore
-- the exact admin-like anon privileges removed by section C.
--
-- begin;
--
-- grant truncate, references, trigger on table
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
