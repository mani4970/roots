-- 56_supabase_cleanup_batch_56_precheck_1_9.sql
-- Roots 1.9 Supabase cleanup batch 56 precheck.
--
-- STATUS: READ ONLY PRECHECK.
-- This file contains SELECT queries only. It is safe to run in Supabase SQL Editor.
-- It does NOT change grants, policies, functions, storage buckets, progress/streak data,
-- Bible Reflection records, prayers, groups, companions, badges, reward maps, or app code.
--
-- Purpose:
-- - Re-check the current production database before any Roots 1.9 Supabase cleanup execution.
-- - Focus on newer 1.6 / 1.8 objects that were added after earlier cleanup planning:
--   notifications, Love Hearts, group challenge summary RPC, and avatar profile columns.
-- - Confirm explicit Data API grants, RLS, policies, and RPC EXECUTE visibility.
-- - Identify the next smallest safe cleanup candidate without changing anything.
--
-- Safety guardrails:
-- - Do NOT use this file to revoke/grant anything.
-- - Do NOT touch progress/streak/completion objects from this batch.
-- - Keep get_group_invite(uuid) anon access until logged-out invite flow is reviewed separately.
-- - Keep claim_group_challenge_award(uuid) out of cleanup batches unless a dedicated precheck proves safety.
-- - Keep qt-photos storage private.
-- - If any query returns an unexpected result, stop and review before writing execute SQL.

-- ---------------------------------------------------------------------------
-- A. Expected newer Roots objects: existence check only.
-- Read-only. This confirms whether production has the expected 1.6 / 1.8 / 1.8-v2 objects.
-- ---------------------------------------------------------------------------
with expected_objects(kind, object_name, detail) as (
  values
    ('table', 'notification_preferences', 'public.notification_preferences'),
    ('table', 'notification_push_tokens', 'public.notification_push_tokens'),
    ('table', 'notifications', 'public.notifications'),
    ('table', 'love_heart_wallets', 'public.love_heart_wallets'),
    ('table', 'love_heart_events', 'public.love_heart_events'),
    ('column', 'profiles.avatar_type', 'public.profiles.avatar_type'),
    ('column', 'profiles.avatar_choice_seen', 'public.profiles.avatar_choice_seen'),
    ('function', 'get_group_challenge_request_summary', 'public.get_group_challenge_request_summary(uuid)'),
    ('function', 'award_love_heart_once', 'public.award_love_heart_once(text, uuid)')
), existence as (
  select
    eo.kind,
    eo.object_name,
    eo.detail,
    case
      when eo.kind = 'table' then to_regclass(eo.detail) is not null
      when eo.kind = 'function' then to_regprocedure(eo.detail) is not null
      when eo.kind = 'column' then exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = split_part(eo.object_name, '.', 1)
          and c.column_name = split_part(eo.object_name, '.', 2)
      )
      else false
    end as exists_in_db
  from expected_objects eo
)
select *
from existence
order by kind, object_name;

-- ---------------------------------------------------------------------------
-- B. Column details for notification tokens and avatar choice.
-- Read-only. This prevents relying on assumed columns such as disabled_at.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    table_name in ('notification_preferences', 'notification_push_tokens', 'notifications')
    or (table_name = 'profiles' and column_name in ('avatar_type', 'avatar_choice_seen'))
  )
order by table_name, ordinal_position;

-- ---------------------------------------------------------------------------
-- C. Profile avatar constraint check.
-- Read-only. Expected: profiles_avatar_type_check exists and limits avatar_type.
-- ---------------------------------------------------------------------------
select
  con.conname as constraint_name,
  rel.relname as table_name,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'profiles'
  and con.conname = 'profiles_avatar_type_check'
order by con.conname;

