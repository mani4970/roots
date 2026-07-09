-- 66_supabase_cleanup_authenticated_extra_writes_precheck_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 66
-- Purpose: read-only precheck after batches 58-65.
--
-- SAFETY:
-- - This file is SELECT-only.
-- - Do NOT execute generated SQL text from section E directly.
-- - This precheck intentionally avoids progress/streak tables and functions.
-- - It does not touch qt_records, daily_checkins, profiles, groups, group_members,
--   prayer_items, get_group_invite(), group challenge claim RPCs, storage buckets,
--   or RLS policies.

-- =========================================================
-- A. POSTCHECK FOR BATCH 65 - support/challenge extra writes
-- Expected: 0 rows / Supabase may show only "Success".
-- =========================================================
with expected(table_name, expected_privileges) as (
  values
    ('content_reports', array['INSERT','SELECT']::text[]),
    ('group_challenge_requests', array['INSERT','SELECT']::text[]),
    ('group_challenges', array['SELECT']::text[]),
    ('group_challenge_participants', array['SELECT']::text[]),
    ('group_challenge_awards', array['SELECT']::text[])
), actual as (
  select
    table_name,
    array_agg(privilege_type::text order by privilege_type::text) as actual_privileges
  from information_schema.table_privileges
  where table_schema = 'public'
    and grantee = 'authenticated'
    and table_name in (select table_name from expected)
  group by table_name
), diff as (
  select
    e.table_name,
    e.expected_privileges,
    coalesce(a.actual_privileges, array[]::text[]) as actual_privileges,
    array(
      select x
      from unnest(coalesce(a.actual_privileges, array[]::text[])) as x
      except
      select y
      from unnest(e.expected_privileges) as y
      order by 1
    ) as unexpected_privileges
  from expected e
  left join actual a using (table_name)
)
select *
from diff
where unexpected_privileges <> array[]::text[]
order by table_name;

-- =========================================================
-- B. CURRENT AUTHENTICATED GRANTS FOR USER-ACTION/SUPPORT TABLES
-- Snapshot only. Rows are expected.
-- =========================================================
select
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('authenticated', 'service_role')
  and table_name in (
    'daily_prayer_completions',
    'feedback',
    'follows',
    'prayer_likes',
    'qt_reactions',
    'qt_schedule',
    'user_prayer_logs',
    'hidden_community_items',
    'hidden_community_users',
    'companion_preferences',
    'companions',
    'content_reports',
    'group_challenge_requests',
    'group_challenges',
    'group_challenge_participants',
    'group_challenge_awards'
  )
group by table_name, grantee
order by table_name, grantee;

-- =========================================================
-- C. RLS POLICY COMMANDS FOR SAME TABLES
-- Snapshot only. Rows are expected.
-- This helps verify whether a table-level grant is actually backed by a policy.
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
    'qt_reactions',
    'qt_schedule',
    'user_prayer_logs',
    'hidden_community_items',
    'hidden_community_users',
    'companion_preferences',
    'companions',
    'content_reports',
    'group_challenge_requests',
    'group_challenges',
    'group_challenge_participants',
    'group_challenge_awards'
  )
order by tablename, cmd, policyname;

-- =========================================================
-- D. CODE-INFORMED AUTHENTICATED EXTRA PRIVILEGE PREVIEW
-- Snapshot only. Rows show potential cleanup candidates, not final decisions.
-- Expected privileges are conservative and keep current app flows safe.
-- =========================================================
with expected(table_name, expected_privileges, safety_note) as (
  values
    -- App upserts daily prayer completion, so SELECT/INSERT/UPDATE are kept. Client DELETE is not used in current code.
    ('daily_prayer_completions', array['INSERT','SELECT','UPDATE']::text[], 'keep upsert/read; review DELETE only'),

    -- App inserts feedback from profile. Reading own feedback is harmless if policy exists. Client UPDATE/DELETE is not used.
    ('feedback', array['INSERT','SELECT']::text[], 'keep insert/read own; review UPDATE/DELETE'),

    -- Legacy follows table is not used in current app code; keep old select/insert/delete shape, review UPDATE only.
    ('follows', array['DELETE','INSERT','SELECT']::text[], 'legacy; review UPDATE only'),

    -- Answered prayer likes are inserted/read. DELETE may support future unlike/policy; UPDATE is not used.
    ('prayer_likes', array['DELETE','INSERT','SELECT']::text[], 'keep like/unlike shape; review UPDATE only'),

    -- QT reactions currently use SELECT/INSERT/UPDATE/DELETE.
    ('qt_reactions', array['DELETE','INSERT','SELECT','UPDATE']::text[], 'keep all; current reaction upsert/update/delete uses these'),

    -- QT schedule is read-only for app users. Updates are done by SQL migrations, not client.
    ('qt_schedule', array['SELECT']::text[], 'read-only for app users; review INSERT/UPDATE/DELETE'),

    -- User prayer logs use SELECT/INSERT. DELETE policy exists; keep it for now. UPDATE is not used.
    ('user_prayer_logs', array['DELETE','INSERT','SELECT']::text[], 'keep select/insert/delete; review UPDATE only'),

    -- Hidden community tables use upsert/manage-own semantics, so keep all DML for now.
    ('hidden_community_items', array['DELETE','INSERT','SELECT','UPDATE']::text[], 'keep all; upsert/manage-own table'),
    ('hidden_community_users', array['DELETE','INSERT','SELECT','UPDATE']::text[], 'keep all; upsert/manage-own table'),

    -- Companion preferences and companions are active user-action tables. Keep all DML for now.
    ('companion_preferences', array['DELETE','INSERT','SELECT','UPDATE']::text[], 'keep all; favorite/read-state upsert/delete'),
    ('companions', array['DELETE','INSERT','SELECT','UPDATE']::text[], 'keep all; request/accept/cancel/remove flow'),

    -- Batch 65 expected shape.
    ('content_reports', array['INSERT','SELECT']::text[], 'batch 65 expected shape'),
    ('group_challenge_requests', array['INSERT','SELECT']::text[], 'batch 65 expected shape'),
    ('group_challenges', array['SELECT']::text[], 'batch 65 expected shape'),
    ('group_challenge_participants', array['SELECT']::text[], 'batch 65 expected shape'),
    ('group_challenge_awards', array['SELECT']::text[], 'batch 65 expected shape')
), actual as (
  select
    table_name,
    array_agg(privilege_type::text order by privilege_type::text) as actual_privileges
  from information_schema.table_privileges
  where table_schema = 'public'
    and grantee = 'authenticated'
    and table_name in (select table_name from expected)
  group by table_name
), diff as (
  select
    e.table_name,
    e.safety_note,
    e.expected_privileges,
    coalesce(a.actual_privileges, array[]::text[]) as actual_privileges,
    array(
      select x
      from unnest(coalesce(a.actual_privileges, array[]::text[])) as x
      except
      select y
      from unnest(e.expected_privileges) as y
      order by 1
    ) as possible_extra_privileges
  from expected e
  left join actual a using (table_name)
)
select *
from diff
where possible_extra_privileges <> array[]::text[]
order by table_name;

