-- 29_supabase_cleanup_execution_checklist_1_4.sql
-- Roots 1.4 Supabase cleanup execution checklist.
--
-- STATUS: PLAN / CHECKLIST ONLY.
-- This file is intentionally safe to run: it contains comments and SELECT audit queries only.
-- Do NOT paste or run REVOKE/GRANT cleanup from this file.
-- Actual permission changes should be copied from reviewed, phase-specific files only after a test window is ready.
--
-- Created for the next Roots work session so Supabase cleanup can be resumed without re-discovering context.
-- Date: 2026-06-18
-- Branch context: feature/roots-1.4
--
-- Related files:
-- - supabase/26_security_grants_rls_audit_20260617.sql
--   Read-only audit queries. Run this first and save output.
-- - supabase/27_public_table_grants_cleanup_plan_1_4.sql
--   Public table grants cleanup plan. Candidate SQL is commented out. Do not run blindly.
-- - supabase/28_public_function_grants_cleanup_plan_1_4.sql
--   Public function/RPC execute grants cleanup plan. Candidate SQL is commented out. Do not run blindly.
--
-- Current conclusion from 2026-06-17/18 audits:
-- - public table RLS is enabled for the audited Roots tables.
-- - policies exist, but many table grants are broader than least-privilege.
-- - anon currently has broad grants on many public tables in production.
-- - authenticated also has admin-like grants such as TRUNCATE/TRIGGER/REFERENCES on many tables.
-- - qt-photos bucket is private and should stay private.
-- - get_group_invite likely needs anon EXECUTE for logged-out invite/join flows.
-- - mutating group RPCs should not need anon EXECUTE.
-- - trigger-only functions should not be directly callable by public app roles.
--
-- Non-negotiable safety rules:
-- - Do not run broad REVOKE/GRANT cleanup during normal live-app usage.
-- - Do not change progress/streak/Bible Reflection completion logic as part of Supabase cleanup.
-- - Do not change storage bucket privacy for qt-photos.
-- - Do not remove anon access from get_group_invite until logged-out invite flow is verified another way.
-- - Do not remove helper function access used by RLS policies without inspecting policy dependencies.
-- - Apply changes in small phases, then immediately regression test.
--
-- Recommended timing:
-- 1) Finish/verify Roots 1.4 app-side stabilization.
-- 2) Verify Android upload key / AAB upload path after 2026-06-19 activation.
-- 3) Choose a Supabase cleanup window with time for rollback and actual-device testing.
-- 4) Run this checklist and 26 audit queries.
-- 5) Apply only one reviewed phase at a time.
-- 6) Regression test before moving to the next phase.

-- ---------------------------------------------------------------------------
-- A. PRE-FLIGHT: identify current production grants.
-- Save this output before any change.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- B. PRE-FLIGHT: focus on anonymous table access.
-- Phase 1 should normally remove anon write/admin-like privileges first,
-- while keeping anon SELECT until logged-out invite/public flows are rechecked.
-- ---------------------------------------------------------------------------
select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
group by table_name
order by table_name;

select
  table_name,
  array_agg(privilege_type order by privilege_type) as anon_write_or_admin_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES')
group by table_name
order by table_name;

-- ---------------------------------------------------------------------------
-- C. PRE-FLIGHT: focus on authenticated admin-like table grants.
-- Normal app users should not need TRUNCATE, TRIGGER, or REFERENCES.
-- ---------------------------------------------------------------------------
select
  table_name,
  array_agg(privilege_type order by privilege_type) as authenticated_admin_like_privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
group by table_name
order by table_name;

-- ---------------------------------------------------------------------------
-- D. PRE-FLIGHT: function/RPC execute grants.
-- Compare this with supabase/28_public_function_grants_cleanup_plan_1_4.sql.
-- ---------------------------------------------------------------------------
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
order by routine_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- E. PRE-FLIGHT: function definitions and RLS helper risk.
-- Security definer functions and functions referenced from RLS policies need extra care.
-- ---------------------------------------------------------------------------
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as owner,
  n.nspname as schema
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;

