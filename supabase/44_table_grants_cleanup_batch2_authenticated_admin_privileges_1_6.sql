-- 44_table_grants_cleanup_batch2_authenticated_admin_privileges_1_6.sql
-- Roots 1.6 Supabase table grants cleanup batch 2 execution candidate.
--
-- STATUS: EXECUTION CANDIDATE / DO NOT RUN WHOLE FILE BLINDLY.
-- This file is safe to run as-is only for the active SELECT pre/postcheck queries
-- because all permission-changing statements are commented out.
--
-- Context from 43 precheck on 2026-06-23:
-- - The batch 1 target tables had no anon table grant rows.
-- - RLS was enabled on all 9 target tables.
-- - Policies were authenticated-focused.
-- - Therefore 43's anon cleanup execution was not needed.
--
-- Batch 2 scope:
-- - Same 9 newer/support tables reviewed in batch 1.
-- - Remove ONLY admin-like table privileges from authenticated:
--   TRUNCATE, REFERENCES, TRIGGER.
-- - Do NOT change SELECT/INSERT/UPDATE/DELETE in this batch.
-- - Do NOT change anon, service_role, postgres, RLS policies, functions,
--   sequences, storage, or app code in this batch.
--
-- Target tables:
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
-- Explicitly NOT touched in this batch:
-- - profiles
-- - qt_records
-- - daily_checkins
-- - qt_schedule
-- - prayer_items / prayer_likes / prayer recipients
-- - groups / group_members / group invite flow
-- - qt_record_recipients / prayer_item_recipients
-- - storage.objects / qt-photos bucket
-- - get_group_invite
-- - claim_group_challenge_award function logic
-- - progress/streak, Bible Reflection completion, community feed visibility,
--   reward maps, app settings, notification code
--
-- Safety:
-- - Run the read-only prechecks first and export/save the output.
-- - Run the commented execution block only after explicit approval.
-- - After execution, run both postchecks and the focused regression checklist.

-- ---------------------------------------------------------------------------
-- A. PRECHECK: current authenticated grants for batch 2 target tables.
-- Read-only. Save/export this output before any execution.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
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
-- B. PRECHECK: admin-like authenticated grants only.
-- Read-only.
-- Expected before execution: rows may exist for REFERENCES/TRIGGER/TRUNCATE.
-- Expected after execution: zero rows.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
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
order by table_name, privilege_type;

-- ---------------------------------------------------------------------------
-- C. PRECHECK: RLS status for batch 2 target tables.
-- Read-only.
-- Expected: every row shows rowsecurity = true.
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
-- D. EXECUTION BLOCK — COMMENTED OUT ON PURPOSE.
--
-- DO NOT RUN until explicitly approved.
-- When approved, copy only the block between begin/commit to a new SQL Editor
-- tab, remove the leading comment markers, and run it once.
--
-- This block intentionally removes ONLY TRUNCATE/REFERENCES/TRIGGER from
-- authenticated. It does not revoke or re-grant SELECT/INSERT/UPDATE/DELETE.
-- ---------------------------------------------------------------------------

-- begin;
--
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
-- commit;

-- ---------------------------------------------------------------------------
-- E. POSTCHECK: admin-like authenticated grants only.
-- Read-only.
-- Expected after execution: zero rows.
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
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
order by table_name, privilege_type;

-- ---------------------------------------------------------------------------
-- F. POSTCHECK: full authenticated grants for target tables.
-- Read-only.
-- Expected after execution:
-- - authenticated keeps the same SELECT/INSERT/UPDATE/DELETE privileges as before
-- - authenticated no longer has TRUNCATE/REFERENCES/TRIGGER
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
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
-- G. Focused regression checklist after execution.
-- ---------------------------------------------------------------------------
-- [ ] Login works.
-- [ ] Home/profile load works.
-- [ ] Faith partner list loads.
-- [ ] Faith partner request/accept/decline/delete works.
-- [ ] Share prompt partner list loads.
-- [ ] Partner favorite/seen state still saves.
-- [ ] Hide post works.
-- [ ] Hide author works.
-- [ ] Report content works.
-- [ ] Group challenge request form submits.
-- [ ] Approved/preparing challenge card shows correctly.
-- [ ] Group challenge progress displays.
-- [ ] Group challenge award claim/profile badge works.
-- [ ] Community all/group/partner feeds still load.
-- [ ] Bible Reflection progress/streak flow is unchanged.
-- [ ] Reward maps are unchanged.

-- ---------------------------------------------------------------------------
-- H. Emergency rollback notes — DO NOT RUN unless explicitly approved.
--
-- TRUNCATE/REFERENCES/TRIGGER should not be required by normal app clients.
-- If a production issue occurs, identify the exact PostgREST/Supabase error
-- first instead of restoring broad table privileges.
-- ---------------------------------------------------------------------------
-- Example targeted rollback shape only:
-- grant trigger on table public.some_table to authenticated;
-- grant references on table public.some_table to authenticated;
