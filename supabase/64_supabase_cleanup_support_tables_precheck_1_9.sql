-- 64_supabase_cleanup_support_tables_precheck_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 64
--
-- STATUS: READ-ONLY PRECHECK ONLY.
--
-- Purpose:
--   After batches 58-61 cleaned anon/authenticated excess grants on a very small
--   7-table non-core set, and batch 63 cleaned postgres-owned FUTURE default
--   privileges, this file re-checks the older support/challenge safety tables
--   that were reviewed during the 1.6 cleanup plan.
--
-- This file does NOT change the database.
-- It contains only SELECT queries.
--
-- Why this batch is intentionally precheck-only:
--   - The app is currently stable in production.
--   - These tables are less dangerous than progress/streak tables, but they still
--     touch real features such as companions, hiding/reporting, and group challenge.
--   - We need current production grants/policies before deciding whether any small
--     execute batch is still necessary.
--
-- Explicitly NOT touched here:
--   - progress/streak/checkin functions
--   - qt_records
--   - daily_checkins
--   - profiles
--   - groups / group_members / get_group_invite
--   - prayer_items / prayer_likes / prayer recipients
--   - group challenge claim RPC logic
--   - qt-photos storage bucket
--   - RLS policies
--   - existing grants
--   - supabase_admin default privileges
--
-- Run each section separately in Supabase SQL Editor.


-- =========================================================
-- A. POSTCHECK FOR BATCH 63 - postgres future defaults
-- =========================================================
-- Expected after batch 63: 0 rows, or Supabase may display only "success".
-- Rows owned by supabase_admin are intentionally not checked here.

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
  and pg_get_userbyid(d.defaclrole) = 'postgres'
  and coalesce(grantee_role.rolname, 'PUBLIC') in ('anon', 'authenticated', 'service_role')
order by schema_name, owner_role, object_type, grantee, privilege_type;


-- =========================================================
-- B. SUPPORT/CHALLENGE TARGET GRANT SNAPSHOT
-- =========================================================
-- Read-only.
-- These are the 1.6 support/challenge tables that are good candidates for
-- continued cleanup review, but not automatic execution.

with target_tables(table_name) as (
  values
    ('companion_preferences'),
    ('companions'),
    ('content_reports'),
    ('hidden_community_items'),
    ('hidden_community_users'),
    ('group_challenges'),
    ('group_challenge_requests'),
    ('group_challenge_participants'),
    ('group_challenge_awards')
)
select
  g.table_schema,
  g.table_name,
  g.grantee,
  array_agg(g.privilege_type order by g.privilege_type) as privileges
from information_schema.role_table_grants g
join target_tables t on t.table_name = g.table_name
where g.table_schema = 'public'
  and g.grantee in ('anon', 'authenticated', 'service_role')
group by g.table_schema, g.table_name, g.grantee
order by g.table_name, g.grantee;


-- =========================================================
-- C. SUPPORT/CHALLENGE TARGET ANON GRANTS
-- =========================================================
-- Expected ideal: 0 rows.
-- If rows appear, do not change anything yet. Send the result.

with target_tables(table_name) as (
  values
    ('companion_preferences'),
    ('companions'),
    ('content_reports'),
    ('hidden_community_items'),
    ('hidden_community_users'),
    ('group_challenges'),
    ('group_challenge_requests'),
    ('group_challenge_participants'),
    ('group_challenge_awards')
)
select
  g.table_schema,
  g.table_name,
  g.grantee,
  array_agg(g.privilege_type order by g.privilege_type) as anon_privileges
from information_schema.role_table_grants g
join target_tables t on t.table_name = g.table_name
where g.table_schema = 'public'
  and g.grantee = 'anon'
group by g.table_schema, g.table_name, g.grantee
order by g.table_name;


-- =========================================================
-- D. SUPPORT/CHALLENGE TARGET AUTHENTICATED ADMIN-LIKE GRANTS
-- =========================================================
-- Expected ideal: 0 rows.
-- Checks for TRUNCATE/REFERENCES/TRIGGER only.

with target_tables(table_name) as (
  values
    ('companion_preferences'),
    ('companions'),
    ('content_reports'),
    ('hidden_community_items'),
    ('hidden_community_users'),
    ('group_challenges'),
    ('group_challenge_requests'),
    ('group_challenge_participants'),
    ('group_challenge_awards')
)
select
  g.table_schema,
  g.table_name,
  g.grantee,
  array_agg(g.privilege_type order by g.privilege_type) as admin_like_privileges
from information_schema.role_table_grants g
join target_tables t on t.table_name = g.table_name
where g.table_schema = 'public'
  and g.grantee = 'authenticated'
  and g.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
group by g.table_schema, g.table_name, g.grantee
order by g.table_name;


