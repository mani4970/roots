-- 46_function_grants_cleanup_batch4_trigger_only_execute_1_6.sql
-- Roots 1.6 Supabase function/RPC grants cleanup batch 4 planning file.
--
-- STATUS: PRECHECK / EXECUTION CANDIDATE / DO NOT RUN WHOLE FILE BLINDLY.
-- This file is safe to run as-is only for the read-only SELECT sections.
-- All permission-changing statements are commented out on purpose.
--
-- Context from earlier 1.6 cleanup:
-- - 42 default privileges cleanup is deferred because SQL Editor lacked permission.
-- - 43 anon table cleanup precheck found no anon grants on the 9 reviewed tables.
-- - 44 removed only TRUNCATE/REFERENCES/TRIGGER from authenticated on the
--   9 reviewed newer/support tables; app regression checks reported no issues.
-- - 45 removed anon EXECUTE from six logged-in-only group RPCs; app regression
--   checks reported no issues.
--
-- Batch 4 scope:
-- - Function/RPC EXECUTE grants only.
-- - Review trigger-only functions that should not be directly callable through
--   PostgREST /rest/v1/rpc by logged-out or normal authenticated app users.
-- - Do NOT change function bodies, triggers, RLS policies, table grants, storage,
--   app code, progress/streak logic, Bible Reflection completion logic, group
--   challenge award logic, or community feed visibility.
--
-- Target trigger-only functions for review:
-- - public.handle_new_user()
-- - public.guard_companion_updates()
-- - public.touch_companions_updated_at()
--
-- Why this is low-risk but still needs care:
-- - These functions are intended to run from database triggers, not direct client RPC calls.
-- - Removing direct EXECUTE from PUBLIC/anon/authenticated should not remove the trigger itself.
-- - However, we still precheck trigger dependencies first and regression-test signup
--   and companion update flows after any execution.
--
-- Explicitly NOT touched in this batch:
-- - get_group_invite(uuid): keep anon access until logged-out invite flow is
--   verified another way.
-- - can_view_qt_record(text, uuid), can_view_prayer_item(text, uuid),
--   can_share_prayer_visibility(text), is_group_member(uuid, uuid): helper
--   functions used by RLS/feed visibility; do not tighten in this batch.
-- - increment_prayer_count(uuid), claim_group_challenge_award(uuid): do not touch.
-- - get_my_group_preferences(), leave_group(), mark_group_qt_seen(),
--   mark_group_qt_seen_v2(), set_group_favorite(), set_group_favorite_v2():
--   already handled in batch 45; do not change again here.
--
-- Safety:
-- - Run the read-only prechecks first and export/save the output.
-- - Do not execute the commented block until the precheck output is reviewed.
-- - If a target function is missing or has an unexpected signature, stop.

-- ---------------------------------------------------------------------------
-- A. PRECHECK: current routine grants for target trigger-only functions.
-- Read-only. Save/export this output before any execution.
-- Review focus:
-- - PUBLIC/anon/authenticated should not need direct EXECUTE on these functions.
-- - postgres/owner can remain.
-- - service_role may or may not have explicit EXECUTE; do not make assumptions
--   until reviewing raw ACL/effective privilege output.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'handle_new_user',
    'guard_companion_updates',
    'touch_companions_updated_at'
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
    'handle_new_user',
    'guard_companion_updates',
    'touch_companions_updated_at'
  )
order by p.proname, arguments;

-- ---------------------------------------------------------------------------
-- C. PRECHECK: effective EXECUTE privilege by app role.
-- Read-only. This shows effective access, including privileges inherited through PUBLIC.
-- Expected review focus before execution:
-- - anon/authenticated likely show true today and are candidates for removal.
-- - service_role can be reviewed separately; this batch primarily targets
--   PUBLIC/anon/authenticated direct app access.
-- ---------------------------------------------------------------------------
with target_functions as (
  select * from (values
    ('handle_new_user', 'public.handle_new_user()'),
    ('guard_companion_updates', 'public.guard_companion_updates()'),
    ('touch_companions_updated_at', 'public.touch_companions_updated_at()')
  ) as t(function_name, signature)
), function_oids as (
  select
    function_name,
    signature,
    to_regprocedure(signature) as function_oid
  from target_functions
), roles as (
  select * from (values
    ('anon'),
    ('authenticated'),
    ('service_role')
  ) as r(role_name)
)
select
  f.function_name,
  f.signature,
  f.function_oid is not null as function_exists,
  r.role_name,
  case
    when f.function_oid is null then null
    else has_function_privilege(r.role_name, f.function_oid, 'EXECUTE')
  end as can_execute
from function_oids f
cross join roles r
order by f.function_name, r.role_name;