-- =========================================================
-- E. GENERATED CANDIDATE SQL TEXT ONLY - DO NOT EXECUTE
-- This generates candidate revoke/rollback text for review only.
-- Do not run these statements from this section.
-- =========================================================
with expected(table_name, expected_privileges) as (
  values
    ('daily_prayer_completions', array['INSERT','SELECT','UPDATE']::text[]),
    ('feedback', array['INSERT','SELECT']::text[]),
    ('follows', array['DELETE','INSERT','SELECT']::text[]),
    ('prayer_likes', array['DELETE','INSERT','SELECT']::text[]),
    ('qt_reactions', array['DELETE','INSERT','SELECT','UPDATE']::text[]),
    ('qt_schedule', array['SELECT']::text[]),
    ('user_prayer_logs', array['DELETE','INSERT','SELECT']::text[]),
    ('hidden_community_items', array['DELETE','INSERT','SELECT','UPDATE']::text[]),
    ('hidden_community_users', array['DELETE','INSERT','SELECT','UPDATE']::text[]),
    ('companion_preferences', array['DELETE','INSERT','SELECT','UPDATE']::text[]),
    ('companions', array['DELETE','INSERT','SELECT','UPDATE']::text[]),
    ('content_reports', array['INSERT','SELECT']::text[]),
    ('group_challenge_requests', array['INSERT','SELECT']::text[]),
    ('group_challenges', array['SELECT']::text[]),
    ('group_challenge_participants', array['SELECT']::text[]),
    ('group_challenge_awards', array['SELECT']::text[])
), actual as (
  select
    table_name,
    array_agg(privilege_type::text order by privilege_type::text) as actual_privileges
  from information_schema.table_privileges
  where table_schema = 'public'
    and grantee = 'authenticated'
    and table_name in (select table_name from expected)
  group by table_name
), diff as (
  select
    e.table_name,
    array(
      select x
      from unnest(coalesce(a.actual_privileges, array[]::text[])) as x
      except
      select y
      from unnest(e.expected_privileges) as y
      order by 1
    ) as possible_extra_privileges
  from expected e
  left join actual a using (table_name)
), expanded as (
  select
    table_name,
    possible_extra_privileges
  from diff
  where possible_extra_privileges <> array[]::text[]
)
select
  table_name,
  possible_extra_privileges,
  format(
    'revoke %s on table public.%I from authenticated;',
    (select string_agg(lower(p), ', ' order by p) from unnest(possible_extra_privileges) as p),
    table_name
  ) as candidate_revoke_sql_do_not_execute,
  format(
    'grant %s on table public.%I to authenticated;',
    (select string_agg(lower(p), ', ' order by p) from unnest(possible_extra_privileges) as p),
    table_name
  ) as rollback_sql_if_needed_do_not_execute
from expanded
order by table_name;

-- =========================================================
-- F. REMAINING PUBLIC TABLE GRANTS SNAPSHOT - CATEGORIZED
-- Snapshot only. Rows are expected.
-- =========================================================
select
  tp.table_name,
  tp.grantee,
  array_agg(tp.privilege_type::text order by tp.privilege_type::text) as privileges,
  case
    when tp.table_name in ('qt_records','daily_checkins','profiles','groups','group_members','prayer_items') then 'DO_NOT_TOUCH_CORE_APP_FLOW'
    when tp.table_name in ('daily_prayer_completions','feedback','follows','prayer_likes','qt_reactions','qt_schedule','user_prayer_logs') then 'USER_ACTION_REVIEWED_58_61_AND_66'
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
