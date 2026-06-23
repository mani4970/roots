-- 41_table_grants_cleanup_batch1_plan_1_6.sql
-- Roots 1.6 Supabase table grants cleanup batch 1 plan.
--
-- STATUS: REVIEW / PLAN ONLY.
-- This file is safe to run as-is because it contains active SELECT audit queries
-- only. All permission-changing statements are commented out.
--
-- Batch 1 scope:
-- - Only newer/support tables where 2026-06-23 audit showed broad anon grants.
-- - Do NOT include progress/streak, Bible Reflection core, prayer core,
--   community feed core, storage, or invite RPC behavior in this batch.
--
-- Target tables from audit G:
-- - companion_preferences
-- - companions
-- - content_reports
-- - hidden_community_items
-- - hidden_community_users
-- - group_challenges
-- - group_challenge_requests
-- - group_challenge_participants
-- - group_challenge_awards
--
-- Why this batch is relatively contained:
-- - These tables already have explicit authenticated/service_role grants in
--   migrations and RLS policies in the repo.
-- - They do not need anon table access for normal app behavior.
-- - Existing RLS policies are authenticated-focused.
--
-- Still, do not execute until reviewed and tested.

-- ---------------------------------------------------------------------------
-- A. Precheck: current grants for batch 1 target tables. Read-only.
-- Save this output before execution.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'companion_preferences',
    'companions',
    'content_reports',
    'hidden_community_items',
    'hidden_community_users',
    'group_challenges',
    'group_challenge_requests',
    'group_challenge_participants',
    'group_challenge_awards'
  )
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- B. Precheck: RLS status for batch 1 target tables. Read-only.
-- All rows should show rowsecurity = true.
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'companion_preferences',
    'companions',
    'content_reports',
    'hidden_community_items',
    'hidden_community_users',
    'group_challenges',
    'group_challenge_requests',
    'group_challenge_participants',
    'group_challenge_awards'
  )
order by tablename;

-- ---------------------------------------------------------------------------
-- C. Precheck: policies for batch 1 target tables. Read-only.
-- Review roles/cmd/qual before any grant cleanup.
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
  and tablename in (
    'companion_preferences',
    'companions',
    'content_reports',
    'hidden_community_items',
    'hidden_community_users',
    'group_challenges',
    'group_challenge_requests',
    'group_challenge_participants',
    'group_challenge_awards'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- D. Candidate cleanup block — DO NOT RUN UNTIL REVIEWED.
-- Goal:
-- - Remove all anon table privileges from these target tables.
-- - Remove admin-like TRUNCATE/REFERENCES/TRIGGER from authenticated.
-- - Re-assert the explicit authenticated/service_role grants required by app code.
--
-- This block intentionally does NOT touch:
-- - profiles, qt_records, daily_checkins, qt_schedule
-- - prayer_items, prayer_likes, prayer recipients
-- - groups, group_members, group invite RPC
-- - qt_record_recipients / prayer_item_recipients
-- - storage.objects / storage buckets
-- - claim_group_challenge_award function logic
-- ---------------------------------------------------------------------------

-- begin;
--
-- -- 1) Remove anonymous access from batch 1 target tables.
-- revoke all privileges on table public.companion_preferences from anon;
-- revoke all privileges on table public.companions from anon;
-- revoke all privileges on table public.content_reports from anon;
-- revoke all privileges on table public.hidden_community_items from anon;
-- revoke all privileges on table public.hidden_community_users from anon;
-- revoke all privileges on table public.group_challenges from anon;
-- revoke all privileges on table public.group_challenge_requests from anon;
-- revoke all privileges on table public.group_challenge_participants from anon;
-- revoke all privileges on table public.group_challenge_awards from anon;
--
-- -- 2) Remove admin-like table privileges from authenticated for this batch.
-- revoke truncate, references, trigger on table public.companion_preferences from authenticated;
-- revoke truncate, references, trigger on table public.companions from authenticated;
-- revoke truncate, references, trigger on table public.content_reports from authenticated;
-- revoke truncate, references, trigger on table public.hidden_community_items from authenticated;
-- revoke truncate, references, trigger on table public.hidden_community_users from authenticated;
-- revoke truncate, references, trigger on table public.group_challenges from authenticated;
-- revoke truncate, references, trigger on table public.group_challenge_requests from authenticated;
-- revoke truncate, references, trigger on table public.group_challenge_participants from authenticated;
-- revoke truncate, references, trigger on table public.group_challenge_awards from authenticated;
--
-- -- 3) Re-assert required authenticated grants.
-- grant select, insert, update, delete on table public.companion_preferences to authenticated;
-- grant select, insert, update, delete on table public.companions to authenticated;
-- grant select, insert on table public.content_reports to authenticated;
-- grant select, insert, update, delete on table public.hidden_community_items to authenticated;
-- grant select, insert, update, delete on table public.hidden_community_users to authenticated;
-- grant select on table public.group_challenges to authenticated;
-- grant select, insert on table public.group_challenge_requests to authenticated;
-- grant select on table public.group_challenge_participants to authenticated;
-- grant select on table public.group_challenge_awards to authenticated;
--
-- -- 4) Re-assert required service_role grants.
-- grant select, insert, update, delete on table public.companion_preferences to service_role;
-- grant select, insert, update, delete on table public.companions to service_role;
-- grant select, insert, update, delete on table public.content_reports to service_role;
-- grant select, insert, update, delete on table public.hidden_community_items to service_role;
-- grant select, insert, update, delete on table public.hidden_community_users to service_role;
-- grant select, insert, update, delete on table public.group_challenges to service_role;
-- grant select, insert, update, delete on table public.group_challenge_requests to service_role;
-- grant select, insert, update, delete on table public.group_challenge_participants to service_role;
-- grant select, insert, update, delete on table public.group_challenge_awards to service_role;
--
-- commit;

-- ---------------------------------------------------------------------------
-- E. Postcheck query. Read-only.
-- After execution, expected:
-- - no anon rows for these target tables
-- - authenticated lacks TRUNCATE/REFERENCES/TRIGGER
-- - authenticated keeps only the explicitly required app privileges
-- - service_role keeps CRUD
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'companion_preferences',
    'companions',
    'content_reports',
    'hidden_community_items',
    'hidden_community_users',
    'group_challenges',
    'group_challenge_requests',
    'group_challenge_participants',
    'group_challenge_awards'
  )
group by table_schema, table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- F. Regression checklist after this batch, if/when executed.
-- ---------------------------------------------------------------------------
-- [ ] Login works.
-- [ ] Home/profile load works.
-- [ ] Faith partner request/accept/remove works.
-- [ ] Share prompt partner list loads.
-- [ ] Hidden posts/users still hide correctly.
-- [ ] Report content still works from community screens.
-- [ ] Group challenge request form submits.
-- [ ] Approved/preparing challenge card shows correctly.
-- [ ] Group challenge progress displays.
-- [ ] Group challenge award claim/profile badge works.
-- [ ] Community all/group/partner feeds still load.
-- [ ] No Bible Reflection progress/streak changes were touched.
-- [ ] No reward map behavior changed.

-- ---------------------------------------------------------------------------
-- G. Emergency rollback notes — DO NOT RUN unless explicitly approved.
-- Prefer fixing precise missing grants instead of restoring broad anon access.
-- If a production issue occurs, identify the exact failed table/role/error first.
-- ---------------------------------------------------------------------------
-- Example targeted rollback shape only:
-- grant select, insert on table public.group_challenge_requests to authenticated;
-- grant select on table public.group_challenges to authenticated;
