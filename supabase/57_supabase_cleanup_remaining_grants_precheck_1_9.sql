-- 57_supabase_cleanup_remaining_grants_precheck_1_9.sql
-- Roots 1.9 Supabase cleanup batch 57 precheck.
--
-- STATUS: READ ONLY PRECHECK.
-- This file contains SELECT queries only. It is safe to run in Supabase SQL Editor.
-- It does NOT change grants, policies, functions, storage buckets, progress/streak data,
-- Bible Reflection records, prayers, groups, companions, badges, reward maps, or app code.
--
-- Purpose:
-- - Batch 56 confirmed the newer 1.6 / 1.8 objects look healthy.
-- - This batch looks for remaining broad cleanup candidates across the current public schema.
-- - Do not execute any cleanup from this file. Use the output only to choose a tiny future batch.
--
-- How to run:
-- Supabase SQL Editor may only show the final result if the whole file is executed.
-- Highlight and run one section at a time, then export/save the result.
--
-- Safety guardrails:
-- - Do NOT touch progress/streak/completion objects from this batch.
-- - Keep get_group_invite anon access until logged-out invite flow is reviewed separately.
-- - Keep claim_group_challenge_award out of cleanup batches unless a dedicated precheck proves safety.
-- - Keep qt-photos storage private.
-- - If any query returns an unexpected result, stop and review before writing execute SQL.

-- ---------------------------------------------------------------------------
-- A. Public-schema overview: RLS-disabled public tables.
-- Read-only.
-- Expected: ideally zero rows for app-owned user-data tables.
-- Review only; some framework/system helper tables may require separate judgment.
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  case
    when tablename in ('profiles', 'qt_records', 'daily_checkins') then 'DO_NOT_TOUCH_FROM_BATCH_57_PROGRESS_OR_PROFILE_GUARDRAIL'
    when tablename in ('qt_record_recipients', 'prayer_items', 'prayer_item_recipients') then 'DO_NOT_TOUCH_FROM_BATCH_57_SHARING_OR_PRAYER_GUARDRAIL'
    when tablename in ('groups', 'group_members', 'group_challenges', 'group_challenge_participants', 'group_challenge_awards') then 'DO_NOT_TOUCH_FROM_BATCH_57_GROUP_OR_CHALLENGE_GUARDRAIL'
    else null
  end as guardrail_note
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tablename;

-- ---------------------------------------------------------------------------
-- B. Logged-out or broad table grants across public tables.
-- Read-only.
-- This identifies anon/PUBLIC table grants that might need a future tiny review.
-- It does not mean every row is wrong. Some access can be intentional.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges,
  case
    when table_name in ('profiles', 'qt_records', 'daily_checkins') then 'DO_NOT_TOUCH_FROM_BATCH_57_PROGRESS_OR_PROFILE_GUARDRAIL'
    when table_name in ('qt_record_recipients', 'prayer_items', 'prayer_item_recipients') then 'DO_NOT_TOUCH_FROM_BATCH_57_SHARING_OR_PRAYER_GUARDRAIL'
    when table_name in ('groups', 'group_members', 'group_challenges', 'group_challenge_participants', 'group_challenge_awards') then 'DO_NOT_TOUCH_FROM_BATCH_57_GROUP_OR_CHALLENGE_GUARDRAIL'
    else null
  end as guardrail_note
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('PUBLIC', 'public', 'anon')
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- C. Authenticated admin-like table grants across public tables.
-- Read-only.
-- Prior cleanup removed several excessive TRUNCATE/REFERENCES/TRIGGER grants.
-- This checks if any remain.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as authenticated_admin_like_privileges,
  case
    when table_name in ('profiles', 'qt_records', 'daily_checkins') then 'DO_NOT_TOUCH_FROM_BATCH_57_PROGRESS_OR_PROFILE_GUARDRAIL'
    when table_name in ('qt_record_recipients', 'prayer_items', 'prayer_item_recipients') then 'DO_NOT_TOUCH_FROM_BATCH_57_SHARING_OR_PRAYER_GUARDRAIL'
    when table_name in ('groups', 'group_members', 'group_challenges', 'group_challenge_participants', 'group_challenge_awards') then 'DO_NOT_TOUCH_FROM_BATCH_57_GROUP_OR_CHALLENGE_GUARDRAIL'
    else null
  end as guardrail_note
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- D. Functions executable by anon through direct or inherited privileges.
-- Read-only.
-- This includes inherited PUBLIC privileges by using has_function_privilege.
-- get_group_invite is intentionally guarded as KEEP until invite deep links are reviewed.
-- ---------------------------------------------------------------------------
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
    when f.function_name = 'get_group_invite' then 'KEEP_FOR_LOGGED_OUT_GROUP_INVITE_DEEP_LINK_UNTIL_DEDICATED_REVIEW'
    when f.function_name in ('claim_group_challenge_award') then 'DO_NOT_TOUCH_FROM_BATCH_57_GROUP_CHALLENGE_GUARDRAIL'
    when f.function_name in ('can_view_qt_record', 'can_view_prayer_item', 'can_share_prayer_visibility', 'is_group_member') then 'DO_NOT_TOUCH_FROM_BATCH_57_VISIBILITY_HELPER_GUARDRAIL'
    when f.function_name in ('increment_prayer_count') then 'DO_NOT_TOUCH_FROM_BATCH_57_PRAYER_GUARDRAIL'
    else null
  end as guardrail_note,
  f.raw_acl
