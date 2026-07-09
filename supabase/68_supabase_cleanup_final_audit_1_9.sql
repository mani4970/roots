-- 68_supabase_cleanup_final_audit_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 68
-- Purpose: final read-only audit after cleanup batches 56-67.
--
-- STATUS: READ-ONLY FINAL AUDIT ONLY.
-- This file contains SELECT queries only. It does NOT change the database.
--
-- What this final audit checks:
--   - Batch 67 postcheck: targeted authenticated extra write privileges are gone.
--   - Reviewed tables now match the expected grant shape after batches 58-67.
--   - Public tables still have RLS enabled.
--   - Batch 63 postgres-owned future default privileges cleanup remains clean.
--   - supabase_admin-owned future default privileges are still visible but deferred.
--   - anon table grants remain only in explicitly guarded core areas, if any.
--   - storage bucket visibility guardrails remain intact.
--
-- SAFETY GUARDRAILS:
--   - Do NOT change progress/streak/completion functions from this audit.
--   - Do NOT touch qt_records, daily_checkins, profiles, groups, group_members,
--     prayer_items, get_group_invite(), group challenge claim RPCs, storage policies,
--     or RLS policies from this file.
--   - Do NOT execute any generated / copied SQL based on this audit without a new
--     dedicated execute batch and rollback.
--
-- Run each section separately in Supabase SQL Editor.

-- =========================================================
-- A. POSTCHECK FOR BATCH 67 - targeted authenticated extra writes
-- =========================================================
-- Expected after batch 67: 0 rows, or Supabase may display only "Success".

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
-- B. EXPECTED GRANT SHAPE FOR TABLES REVIEWED IN BATCHES 58-67
-- =========================================================
-- Expected: 0 rows.
-- Rows here mean one of the reviewed tables does not match the expected post-cleanup shape.
-- This section intentionally checks only reviewed non-core/support tables.

with expected(table_name, grantee, expected_privileges) as (
  values
    -- anon grants removed from the reviewed 7-table non-core set in batches 59-61
    ('daily_prayer_completions', 'anon', array[]::text[]),
    ('feedback', 'anon', array[]::text[]),
    ('follows', 'anon', array[]::text[]),
    ('prayer_likes', 'anon', array[]::text[]),
    ('qt_reactions', 'anon', array[]::text[]),
    ('qt_schedule', 'anon', array[]::text[]),
    ('user_prayer_logs', 'anon', array[]::text[]),

    -- authenticated post-cleanup shape for the same 7-table non-core set
    ('daily_prayer_completions', 'authenticated', array['INSERT','SELECT','UPDATE']::text[]),
    ('feedback', 'authenticated', array['INSERT','SELECT']::text[]),
    ('follows', 'authenticated', array['DELETE','INSERT','SELECT']::text[]),
    ('prayer_likes', 'authenticated', array['DELETE','INSERT','SELECT']::text[]),
    ('qt_reactions', 'authenticated', array['DELETE','INSERT','SELECT','UPDATE']::text[]),
    ('qt_schedule', 'authenticated', array['SELECT']::text[]),
    ('user_prayer_logs', 'authenticated', array['DELETE','INSERT','SELECT']::text[]),

    -- support/challenge shape after batches 64-65
    ('content_reports', 'anon', array[]::text[]),
    ('group_challenge_requests', 'anon', array[]::text[]),
    ('group_challenges', 'anon', array[]::text[]),
    ('group_challenge_participants', 'anon', array[]::text[]),
    ('group_challenge_awards', 'anon', array[]::text[]),
    ('content_reports', 'authenticated', array['INSERT','SELECT']::text[]),
    ('group_challenge_requests', 'authenticated', array['INSERT','SELECT']::text[]),
    ('group_challenges', 'authenticated', array['SELECT']::text[]),
    ('group_challenge_participants', 'authenticated', array['SELECT']::text[]),
    ('group_challenge_awards', 'authenticated', array['SELECT']::text[])
), actual as (
  select
    table_name,
    grantee,
    array_agg(privilege_type::text order by privilege_type::text) as actual_privileges
  from information_schema.table_privileges
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and table_name in (select distinct table_name from expected)
  group by table_name, grantee
), diff as (
  select
    e.table_name,
    e.grantee,
    e.expected_privileges,
    coalesce(a.actual_privileges, array[]::text[]) as actual_privileges,
    array(
      select x
      from unnest(coalesce(a.actual_privileges, array[]::text[])) as x
      except
      select y
      from unnest(e.expected_privileges) as y
      order by 1
    ) as extra_privileges,
    array(
      select y
      from unnest(e.expected_privileges) as y
      except
      select x
      from unnest(coalesce(a.actual_privileges, array[]::text[])) as x
      order by 1
    ) as missing_privileges
  from expected e
  left join actual a
    on a.table_name = e.table_name
   and a.grantee = e.grantee
)
select
  table_name,
  grantee,
  expected_privileges,
  actual_privileges,
  extra_privileges,
  missing_privileges