-- ---------------------------------------------------------------------------
-- D. PRECHECK: trigger dependencies that use the target functions.
-- Read-only. This confirms these are trigger functions and shows the table/trigger.
-- Expected review focus:
-- - handle_new_user should be attached to an auth.users trigger in the live DB.
-- - guard_companion_updates and touch_companions_updated_at should be attached
--   to public.companions triggers.
-- ---------------------------------------------------------------------------
select
  table_ns.nspname as table_schema,
  table_cls.relname as table_name,
  trig.tgname as trigger_name,
  trig.tgenabled as trigger_enabled,
  func_ns.nspname as function_schema,
  proc.proname as function_name,
  pg_get_function_identity_arguments(proc.oid) as function_arguments
from pg_trigger trig
join pg_proc proc on proc.oid = trig.tgfoid
join pg_namespace func_ns on func_ns.oid = proc.pronamespace
join pg_class table_cls on table_cls.oid = trig.tgrelid
join pg_namespace table_ns on table_ns.oid = table_cls.relnamespace
where not trig.tgisinternal
  and func_ns.nspname = 'public'
  and proc.proname in (
    'handle_new_user',
    'guard_companion_updates',
    'touch_companions_updated_at'
  )
order by function_name, table_schema, table_name, trigger_name;

-- ---------------------------------------------------------------------------
-- E. EXECUTION BLOCK — COMMENTED OUT ON PURPOSE.
--
-- DO NOT RUN until explicitly approved after A/B/C/D are reviewed.
--
-- Candidate intent:
-- - Remove direct RPC EXECUTE access from PUBLIC/anon/authenticated for
--   trigger-only functions.
-- - Do not drop functions.
-- - Do not drop or alter triggers.
-- - Do not change service_role explicitly in this batch.
--
-- NOTE: The exact execution block may be adjusted after precheck results.
-- ---------------------------------------------------------------------------

-- begin;
--
-- revoke execute on function public.handle_new_user() from PUBLIC;
-- revoke execute on function public.handle_new_user() from anon;
-- revoke execute on function public.handle_new_user() from authenticated;
--
-- revoke execute on function public.guard_companion_updates() from PUBLIC;
-- revoke execute on function public.guard_companion_updates() from anon;
-- revoke execute on function public.guard_companion_updates() from authenticated;
--
-- revoke execute on function public.touch_companions_updated_at() from PUBLIC;
-- revoke execute on function public.touch_companions_updated_at() from anon;
-- revoke execute on function public.touch_companions_updated_at() from authenticated;
--
-- commit;

-- ---------------------------------------------------------------------------
-- F. POSTCHECK: routine grants for target trigger-only functions.
-- Read-only.
-- Expected after execution:
-- - No PUBLIC/anon/authenticated EXECUTE rows for the three target functions.
-- - postgres/owner remains.
-- - service_role may remain if it had explicit EXECUTE.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'handle_new_user',
    'guard_companion_updates',
    'touch_companions_updated_at'
  )
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- G. POSTCHECK: effective EXECUTE privilege by app role.
-- Read-only.
-- Expected after execution:
-- - anon can_execute = false for all three functions.
-- - authenticated can_execute = false for all three functions.
-- - service_role result is informational; do not widen it unless a real need appears.
-- ---------------------------------------------------------------------------
with target_functions as (
  select * from (values
    ('handle_new_user', 'public.handle_new_user()'),
    ('guard_companion_updates', 'public.guard_companion_updates()'),
    ('touch_companions_updated_at', 'public.touch_companions_updated_at()')
  ) as t(function_name, signature)
), function_oids as (
  select
    function_name,
    signature,
    to_regprocedure(signature) as function_oid
  from target_functions
), roles as (
  select * from (values
    ('anon'),
    ('authenticated'),
    ('service_role')
  ) as r(role_name)
)
select
  f.function_name,
  f.signature,
  f.function_oid is not null as function_exists,
  r.role_name,
  case
    when f.function_oid is null then null
    else has_function_privilege(r.role_name, f.function_oid, 'EXECUTE')
  end as can_execute
from function_oids f
cross join roles r
order by f.function_name, r.role_name;

-- ---------------------------------------------------------------------------
-- H. Focused regression checklist after execution.
-- ---------------------------------------------------------------------------
-- [ ] Existing login session still works.
-- [ ] New signup creates profile through handle_new_user trigger.
-- [ ] Faith partner request can be created.
-- [ ] Faith partner accept/decline works.
-- [ ] Faith partner remove/delete works.
-- [ ] Community partner tab still loads.
-- [ ] Share prompt partner list still loads.
-- [ ] Community all/group/partner feeds still load.
-- [ ] Bible Reflection progress/streak flow is unchanged.
-- [ ] Reward maps are unchanged.

-- ---------------------------------------------------------------------------
-- I. Emergency rollback notes — DO NOT RUN unless explicitly approved.
-- Prefer restoring only the exact missing function grant shown by PostgREST 42501.
-- Trigger firing itself should not need these app-role EXECUTE grants, so rollback
-- should normally not be necessary for trigger execution.
-- ---------------------------------------------------------------------------
-- Example targeted rollback shapes only:
-- grant execute on function public.handle_new_user() to authenticated;
-- grant execute on function public.guard_companion_updates() to authenticated;
-- grant execute on function public.touch_companions_updated_at() to authenticated;
-- grant execute on function public.handle_new_user() to anon;
