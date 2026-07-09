-- 61_supabase_cleanup_revoke_anon_select_privileges_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 61
-- Purpose:
--   Remove anonymous SELECT privileges from the same small non-guardrail table set used in batches 58-60.
--
-- Why this is intentionally small:
--   Batch 58 removed authenticated TRUNCATE/REFERENCES/TRIGGER from a non-core table set.
--   Batch 59 removed anon TRUNCATE/REFERENCES/TRIGGER from the same table set.
--   Batch 60 removed anon INSERT/UPDATE/DELETE from the same table set.
--   This batch removes ONLY anon SELECT from that same small table set.
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
--   - any authenticated grants
--   - any service_role grants
--   - any RLS policies
--   - any functions/RPCs
--   - any storage buckets
--   - any default privileges
--
-- Important note about RLS policy roles:
--   Some policies on these tables may still show roles = {public}.
--   That does not by itself grant logged-out Data API access after anon table grants are revoked.
--   Table GRANTs are checked before RLS allows rows. We are intentionally cleaning GRANTs first
--   and not rewriting policies in this batch.
--
-- Run order in Supabase SQL Editor:
--   1) Run section A first. It verifies batch 60 stayed clean.
--   2) Run section B and confirm only the 7 target tables appear.
--   3) Run section C to confirm authenticated still has the expected app-level grants.
--   4) Run section D once.
--   5) Run section E and confirm it returns 0 rows.
--   6) Run section F and confirm anon has no remaining table privileges on these 7 tables.
--   7) Keep section G only for emergency rollback. Do not run G unless something breaks.


-- =========================================================
-- A. POSTCHECK FOR BATCH 60 - anon write privileges should be gone
-- =========================================================
-- Expected result after batch 60: 0 rows.
-- If rows appear here, stop and send the result before running section D.

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
-- B. PRECHECK - anon SELECT privileges on the small non-guardrail target set
-- =========================================================
-- Expected before section D: rows may appear for SELECT.
-- Confirm the tables are limited to the 7 target tables listed above.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as anon_select_privileges
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
-- C. SAFETY PRECHECK - authenticated grants should still support app usage
-- =========================================================
-- Review before section D.
-- This is read-only and should show authenticated grants for the same target tables.
-- It is okay if exact privileges differ by table because app usage differs by table.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as authenticated_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'authenticated'
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
-- D. EXECUTE - revoke only anonymous SELECT privileges
-- =========================================================
-- This removes logged-out SELECT access from the 7 target tables.
-- It does not remove authenticated or service_role access.

begin;

revoke select on table
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
-- F. FINAL SNAPSHOT FOR THIS TARGET SET - anon table grants should be fully gone
-- =========================================================
-- Expected after section D: 0 rows.
-- This confirms anon no longer has SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER
-- on the 7 non-guardrail target tables.

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
-- G. EMERGENCY ROLLBACK ONLY
-- =========================================================
-- Do not run this unless an unexpected regression is found and you intentionally want to restore
-- the exact anonymous SELECT privileges removed by section D.
-- Prefer sharing the exact app error first, because restoring logged-out SELECT should rarely be needed.
--
-- begin;
--
-- grant select on table
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