from diff
where extra_privileges <> array[]::text[]
   or missing_privileges <> array[]::text[]
order by table_name, grantee;


-- =========================================================
-- C. RLS STATUS FOR PUBLIC TABLES
-- =========================================================
-- Expected for app-owned public tables: 0 rows.
-- If rows appear, do not change anything from this file. Review separately.

select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tablename;


-- =========================================================
-- D. POSTCHECK FOR BATCH 63 - postgres-owned future defaults
-- =========================================================
-- Expected after batch 63: 0 rows / Success.
-- supabase_admin-owned default privileges are intentionally excluded here.

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
-- E. DEFERRED DEFAULT PRIVILEGES SNAPSHOT - supabase_admin
-- =========================================================
-- Rows may appear and are expected.
-- These were intentionally not changed because earlier attempts can hit permission denied.
-- Treat this as a documented deferred item, not a failure of batch 68.

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
  d.defaclacl as raw_default_acl,
  'DEFERRED_DO_NOT_EXECUTE_IN_1_9_WITHOUT_DEDICATED_PERMISSION_PLAN' as decision_note
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) as acl
left join pg_roles grantee_role on grantee_role.oid = acl.grantee
where n.nspname = 'public'
  and pg_get_userbyid(d.defaclrole) = 'supabase_admin'
  and coalesce(grantee_role.rolname, 'PUBLIC') in ('anon', 'authenticated', 'service_role')
order by schema_name, owner_role, object_type, grantee, privilege_type;


-- =========================================================
-- F. ANON TABLE GRANTS OUTSIDE EXPLICIT CORE GUARDRAILS
-- =========================================================
-- Expected after batches 59-61 and 64-65: 0 rows.
-- Existing anon grants on core guardrail tables are intentionally not changed in this cleanup pass.

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type::text order by privilege_type::text) as anon_privileges,
  case
    when table_name in ('qt_records','daily_checkins','profiles') then 'CORE_PROGRESS_OR_PROFILE_GUARDRAIL'
    when table_name in ('groups','group_members') then 'GROUP_DEEP_LINK_OR_MEMBERSHIP_GUARDRAIL'
    when table_name in ('prayer_items') then 'PRAYER_GUARDRAIL'
    else 'UNEXPECTED_ANON_TABLE_GRANT_REVIEW_SEPARATELY'
  end as audit_note
from information_schema.table_privileges
where table_schema = 'public'
  and grantee = 'anon'
  and table_name not in (
    'qt_records',
    'daily_checkins',
    'profiles',
    'groups',
    'group_members',
    'prayer_items'
  )
group by table_schema, table_name, grantee
order by table_name, grantee;


-- =========================================================
-- G. ANON-EXECUTABLE PUBLIC FUNCTIONS SNAPSHOT
-- =========================================================
-- Rows may appear.
-- Guardrailed functions are intentionally not changed in this cleanup pass.
-- If a row appears with audit_note = REVIEW_SEPARATELY, do not change it here;
-- create a future dedicated precheck batch.

with functions as (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.oid as function_oid,
    p.prosecdef as security_definer,
    pg_get_userbyid(p.proowner) as owner_role,
    p.proacl as raw_acl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
), anon_role as (
  select oid as role_oid
  from pg_roles
  where rolname = 'anon'
)
select
  f.schema_name,
  f.function_name,
  f.arguments,
  f.security_definer,
  f.owner_role,
  case
    when f.function_name = 'get_group_invite' then 'KEEP_FOR_LOGGED_OUT_GROUP_INVITE_DEEP_LINK'
    when f.function_name in ('claim_group_challenge_award') then 'KEEP_GROUP_CHALLENGE_GUARDRAIL'
    when f.function_name in ('can_view_qt_record', 'can_view_prayer_item', 'can_share_prayer_visibility', 'is_group_member') then 'KEEP_VISIBILITY_HELPER_GUARDRAIL'
    when f.function_name in ('increment_prayer_count') then 'KEEP_PRAYER_GUARDRAIL'
    else 'REVIEW_SEPARATELY_DO_NOT_CHANGE_IN_1_9_FINAL_AUDIT'
  end as audit_note,
  f.raw_acl