-- ---------------------------------------------------------------------------
-- D. Current table grants for newer Roots tables.
-- Read-only. Review anon/PUBLIC, authenticated, and service_role visibility.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
  and grantee in ('PUBLIC', 'public', 'anon', 'authenticated', 'service_role')
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- E. Missing expected table-level Data API grants for newer Roots tables.
-- Read-only.
-- Expected result: zero rows, except notifications/authenticated UPDATE is checked in section F
-- because it was granted as a column-level update on read_at.
-- ---------------------------------------------------------------------------
with expected(table_name, grantee, privilege_type) as (
  values
    ('notification_preferences', 'authenticated', 'SELECT'),
    ('notification_preferences', 'authenticated', 'INSERT'),
    ('notification_preferences', 'authenticated', 'UPDATE'),
    ('notification_preferences', 'service_role', 'SELECT'),
    ('notification_preferences', 'service_role', 'INSERT'),
    ('notification_preferences', 'service_role', 'UPDATE'),
    ('notification_preferences', 'service_role', 'DELETE'),

    ('notification_push_tokens', 'authenticated', 'SELECT'),
    ('notification_push_tokens', 'authenticated', 'INSERT'),
    ('notification_push_tokens', 'authenticated', 'UPDATE'),
    ('notification_push_tokens', 'authenticated', 'DELETE'),
    ('notification_push_tokens', 'service_role', 'SELECT'),
    ('notification_push_tokens', 'service_role', 'INSERT'),
    ('notification_push_tokens', 'service_role', 'UPDATE'),
    ('notification_push_tokens', 'service_role', 'DELETE'),

    ('notifications', 'authenticated', 'SELECT'),
    ('notifications', 'service_role', 'SELECT'),
    ('notifications', 'service_role', 'INSERT'),
    ('notifications', 'service_role', 'UPDATE'),
    ('notifications', 'service_role', 'DELETE'),

    ('love_heart_wallets', 'authenticated', 'SELECT'),
    ('love_heart_wallets', 'service_role', 'SELECT'),
    ('love_heart_wallets', 'service_role', 'INSERT'),
    ('love_heart_wallets', 'service_role', 'UPDATE'),
    ('love_heart_wallets', 'service_role', 'DELETE'),

    ('love_heart_events', 'authenticated', 'SELECT'),
    ('love_heart_events', 'service_role', 'SELECT'),
    ('love_heart_events', 'service_role', 'INSERT'),
    ('love_heart_events', 'service_role', 'UPDATE'),
    ('love_heart_events', 'service_role', 'DELETE')
), actual as (
  select table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
)
select
  e.table_name,
  e.grantee,
  e.privilege_type as missing_expected_privilege
from expected e
left join actual a
  on a.table_name = e.table_name
 and a.grantee = e.grantee
 and a.privilege_type = e.privilege_type
where a.table_name is null
order by e.table_name, e.grantee, e.privilege_type;

-- ---------------------------------------------------------------------------
-- F. notifications.read_at column-level UPDATE grant.
-- Read-only. Expected: authenticated has UPDATE on notifications.read_at.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  column_name,
  grantee,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'notifications'
  and column_name = 'read_at'
  and grantee in ('PUBLIC', 'public', 'anon', 'authenticated', 'service_role')
order by grantee, privilege_type;

with expected_column_privileges(table_name, column_name, grantee, privilege_type) as (
  values
    ('notifications', 'read_at', 'authenticated', 'UPDATE')
), actual as (
  select table_name, column_name, grantee, privilege_type
  from information_schema.column_privileges
  where table_schema = 'public'
)
select
  e.table_name,
  e.column_name,
  e.grantee,
  e.privilege_type as missing_expected_column_privilege
from expected_column_privileges e
left join actual a
  on a.table_name = e.table_name
 and a.column_name = e.column_name
 and a.grantee = e.grantee
 and a.privilege_type = e.privilege_type
where a.table_name is null
order by e.table_name, e.column_name, e.grantee, e.privilege_type;

-- ---------------------------------------------------------------------------
-- G. Unexpected logged-out or broad table grants on newer private tables.
-- Read-only. Expected: zero rows.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
  and grantee in ('PUBLIC', 'public', 'anon')
order by table_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- H. Unexpected authenticated admin-like table grants on newer private tables.
-- Read-only. Expected: zero rows.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
order by table_name, privilege_type;

-- ---------------------------------------------------------------------------
-- I. RLS status for newer Roots tables.
-- Read-only. Expected: rowsecurity = true for every row.
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
order by tablename;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
order by c.relname;

