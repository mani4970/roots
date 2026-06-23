-- 48_function_grants_cleanup_batch6_visibility_helper_audit_1_6.sql
-- Roots 1.6 Supabase function/RPC grants cleanup batch 6 audit file.
--
-- STATUS: READ-ONLY AUDIT / DO NOT CHANGE DATABASE PERMISSIONS FROM THIS FILE.
-- This file intentionally contains SELECT queries only.
--
-- Context from earlier 1.6 cleanup:
-- - 42 default privileges cleanup is deferred because SQL Editor lacked permission.
-- - 43 anon table cleanup precheck found no anon grants on the 9 reviewed tables.
-- - 44 removed only TRUNCATE/REFERENCES/TRIGGER from authenticated on 9 newer/support tables.
-- - 45 removed anon EXECUTE from six logged-in-only group RPCs.
-- - 46 removed PUBLIC/anon/authenticated direct EXECUTE from companion trigger functions.
-- - 47 removed PUBLIC/anon/authenticated direct EXECUTE from handle_new_user(), after explicitly
--   granting EXECUTE to supabase_auth_admin; signup regression checks passed.
--
-- Batch 6 scope:
-- - Audit remaining visibility/helper functions before any further permission tightening.
-- - Do NOT run REVOKE/GRANT changes here.
-- - Do NOT change RLS policies here.
-- - Do NOT touch progress/streak, qt_records data, daily_checkins, profiles, feeds,
--   get_group_invite(), claim_group_challenge_award(), storage, or app code.
--
-- Why this is audit-only:
-- - Some helper functions are referenced by RLS policies that may be scoped to PUBLIC.
-- - Removing anon/PUBLIC EXECUTE from a helper without first reviewing policy roles and
--   logged-out invite/public-group behavior can break visible feeds or invite previews.
-- - Any later cleanup should be its own tiny reviewed batch, after these outputs are reviewed.

-- ---------------------------------------------------------------------------
-- A. PRECHECK: current routine grants for visibility/helper functions.
-- Read-only. Save/export this output before deciding any next execution batch.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'can_share_prayer_visibility',
    'can_view_prayer_item',
    'can_view_qt_record',
    'is_group_member'
  )
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- B. PRECHECK: exact signatures, security mode, owner, raw ACL.
-- Read-only. This helps avoid touching the wrong overloaded function.
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
    'can_share_prayer_visibility',
    'can_view_prayer_item',
    'can_view_qt_record',
    'is_group_member'
  )
order by p.proname, arguments;

-- ---------------------------------------------------------------------------
-- C. PRECHECK: effective EXECUTE privilege by relevant app roles.
-- Read-only. This includes inherited PUBLIC access.
-- ---------------------------------------------------------------------------
with target_functions(function_name, signature) as (
  values
    ('can_share_prayer_visibility', 'public.can_share_prayer_visibility(text)'),
    ('can_view_prayer_item', 'public.can_view_prayer_item(text, uuid)'),
    ('can_view_qt_record', 'public.can_view_qt_record(text, uuid)'),
    ('is_group_member', 'public.is_group_member(uuid, uuid)')
), desired_roles(role_name) as (
  values
    ('anon'),
    ('authenticated'),
    ('service_role')
), resolved_functions as (
  select
    function_name,
    signature,
    to_regprocedure(signature) as function_oid
  from target_functions
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
-- D. PRECHECK: RLS policies that reference these helper functions.
-- Read-only. Review roles carefully before considering any function grant changes.
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
  and (
    coalesce(qual, '') ~ 'can_share_prayer_visibility|can_view_prayer_item|can_view_qt_record|is_group_member'
    or coalesce(with_check, '') ~ 'can_share_prayer_visibility|can_view_prayer_item|can_view_qt_record|is_group_member'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- E. PRECHECK: PUBLIC/anon policies on potentially related tables.
-- Read-only. This checks whether logged-out/public paths may still depend on helper execution.
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
    'groups',
    'group_members',
    'qt_records',
    'qt_reactions',
    'prayer_items',
    'user_prayer_logs',
    'prayer_likes'
  )
  and (
    roles::text like '%public%'
    or roles::text like '%anon%'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- F. PRECHECK: table grants for anon on related tables.
-- Read-only. If anon can SELECT these tables, helper grant changes are riskier.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'groups',
    'group_members',
    'qt_records',
    'qt_reactions',
    'prayer_items',
    'user_prayer_logs',
    'prayer_likes'
  )
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- G. DECISION NOTES — NO SQL TO EXECUTE HERE.
-- ---------------------------------------------------------------------------
-- Do not revoke anything from these helpers until A-F are reviewed.
--
-- Possible future direction, only if safe after review:
-- - If helpers are used only by authenticated policies, consider removing anon EXECUTE.
-- - If PUBLIC/anon policies depend on helpers, first decide whether those policies must stay
--   public for logged-out invite/public-group behavior. Do not change feed visibility casually.
-- - Keep get_group_invite(uuid) out of this batch; logged-out invite flow must stay working.
-- - Keep claim_group_challenge_award(uuid) out of this batch; award logic must stay untouched.