-- =========================================================
-- E. AUTHENTICATED WRITE PRIVILEGE REVIEW FOR READ-ONLY/OPERATOR TABLES
-- =========================================================
-- Read-only.
-- This only highlights possible over-grants that might be reduced in a later
-- carefully scoped batch, not now.
--
-- Review expectation from the 1.6 plan:
--   content_reports: authenticated should normally need SELECT, INSERT only.
--   group_challenges: authenticated should normally need SELECT only.
--   group_challenge_requests: authenticated may need SELECT, INSERT.
--   group_challenge_participants: authenticated should normally need SELECT only.
--   group_challenge_awards: authenticated should normally need SELECT only.

with expected(table_name, expected_privileges) as (
  values
    ('content_reports', array['INSERT','SELECT']::text[]),
    ('group_challenges', array['SELECT']::text[]),
    ('group_challenge_requests', array['INSERT','SELECT']::text[]),
    ('group_challenge_participants', array['SELECT']::text[]),
    ('group_challenge_awards', array['SELECT']::text[])
), actual as (
  select
    g.table_name,
    array_agg(g.privilege_type order by g.privilege_type) as actual_privileges
  from information_schema.role_table_grants g
  join expected e on e.table_name = g.table_name
  where g.table_schema = 'public'
    and g.grantee = 'authenticated'
  group by g.table_name
)
select
  e.table_name,
  e.expected_privileges,
  coalesce(a.actual_privileges, array[]::text[]) as actual_privileges,
  array(
    select p
    from unnest(coalesce(a.actual_privileges, array[]::text[])) as p
    where not (p = any(e.expected_privileges))
    order by p
  ) as possible_extra_privileges
from expected e
left join actual a on a.table_name = e.table_name
order by e.table_name;


-- =========================================================
-- F. RLS STATUS FOR SUPPORT/CHALLENGE TARGETS
-- =========================================================
-- Expected: every row should show rowsecurity = true.

with target_tables(table_name) as (
  values
    ('companion_preferences'),
    ('companions'),
    ('content_reports'),
    ('hidden_community_items'),
    ('hidden_community_users'),
    ('group_challenges'),
    ('group_challenge_requests'),
    ('group_challenge_participants'),
    ('group_challenge_awards')
)
select
  p.schemaname,
  p.tablename,
  p.rowsecurity
from pg_tables p
join target_tables t on t.table_name = p.tablename
where p.schemaname = 'public'
order by p.tablename;


-- =========================================================
-- G. RLS POLICIES FOR SUPPORT/CHALLENGE TARGETS
-- =========================================================
-- Read-only.
-- Send this only if a later execute batch is considered.

with target_tables(table_name) as (
  values
    ('companion_preferences'),
    ('companions'),
    ('content_reports'),
    ('hidden_community_items'),
    ('hidden_community_users'),
    ('group_challenges'),
    ('group_challenge_requests'),
    ('group_challenge_participants'),
    ('group_challenge_awards')
)
select
  p.schemaname,
  p.tablename,
  p.policyname,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
from pg_policies p
join target_tables t on t.table_name = p.tablename
where p.schemaname = 'public'
order by p.tablename, p.policyname;


-- =========================================================
-- H. REMAINING PUBLIC TABLE GRANTS SNAPSHOT - CATEGORIZED
-- =========================================================
-- Read-only snapshot for planning only.
-- This helps decide whether to stop after current cleanup or plan another small batch.

select
  g.table_name,
  g.grantee,
  array_agg(g.privilege_type order by g.privilege_type) as privileges,
  case
    when g.table_name in ('qt_records', 'daily_checkins', 'profiles') then 'DO_NOT_TOUCH_progress_reflection_profile'
    when g.table_name in ('groups', 'group_members') then 'DO_NOT_TOUCH_group_invite_core'
    when g.table_name in ('prayer_items', 'prayer_likes', 'prayer_item_recipients') then 'DO_NOT_TOUCH_prayer_core_for_now'
    when g.table_name in ('qt_record_recipients') then 'DO_NOT_TOUCH_reflection_sharing_core_for_now'
    when g.table_name in ('notification_preferences', 'notification_push_tokens', 'notifications') then 'newer_notifications_review_only'
    when g.table_name in ('love_heart_wallets', 'love_heart_events') then 'newer_love_hearts_review_only'
    when g.table_name in ('companion_preferences', 'companions', 'content_reports', 'hidden_community_items', 'hidden_community_users', 'group_challenges', 'group_challenge_requests', 'group_challenge_participants', 'group_challenge_awards') then 'support_challenge_candidate_review'
    when g.table_name in ('daily_prayer_completions', 'feedback', 'follows', 'prayer_likes', 'qt_reactions', 'qt_schedule', 'user_prayer_logs') then 'batch_58_to_61_non_core_checked'
    else 'uncategorized_review_before_touching'
  end as safety_category
from information_schema.role_table_grants g
where g.table_schema = 'public'
  and g.grantee in ('anon', 'authenticated')
group by g.table_name, g.grantee
order by safety_category, g.table_name, g.grantee;
