-- 67_supabase_cleanup_revoke_authenticated_extra_writes_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 67
-- Purpose: remove a small set of unnecessary authenticated write privileges
-- after batch 66 confirmed the current grant/policy shape.
--
-- SAFETY:
-- - This file only REVOKEs table privileges from authenticated on selected non-core/support tables.
-- - It does NOT change data, RLS policies, functions/RPCs, storage buckets, or default privileges.
-- - It intentionally avoids progress/streak tables and functions.
-- - It does NOT touch qt_records, daily_checkins, profiles, groups, group_members,
--   prayer_items, get_group_invite(), group challenge claim RPCs, storage buckets,
--   or qt_reactions.
-- - service_role privileges are not changed.

-- =========================================================
-- A. PRECHECK - exact authenticated extra write privileges targeted by batch 67
-- Expected rows before execution:
-- - daily_prayer_completions: DELETE
-- - feedback: DELETE, UPDATE
-- - follows: UPDATE
-- - prayer_likes: UPDATE
-- - qt_schedule: DELETE, INSERT, UPDATE
-- - user_prayer_logs: UPDATE
-- If this section returns unexpected rows, stop and review before section C.
-- =========================================================
select
  table_name,
  array_agg(privilege_type::text order by privilege_type::text) as privileges_to_revoke
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'authenticated'
  and (
    (table_name = 'daily_prayer_completions' and privilege_type in ('DELETE')) or
    (table_name = 'feedback' and privilege_type in ('DELETE','UPDATE')) or
    (table_name = 'follows' and privilege_type in ('UPDATE')) or
    (table_name = 'prayer_likes' and privilege_type in ('UPDATE')) or
    (table_name = 'qt_schedule' and privilege_type in ('DELETE','INSERT','UPDATE')) or
    (table_name = 'user_prayer_logs' and privilege_type in ('UPDATE'))
  )
group by table_name
order by table_name;

-- =========================================================
-- B. POLICY SNAPSHOT FOR TARGET TABLES
-- Snapshot only. Rows are expected.
-- This confirms RLS policies are unchanged and helps with rollback/debug if needed.
-- =========================================================
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
    'qt_schedule',
    'user_prayer_logs'
  )
order by tablename, cmd, policyname;

-- =========================================================
-- C. EXECUTE - revoke only unnecessary authenticated write privileges
-- Execute this section once.
-- =========================================================
revoke delete on table public.daily_prayer_completions from authenticated;
revoke delete, update on table public.feedback from authenticated;
revoke update on table public.follows from authenticated;
revoke update on table public.prayer_likes from authenticated;
revoke delete, insert, update on table public.qt_schedule from authenticated;
revoke update on table public.user_prayer_logs from authenticated;

-- =========================================================
-- D. POSTCHECK - targeted extra privileges should be gone
-- Expected: 0 rows / Supabase may show only "Success".
-- =========================================================
select
  table_name,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_targeted_extra_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'authenticated'
  and (
    (table_name = 'daily_prayer_completions' and privilege_type in ('DELETE')) or
    (table_name = 'feedback' and privilege_type in ('DELETE','UPDATE')) or
    (table_name = 'follows' and privilege_type in ('UPDATE')) or
    (table_name = 'prayer_likes' and privilege_type in ('UPDATE')) or
    (table_name = 'qt_schedule' and privilege_type in ('DELETE','INSERT','UPDATE')) or
    (table_name = 'user_prayer_logs' and privilege_type in ('UPDATE'))
  )
group by table_name
order by table_name;

-- =========================================================
-- E. EXPECTED REMAINING AUTHENTICATED PRIVILEGES FOR TARGET TABLES
-- Rows are expected.
-- Expected shape after section C:
-- - daily_prayer_completions: INSERT, SELECT, UPDATE
-- - feedback: INSERT, SELECT
-- - follows: DELETE, INSERT, SELECT
-- - prayer_likes: DELETE, INSERT, SELECT
-- - qt_schedule: SELECT
-- - user_prayer_logs: DELETE, INSERT, SELECT
-- =========================================================
select
  table_name,
  array_agg(privilege_type::text order by privilege_type::text) as remaining_privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in (
    'daily_prayer_completions',
    'feedback',
    'follows',
    'prayer_likes',
    'qt_schedule',
    'user_prayer_logs'
  )
group by table_name
order by table_name;

-- =========================================================
-- F. ROLLBACK SQL TEXT ONLY - DO NOT EXECUTE UNLESS NEEDED
-- This section returns text only. It does not grant anything.
-- =========================================================
select *
from (values
  ('daily_prayer_completions', 'grant delete on table public.daily_prayer_completions to authenticated;'),
  ('feedback', 'grant delete, update on table public.feedback to authenticated;'),
  ('follows', 'grant update on table public.follows to authenticated;'),
  ('prayer_likes', 'grant update on table public.prayer_likes to authenticated;'),
  ('qt_schedule', 'grant delete, insert, update on table public.qt_schedule to authenticated;'),
  ('user_prayer_logs', 'grant update on table public.user_prayer_logs to authenticated;')
) as rollback(table_name, rollback_sql_if_needed_do_not_execute)
order by table_name;

-- =========================================================
-- G. REMAINING PUBLIC TABLE GRANTS SNAPSHOT - CATEGORIZED
-- Snapshot only. Rows are expected.
-- =========================================================
select
  tp.table_name,
  tp.grantee,
  array_agg(tp.privilege_type::text order by tp.privilege_type::text) as privileges,
  case
    when tp.table_name in ('qt_records','daily_checkins','profiles','groups','group_members','prayer_items') then 'DO_NOT_TOUCH_CORE_APP_FLOW'
    when tp.table_name in ('daily_prayer_completions','feedback','follows','prayer_likes','qt_reactions','qt_schedule','user_prayer_logs') then 'USER_ACTION_REVIEWED_58_61_66_67'
    when tp.table_name in ('content_reports','group_challenge_requests','group_challenges','group_challenge_participants','group_challenge_awards') then 'SUPPORT_CHALLENGE_REVIEWED_64_65'
    when tp.table_name in ('hidden_community_items','hidden_community_users','companion_preferences','companions') then 'ACTIVE_USER_ACTION_KEEP_DML_FOR_NOW'
    when tp.table_name in ('love_heart_events','love_heart_wallets','notification_preferences','notification_push_tokens') then 'NEWER_1_6_1_8_OBJECTS_REVIEWED_56'
    else 'OTHER_REVIEW_LATER'
  end as safety_category
from information_schema.table_privileges tp
where tp.table_schema = 'public'
  and tp.grantee in ('anon', 'authenticated')
group by tp.table_name, tp.grantee
order by safety_category, tp.table_name, tp.grantee;