-- ---------------------------------------------------------------------------
-- F. PRE-FLIGHT: policies that may depend on helper functions or public roles.
-- Inspect output before touching can_view_qt_record, can_view_prayer_item,
-- is_group_member, can_share_prayer_visibility, or anon/public policies.
-- ---------------------------------------------------------------------------
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
  and (
    roles::text like '%public%'
    or roles::text like '%anon%'
    or coalesce(qual, '') ~ 'can_view|is_group_member|can_share|get_group_invite'
    or coalesce(with_check, '') ~ 'can_view|is_group_member|can_share|get_group_invite'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- G. Storage sanity check. qt-photos must remain private.
-- ---------------------------------------------------------------------------
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by id;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- H. Recommended execution phases when ready.
-- Keep this as checklist; do not execute permission changes from this file.
-- ---------------------------------------------------------------------------
-- PHASE 0: Snapshot / preparation
-- [ ] Run sections A-G above and save output.
-- [ ] Confirm latest main/production app is stable.
-- [ ] Confirm feature/roots-1.4 build and basic local tests are clean.
-- [ ] Confirm at least one test account can login on web and app.
-- [ ] Confirm support/rollback time is available.
--
-- PHASE 1A: Function/RPC grants, smallest safe slice
-- Source: supabase/28_public_function_grants_cleanup_plan_1_4.sql
-- [ ] Keep get_group_invite(uuid) executable by anon/authenticated/service_role.
-- [ ] Remove anon EXECUTE from get_my_group_preferences().
-- [ ] Remove anon EXECUTE from mutating group RPCs:
--     leave_group(uuid), mark_group_qt_seen(uuid), mark_group_qt_seen_v2(uuid),
--     set_group_favorite(uuid, boolean), set_group_favorite_v2(uuid, boolean).
-- [ ] Remove direct PUBLIC/anon/authenticated EXECUTE from trigger-only functions:
--     guard_companion_updates(), handle_new_user(), touch_companions_updated_at().
-- [ ] Do not touch RLS helper functions in Phase 1A.
--
-- Phase 1A immediate regression:
-- [ ] Logged-out group invite page loads.
-- [ ] Logged-in group invite/join works.
-- [ ] Group favorite toggle works.
-- [ ] Group unread/seen markers update.
-- [ ] Leave group works.
-- [ ] New signup creates profile through handle_new_user trigger.
-- [ ] Partner request/accept/remove works.
-- [ ] Community/group/partner feeds still load.
--
-- PHASE 1B: Public table grants, conservative slice
-- Source: supabase/27_public_table_grants_cleanup_plan_1_4.sql
-- [ ] Remove TRUNCATE/REFERENCES/TRIGGER from anon and authenticated.
-- [ ] Remove INSERT/UPDATE/DELETE from anon.
-- [ ] Re-grant explicit authenticated privileges per current app table needs.
-- [ ] Keep anon SELECT temporarily until invite/public group flows are verified.
--
-- Phase 1B immediate regression:
-- [ ] login/signup/OAuth/password reset
-- [ ] Home load and qt_schedule load
-- [ ] Bible Reflection: 6-step, freeform, Sunday, photo
-- [ ] progress/streak/garden/watering/badge flow
-- [ ] prayer create/share/answered/pray together/likes
-- [ ] community all/group/partner feeds and reactions
-- [ ] group create/join/favorite/seen/leave/invite
-- [ ] partner request/accept/remove/share prompt
-- [ ] reports/hide content/hide users
-- [ ] profile photo upload/reset/delete
-- [ ] account deletion flow
--
-- PHASE 2: anon SELECT and public policies
-- [ ] Do not start until Phase 1A and 1B have been stable.
-- [ ] Decide which public logged-out flows Roots still supports.
-- [ ] Re-check /join and get_group_invite behavior.
-- [ ] Review policies assigned to public role.
-- [ ] Only then reduce anon SELECT and duplicate public-role policies.
--
-- PHASE 3: Future default privileges
-- [ ] Only after all required RPCs have explicit grants in migrations.
-- [ ] Consider default function privilege hardening for future functions.
-- [ ] Keep this separate from table grants and storage policies.

-- ---------------------------------------------------------------------------
-- I. Minimal emergency rollback notes.
-- Do not use broad rollback unless production is broken and narrow rollback is too slow.
-- Prefer restoring only the specific grant that broke a specific flow.
-- ---------------------------------------------------------------------------
-- Examples of narrow rollback direction if needed:
-- - If logged-out group invites break, restore anon EXECUTE on get_group_invite(uuid).
-- - If group favorite/seen/leave breaks for logged-in users, restore authenticated EXECUTE
--   on the matching group RPC.
-- - If trigger-created signup profiles break, inspect handle_new_user trigger first;
--   trigger execution usually does not require public app role EXECUTE grants.
-- - If a table operation breaks, check both table grants and RLS policies before broad grants.