-- ---------------------------------------------------------------------------
-- J. RLS policies for newer Roots tables.
-- Read-only. Review policy roles and predicates before any future grant cleanup.
-- ---------------------------------------------------------------------------
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
  and tablename in (
    'notification_preferences',
    'notification_push_tokens',
    'notifications',
    'love_heart_wallets',
    'love_heart_events'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- K. Current grants for newer app RPCs.
-- Read-only. Expected:
-- - No PUBLIC/anon EXECUTE for these two RPCs.
-- - authenticated and service_role can execute.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'get_group_challenge_request_summary',
    'award_love_heart_once'
  )
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- L. Exact function signatures, security mode, owner, and raw ACL for newer app RPCs.
-- Read-only. This prevents touching an overloaded/wrong function later.
-- ---------------------------------------------------------------------------
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as owner,
  p.proacl as raw_acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_group_challenge_request_summary',
    'award_love_heart_once'
  )
order by p.proname, arguments;

-- ---------------------------------------------------------------------------
-- M. Effective EXECUTE privilege for newer app RPCs.
-- Read-only. This includes inherited PUBLIC privileges.
-- Expected:
-- - anon can_execute = false.
-- - authenticated can_execute = true.
-- - service_role can_execute = true.
-- ---------------------------------------------------------------------------
with target_functions(function_name, signature) as (
  values
    ('get_group_challenge_request_summary', 'public.get_group_challenge_request_summary(uuid)'),
    ('award_love_heart_once', 'public.award_love_heart_once(text, uuid)')
), resolved_functions as (
  select
    function_name,
    signature,
    to_regprocedure(signature) as function_oid
  from target_functions
), desired_roles(role_name) as (
  values
    ('anon'),
    ('authenticated'),
    ('service_role')
), roles as (
  select
    d.role_name,
    pr.oid as role_oid
  from desired_roles d
  left join pg_roles pr on pr.rolname = d.role_name
)
select
  f.function_name,
  f.signature,
  f.function_oid is not null as function_exists,
  r.role_name,
  r.role_oid is not null as role_exists,
  case
    when f.function_oid is null or r.role_oid is null then null
    else has_function_privilege(r.role_oid, f.function_oid, 'EXECUTE')
  end as can_execute
from resolved_functions f
cross join roles r
order by f.function_name, r.role_name;

-- ---------------------------------------------------------------------------
-- N. Guardrail snapshot for sensitive functions that are NOT targets of batch 56.
-- Read-only. Review only; do not tighten these from this batch.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'get_group_invite',
    'claim_group_challenge_award',
    'increment_prayer_count',
    'can_view_qt_record',
    'can_view_prayer_item',
    'can_share_prayer_visibility',
    'is_group_member'
  )
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- O. Guardrail snapshot for sensitive tables that are NOT targets of batch 56.
-- Read-only. This helps avoid accidentally selecting progress/streak/feed tables next.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles',
    'qt_records',
    'daily_checkins',
    'qt_record_recipients',
    'prayer_items',
    'prayer_item_recipients',
    'groups',
    'group_members',
    'group_challenges',
    'group_challenge_participants',
    'group_challenge_awards'
  )
  and grantee in ('PUBLIC', 'public', 'anon', 'authenticated', 'service_role')
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- P. Broad remaining table-grant cleanup candidates across all public tables.
-- Read-only. This is only for deciding future tiny batches.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('PUBLIC', 'public', 'anon')
group by table_schema, table_name, grantee
order by table_name, grantee;

select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as authenticated_admin_like_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- Q. Default privileges snapshot.
-- Read-only. Batch 42 was deferred because default privilege changes required higher permissions.
-- This output helps decide whether that topic still needs owner/admin action later.
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
-- R. Storage bucket visibility guardrail.
-- Read-only. Expected: qt-photos remains private. avatars may be public depending on current design.
-- ---------------------------------------------------------------------------
select
  id,
  name,
  public
from storage.buckets
where id in ('qt-photos', 'avatars')
order by id;

-- ---------------------------------------------------------------------------
-- S. Decision notes after running this precheck.
-- ---------------------------------------------------------------------------
-- 1. Save/export the full output.
-- 2. If sections E/F/G/H/I/J/K/M show unexpected rows, review before any execution SQL.
-- 3. If newer objects look correct, the next execute batch should still be tiny:
--    for example, only removing a specific unexpected anon/PUBLIC grant from one or two
--    newer private objects, with rollback and postcheck in a separate SQL file.
-- 4. Do not change progress/streak, qt_records, daily_checkins, profiles policies,
--    get_group_invite, claim_group_challenge_award, or storage policies from batch 56.
