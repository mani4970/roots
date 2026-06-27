-- 42_default_privileges_cleanup_execute_1_6.sql
-- Roots 1.6 Supabase default privileges cleanup execution candidate.
--
-- STATUS: EXECUTION CANDIDATE / DO NOT RUN WHOLE FILE BLINDLY.
--
-- Purpose:
-- - Remove broad automatic future grants from public-schema objects created by
--   postgres or supabase_admin.
-- - Align Roots with Supabase's 2026 Data API grant direction:
--   every future migration must explicitly GRANT only what it needs.
--
-- Safety:
-- - This affects only DEFAULT PRIVILEGES for FUTURE public objects.
-- - It does NOT alter existing tables, rows, RLS policies, functions, storage,
--   progress/streak, Bible Reflection completion, community feed visibility,
--   group challenge logic, reward maps, or app code.
-- - The actual cleanup block is commented out. Run SELECT prechecks first.
-- - If you later execute the cleanup block, select only that block, review it,
--   and run it once during a planned Supabase maintenance window.
--
-- Prerequisites before execution:
-- [ ] 38/40 audit results reviewed.
-- [ ] 39 execution checklist reviewed.
-- [ ] Latest production app is healthy.
-- [ ] Latest safe zip exists.
-- [ ] No active release/hotfix is in progress.
-- [ ] Future migration discipline is accepted: explicit GRANT + RLS + policies.

-- ---------------------------------------------------------------------------
-- A. PRECHECK: current public default privileges. Read-only.
-- Save/export this result before any execution.
-- ---------------------------------------------------------------------------
select
  defaclrole::regrole as owner_role,
  defaclnamespace::regnamespace as schema_name,
  defaclobjtype as object_type,
  case defaclobjtype
    when 'r' then 'tables/views'
    when 'S' then 'sequences'
    when 'f' then 'functions'
    when 'T' then 'types'
    when 'n' then 'schemas'
    else defaclobjtype::text
  end as object_type_label,
  defaclacl as acl
from pg_default_acl
where defaclnamespace = 'public'::regnamespace
order by defaclrole::regrole::text, defaclobjtype;

-- ---------------------------------------------------------------------------
-- B. EXECUTION BLOCK — COMMENTED OUT ON PURPOSE.
--
-- DO NOT RUN until explicitly approved.
-- When approved, copy only the block between begin/commit to a new SQL Editor
-- tab, remove the leading comment markers, and run it once.
--
-- If Supabase returns permission errors for supabase_admin default privileges,
-- stop immediately. Do not improvise. Report the exact error first.
-- ---------------------------------------------------------------------------

-- begin;
--
-- -- Future tables/views created by postgres in public.
-- alter default privileges for role postgres in schema public
--   revoke all privileges on tables from anon, authenticated, service_role;
--
-- -- Future sequences created by postgres in public.
-- alter default privileges for role postgres in schema public
--   revoke all privileges on sequences from anon, authenticated, service_role;
--
-- -- Future functions created by postgres in public.
-- alter default privileges for role postgres in schema public
--   revoke execute on functions from anon, authenticated, service_role;
--
-- -- Future tables/views created by supabase_admin in public.
-- alter default privileges for role supabase_admin in schema public
--   revoke all privileges on tables from anon, authenticated, service_role;
--
-- -- Future sequences created by supabase_admin in public.
-- alter default privileges for role supabase_admin in schema public
--   revoke all privileges on sequences from anon, authenticated, service_role;
--
-- -- Future functions created by supabase_admin in public.
-- alter default privileges for role supabase_admin in schema public
--   revoke execute on functions from anon, authenticated, service_role;
--
-- commit;

-- ---------------------------------------------------------------------------
-- C. POSTCHECK: broad future Data API defaults should disappear. Read-only.
-- Run after the cleanup block, if/when it is executed.
-- Expected result after successful cleanup: 0 rows or no rows containing
-- anon/authenticated/service_role in default ACLs for public objects.
-- ---------------------------------------------------------------------------
select
  defaclrole::regrole as owner_role,
  defaclnamespace::regnamespace as schema_name,
  defaclobjtype as object_type,
  defaclacl as remaining_acl
from pg_default_acl
where defaclnamespace = 'public'::regnamespace
  and defaclacl::text ~ '(anon|authenticated|service_role)'
order by defaclrole::regrole::text, defaclobjtype;

-- ---------------------------------------------------------------------------
-- D. Regression checklist after execution.
-- Default privilege cleanup should not affect existing objects, but still verify:
-- ---------------------------------------------------------------------------
-- [ ] Login works.
-- [ ] Home/profile load works.
-- [ ] Bible Reflection save/complete still works.
-- [ ] Progress/streak/reward map still works.
-- [ ] Community all/group/partner feeds still load.
-- [ ] Group challenge request/progress/badge still works.
-- [ ] New future migrations include explicit GRANTs.

-- ---------------------------------------------------------------------------
-- E. Rollback note — DO NOT RUN unless explicitly approved.
-- Restoring broad defaults is not recommended. Prefer adding explicit GRANTs to
-- a specific future migration if a new object cannot be reached through Data API.
-- ---------------------------------------------------------------------------
-- Example only, not recommended:
-- alter default privileges for role postgres in schema public
--   grant select, insert, update, delete on tables to authenticated;