from functions f
cross join anon_role r
where has_function_privilege(r.role_oid, f.function_oid, 'EXECUTE')
order by audit_note, f.function_name, f.arguments;


-- =========================================================
-- H. STORAGE BUCKET VISIBILITY GUARDRAIL
-- =========================================================
-- Expected:
--   qt-photos public = false
--   avatars may be public = true according to current profile image design.

select
  id,
  name,
  public,
  case
    when id = 'qt-photos' and public = false then 'OK_PRIVATE_QT_PHOTOS'
    when id = 'qt-photos' and public = true then 'STOP_QT_PHOTOS_SHOULD_NOT_BE_PUBLIC'
    when id = 'avatars' and public = true then 'OK_PUBLIC_AVATARS_CURRENT_DESIGN'
    when id = 'avatars' and public = false then 'REVIEW_AVATARS_PUBLIC_SETTING_CHANGED'
    else 'REVIEW'
  end as audit_note
from storage.buckets
where id in ('qt-photos', 'avatars')
order by id;


-- =========================================================
-- I. REMAINING PUBLIC TABLE GRANTS SNAPSHOT - CATEGORIZED
-- =========================================================
-- Rows are expected.
-- This is a documentation snapshot for the final 1.9 cleanup checkpoint.

select
  tp.table_name,
  tp.grantee,
  array_agg(tp.privilege_type::text order by tp.privilege_type::text) as privileges,
  case
    when tp.table_name in ('qt_records','daily_checkins','profiles','groups','group_members','prayer_items') then 'DEFERRED_DO_NOT_TOUCH_CORE_APP_FLOW'
    when tp.table_name in ('daily_prayer_completions','feedback','follows','prayer_likes','qt_reactions','qt_schedule','user_prayer_logs') then 'REVIEWED_58_61_66_67'
    when tp.table_name in ('content_reports','group_challenge_requests','group_challenges','group_challenge_participants','group_challenge_awards') then 'REVIEWED_64_65'
    when tp.table_name in ('hidden_community_items','hidden_community_users','companion_preferences','companions') then 'ACTIVE_USER_ACTION_KEEP_DML_FOR_FUTURE_DEDICATED_REVIEW'
    when tp.table_name in ('love_heart_events','love_heart_wallets','notification_preferences','notification_push_tokens') then 'REVIEWED_56_NEWER_OBJECTS'
    else 'OTHER_REVIEW_LATER'
  end as safety_category
from information_schema.table_privileges tp
where tp.table_schema = 'public'
  and tp.grantee in ('anon', 'authenticated')
group by tp.table_name, tp.grantee
order by safety_category, tp.table_name, tp.grantee;


-- =========================================================
-- J. FINAL 1.9 CLEANUP DECISION NOTES
-- =========================================================
-- This section returns static notes only.

select *
from (values
  ('DONE_IN_1_9', 'Batches 58-61 removed anon grants and admin-like authenticated grants from a small reviewed non-core set.'),
  ('DONE_IN_1_9', 'Batch 63 removed postgres-owned future default grants for public objects.'),
  ('DONE_IN_1_9', 'Batch 65 removed extra authenticated writes from support/challenge tables.'),
  ('DONE_IN_1_9', 'Batch 67 removed extra authenticated writes from user-action support tables.'),
  ('DEFERRED', 'supabase_admin default privileges remain deferred because they may require a dedicated permission plan.'),
  ('DEFERRED', 'Core app-flow tables remain intentionally untouched: qt_records, daily_checkins, profiles, groups, group_members, prayer_items.'),
  ('DEFERRED', 'Function EXECUTE grants, get_group_invite, visibility helpers, and group challenge RPCs require dedicated future review only if needed.'),
  ('NEXT_DISCIPLINE', 'Every future migration must include explicit GRANTs, RLS enablement, and policies; avoid relying on broad default privileges.')
) as notes(status, note)
order by status, note;
