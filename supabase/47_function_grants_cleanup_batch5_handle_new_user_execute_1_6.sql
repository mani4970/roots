-- 47_function_grants_cleanup_batch5_handle_new_user_execute_1_6.sql
-- Roots 1.6 Supabase function/RPC grants cleanup batch 5 planning file.
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
-- - 46 mini batch removed PUBLIC/anon/authenticated direct EXECUTE from
--   guard_companion_updates() and touch_companions_updated_at(); app regression
--   checks reported no issues.
--
-- Batch 5 scope:
-- - Review only public.handle_new_user().
-- - This function is attached to auth.users and is critical for signup/profile creation.
-- - Do NOT combine this with helper functions, invite functions, progress/streak,
--   community feed visibility, table grants, storage, group challenge awards,
--   or app code changes.
--
-- Why this is separated:
-- - handle_new_user() is trigger-only and should not be directly callable through
--   PostgREST /rest/v1/rpc by anon or normal authenticated app users.
-- - However, because it is tied to signup through auth.users, it gets its own
--   precheck and regression step.
-- - If the Supabase auth trigger relies on an internal role, keep/ensure explicit
--   EXECUTE for supabase_auth_admin before removing PUBLIC access.
--
-- Safety:
-- - Run A/B/C/D/E prechecks first and export/save the output.
-- - Do not run F until the precheck output is reviewed.
-- - If supabase_auth_admin is missing, trigger dependency is missing, or the
--   function is not SECURITY DEFINER owned by postgres, stop and review.

-- ---------------------------------------------------------------------------
-- A. PRECHECK: current routine grants for handle_new_user().
-- Read-only. Save/export this output before any execution.
-- Review focus:
-- - PUBLIC/anon/authenticated direct EXECUTE is the cleanup candidate.
-- - postgres/owner remains.
-- - service_role can remain.
-- - supabase_auth_admin should be reviewed before removing PUBLIC access.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = 'handle_new_user'
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- B. PRECHECK: exact signature, security mode, owner, raw ACL.
-- Read-only. This helps avoid touching the wrong overloaded function.
-- Expected review focus:
-- - signature should be public.handle_new_user()
-- - security_definer should normally be true for a signup trigger helper.
-- - owner is expected to be postgres in the current Roots DB.
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
  and p.proname = 'handle_new_user'
order by p.proname, arguments;

-- ---------------------------------------------------------------------------
-- C. PRECHECK: effective EXECUTE privilege by relevant roles.
-- Read-only. This includes inherited PUBLIC access.
-- Expected review focus before execution:
-- - anon/authenticated likely show true today because PUBLIC/direct grants exist.
-- - supabase_auth_admin should exist and should be kept/ensured before revoking PUBLIC.
-- - service_role can remain true.
-- ---------------------------------------------------------------------------
with target_function as (
  select to_regprocedure('public.handle_new_user()') as function_oid
), desired_roles as (
  select * from (values
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('supabase_auth_admin')
  ) as r(role_name)
), roles as (
  select
    d.role_name,
    pr.oid as role_oid
  from desired_roles d
  left join pg_roles pr on pr.rolname = d.role_name
)
select
  'handle_new_user' as function_name,
  'public.handle_new_user()' as signature,
  t.function_oid is not null as function_exists,
  r.role_name,
  r.role_oid is not null as role_exists,
  case
    when t.function_oid is null or r.role_oid is null then null
    else has_function_privilege(r.role_oid, t.function_oid, 'EXECUTE')
  end as can_execute
from target_function t
cross join roles r
order by r.role_name;

-- ---------------------------------------------------------------------------
-- D. PRECHECK: trigger dependency that uses handle_new_user().
-- Read-only. This confirms it is still connected to auth.users.
-- Expected review focus:
-- - table_schema should include auth.
-- - table_name should include users.
-- - trigger should be enabled.
-- ---------------------------------------------------------------------------
select
  table_ns.nspname as table_schema,
  table_cls.relname as table_name,
  pg_get_userbyid(table_cls.relowner) as table_owner,
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
  and proc.proname = 'handle_new_user'
order by function_name, table_schema, table_name, trigger_name;