from functions f
cross join anon_role r
where has_function_privilege(r.role_oid, f.function_oid, 'EXECUTE')
order by f.function_name, f.arguments;

-- ---------------------------------------------------------------------------
-- E. Direct routine grants for anon/PUBLIC on public functions.
-- Read-only.
-- This complements section D. Section D is the source of truth for effective anon EXECUTE.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and grantee in ('PUBLIC', 'public', 'anon')
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- F. Schema privileges snapshot for Supabase API roles.
-- Read-only.
-- Broad public schema USAGE is normal for API access; CREATE should be reviewed carefully.
-- ---------------------------------------------------------------------------
with target_schemas as (
  select oid as schema_oid, nspname as schema_name
  from pg_namespace
  where nspname in ('public', 'storage')
), target_roles as (
  select oid as role_oid, rolname as role_name
  from pg_roles
  where rolname in ('anon', 'authenticated', 'service_role')
)
select
  s.schema_name,
  r.role_name,
  has_schema_privilege(r.role_oid, s.schema_oid, 'USAGE') as has_usage,
  has_schema_privilege(r.role_oid, s.schema_oid, 'CREATE') as has_create
from target_schemas s
cross join target_roles r
order by s.schema_name, r.role_name;

-- ---------------------------------------------------------------------------
-- G. Default privileges snapshot.
-- Read-only.
-- Batch 42 was deferred because default privilege changes required higher permissions.
-- This helps decide if owner/admin action is still needed later.
-- ---------------------------------------------------------------------------
select
  n.nspname as schema_name,
  pg_get_userbyid(d.defaclrole) as owner_role,
  d.defaclobjtype as object_type,
  d.defaclacl as default_acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'public'
   or n.nspname is null
order by schema_name nulls first, owner_role, object_type;

-- ---------------------------------------------------------------------------
-- H. Storage bucket visibility guardrail.
-- Read-only.
-- Expected: qt-photos remains private. avatars may be public depending on current design.
-- ---------------------------------------------------------------------------
select
  id,
  name,
  public
from storage.buckets
where id in ('qt-photos', 'avatars')
order by id;

-- ---------------------------------------------------------------------------
-- I. Decision notes after running this precheck.
-- ---------------------------------------------------------------------------
-- 1. Save/export each section result separately because SQL Editor may only show the last result.
-- 2. Do not execute any GRANT/REVOKE from this file.
-- 3. If B/C/D/E returns rows, review them as candidates only.
-- 4. The next execute batch, if any, must target one very small item with rollback and postcheck.
-- 5. Do not change progress/streak, qt_records, daily_checkins, profiles policies,
--    get_group_invite, claim_group_challenge_award, or storage policies from batch 57.
