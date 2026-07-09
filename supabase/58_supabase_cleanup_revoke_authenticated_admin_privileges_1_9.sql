-- 58_supabase_cleanup_revoke_authenticated_admin_privileges_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 58
-- Purpose:
--   Remove admin-like table privileges from authenticated on a small set of non-guardrail public tables.
--
-- Why this is intentionally small:
--   Batch 57 found authenticated still has REFERENCES/TRIGGER/TRUNCATE on several public tables.
--   Normal app usage should not require authenticated clients to create triggers, truncate tables,
--   or create foreign-key references. This batch removes only those admin-like privileges from
--   tables that were not flagged as progress/profile/group/prayer-sharing guardrails.
--
-- NOT touched in this batch:
--   - daily_checkins
--   - profiles
--   - qt_records
--   - groups
--   - group_members
--   - prayer_items
--   - any RLS policies
--   - any functions/RPCs
--   - any anon grants
--   - any storage buckets
--   - any default privileges
--
-- Run order in Supabase SQL Editor:
--   1) Run section A first and confirm the listed rows match the expected target list.
--   2) Run section B once.
--   3) Run section C and confirm it returns 0 rows.
--   4) Keep section D only for emergency rollback. Do not run D unless something breaks.


-- =========================================================
-- A. PRECHECK - expected target grants before cleanup
-- =========================================================

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as authenticated_admin_like_privileges
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
-- B. EXECUTE - revoke only admin-like privileges from authenticated
-- =========================================================

begin;

revoke truncate, references, trigger on table
  public.daily_prayer_completions,
  public.feedback,
  public.follows,
  public.prayer_likes,
  public.qt_reactions,
  public.qt_schedule,
  public.user_prayer_logs
from authenticated;

commit;


-- =========================================================
-- C. POSTCHECK - should return 0 rows after section B
-- =========================================================

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
-- D. EMERGENCY ROLLBACK ONLY
-- =========================================================
-- Do not run this unless an unexpected regression is found and you intentionally want to restore
-- the exact admin-like privileges removed by section B.
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
-- to authenticated;
--
-- commit;