-- ---------------------------------------------------------------------------
-- E. PRECHECK: schema USAGE privileges for roles related to direct execution.
-- Read-only. Function EXECUTE also needs schema USAGE for direct calls.
-- This is informational only; do not change schema grants in this batch.
-- ---------------------------------------------------------------------------
with desired_roles as (
  select * from (values
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('supabase_auth_admin')
  ) as r(role_name)
), roles as (
  select
    d.role_name,
    pr.oid as role_oid
  from desired_roles d
  left join pg_roles pr on pr.rolname = d.role_name
), target_schema as (
  select 'public'::regnamespace as schema_oid
)
select
  r.role_name,
  r.role_oid is not null as role_exists,
  case
    when r.role_oid is null then null
    else has_schema_privilege(r.role_oid, s.schema_oid, 'USAGE')
  end as has_public_schema_usage
from roles r
cross join target_schema s
order by r.role_name;

-- ---------------------------------------------------------------------------
-- F. EXECUTION BLOCK — COMMENTED OUT ON PURPOSE.
--
-- DO NOT RUN until explicitly approved after A/B/C/D/E are reviewed.
--
-- Candidate intent:
-- - Keep/ensure the Supabase auth internal role can execute handle_new_user().
-- - Remove direct RPC EXECUTE access from PUBLIC/anon/authenticated.
-- - Do not drop the function.
-- - Do not drop or alter the auth.users trigger.
-- - Do not change function body or security mode.
-- - Do not change profiles, auth.users, progress/streak, feeds, storage, or app code.
--
-- NOTE:
-- - If supabase_auth_admin is missing in precheck C/E, stop and do not run this.
-- - The exact execution block may be adjusted after precheck results.
-- ---------------------------------------------------------------------------

-- begin;
--
-- do $$
-- begin
--   if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
--     grant execute on function public.handle_new_user() to supabase_auth_admin;
--   else
--     raise exception 'supabase_auth_admin role not found; stop before revoking PUBLIC on handle_new_user()';
--   end if;
-- end $$;
--
-- revoke execute on function public.handle_new_user() from PUBLIC;
-- revoke execute on function public.handle_new_user() from anon;
-- revoke execute on function public.handle_new_user() from authenticated;
--
-- commit;

-- ---------------------------------------------------------------------------
-- G. POSTCHECK: routine grants for handle_new_user().
-- Read-only.
-- Expected after execution:
-- - No PUBLIC/anon/authenticated EXECUTE rows for handle_new_user().
-- - postgres/owner remains.
-- - service_role remains if it had explicit EXECUTE.
-- - supabase_auth_admin should remain if it exists and was granted.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = 'handle_new_user'
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- H. POSTCHECK: effective EXECUTE privilege by relevant roles.
-- Read-only.
-- Expected after execution:
-- - anon can_execute = false.
-- - authenticated can_execute = false.
-- - supabase_auth_admin can_execute = true if the role exists.
-- - service_role result is informational; do not widen unless a real need appears.
-- ---------------------------------------------------------------------------
with target_function as (
  select to_regprocedure('public.handle_new_user()') as function_oid
), desired_roles as (
  select * from (values
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('supabase_auth_admin')
  ) as r(role_name)
), roles as (
  select
    d.role_name,
    pr.oid as role_oid
  from desired_roles d
  left join pg_roles pr on pr.rolname = d.role_name
)
select
  'handle_new_user' as function_name,
  'public.handle_new_user()' as signature,
  t.function_oid is not null as function_exists,
  r.role_name,
  r.role_oid is not null as role_exists,
  case
    when t.function_oid is null or r.role_oid is null then null
    else has_function_privilege(r.role_oid, t.function_oid, 'EXECUTE')
  end as can_execute
from target_function t
cross join roles r
order by r.role_name;

-- ---------------------------------------------------------------------------
-- I. Focused regression checklist after execution.
-- ---------------------------------------------------------------------------
-- [ ] Existing login session still works.
-- [ ] New signup with a test email creates a profile through handle_new_user trigger.
-- [ ] New signup lands in the app normally.
-- [ ] Login/logout still works after signup test.
-- [ ] Profile screen loads for the new test user.
-- [ ] Existing user profile still loads.
-- [ ] Bible Reflection progress/streak flow is unchanged.
-- [ ] Community all/group/partner feeds still load.

-- ---------------------------------------------------------------------------
-- J. Emergency rollback notes — DO NOT RUN unless explicitly approved.
-- Prefer restoring only the exact missing function grant shown by PostgREST or signup logs.
-- ---------------------------------------------------------------------------
-- grant execute on function public.handle_new_user() to PUBLIC;
-- grant execute on function public.handle_new_user() to anon;
-- grant execute on function public.handle_new_user() to authenticated;
