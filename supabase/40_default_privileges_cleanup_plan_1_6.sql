-- 40_default_privileges_cleanup_plan_1_6.sql
-- Roots 1.6 Supabase default privileges cleanup plan.
--
-- STATUS: REVIEW / PLAN ONLY.
-- This file is intentionally safe to run as-is because it contains active SELECT
-- audit queries only. All permission-changing statements are commented out.
--
-- Why this exists:
-- - Supabase announced that public-schema objects should not be exposed to the
--   Data API automatically. Roots uses supabase-js/PostgREST, so future tables,
--   functions, and sequences must receive explicit GRANTs in each migration.
-- - Audit section J from 38_supabase_grants_rls_audit_1_6.sql showed broad
--   default privileges for roles postgres and supabase_admin in schema public.
-- - This plan prepares a safe future-default cleanup without touching existing
--   tables, existing data, RLS policies, progress/streak logic, reward maps,
--   group challenge logic, storage buckets, or app code.
--
-- IMPORTANT:
-- - Do not execute the commented cleanup block until it has been reviewed.
-- - Default privilege changes affect objects created in the future only.
-- - Existing tables/functions/sequences keep their current privileges until a
--   separate explicit grants cleanup is executed.
-- - After this cleanup, every future migration that creates a public table,
--   function, or sequence must include explicit GRANTs.

-- ---------------------------------------------------------------------------
-- A. Current default privileges audit. Read-only.
-- Expected current finding from 2026-06-23 audit:
-- - postgres and supabase_admin default privileges grant broad table/sequence
--   privileges and function execute to anon/authenticated/service_role.
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
-- B. Safety reminder before any execution.
-- ---------------------------------------------------------------------------
-- Before executing any default privilege cleanup:
-- [ ] Vercel production is healthy.
-- [ ] iOS/Android production 1.5 is healthy.
-- [ ] No active emergency hotfix is in progress.
-- [ ] Latest safe zip exists.
-- [ ] supabase/39_supabase_cleanup_execution_checklist_1_6.sql has been reviewed.
-- [ ] Every future migration rule is accepted:
--     - explicit authenticated/service_role GRANTs
--     - minimal/absent anon GRANTs
--     - RLS enabled
--     - policies added

-- ---------------------------------------------------------------------------
-- C. Candidate cleanup block — DO NOT RUN UNTIL REVIEWED.
-- This would stop automatic future Data API exposure for new public objects.
-- It does not affect existing tables/functions/sequences.
--
-- Keep this block commented until execution is explicitly approved.
-- If Supabase reports that the current SQL role cannot alter defaults for
-- supabase_admin, stop and do not improvise. Report the exact error first.
-- ---------------------------------------------------------------------------

-- begin;
--
-- -- Future tables/views created by postgres in public:
-- alter default privileges for role postgres in schema public
--   revoke all privileges on tables from anon, authenticated, service_role;
--
-- -- Future sequences created by postgres in public:
-- alter default privileges for role postgres in schema public
--   revoke all privileges on sequences from anon, authenticated, service_role;
--
-- -- Future functions created by postgres in public:
-- alter default privileges for role postgres in schema public
--   revoke execute on functions from anon, authenticated, service_role;
--
-- -- Future tables/views created by supabase_admin in public:
-- alter default privileges for role supabase_admin in schema public
--   revoke all privileges on tables from anon, authenticated, service_role;
--
-- -- Future sequences created by supabase_admin in public:
-- alter default privileges for role supabase_admin in schema public
--   revoke all privileges on sequences from anon, authenticated, service_role;
--
-- -- Future functions created by supabase_admin in public:
-- alter default privileges for role supabase_admin in schema public
--   revoke execute on functions from anon, authenticated, service_role;
--
-- commit;

-- ---------------------------------------------------------------------------
-- D. Post-cleanup verification query. Read-only.
-- After the commented cleanup is eventually executed, the audit should no longer
-- show anon/authenticated/service_role in broad default ACLs for public objects.
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
-- E. Rollback note — DO NOT RUN unless explicitly approved.
-- Re-adding broad defaults is not recommended. Prefer fixing individual future
-- migrations with explicit grants instead of restoring automatic broad exposure.
-- ---------------------------------------------------------------------------
-- Example only, not recommended:
-- alter default privileges for role postgres in schema public
--   grant all privileges on tables to anon, authenticated, service_role;
