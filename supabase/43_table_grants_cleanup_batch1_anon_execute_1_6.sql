-- 43_table_grants_cleanup_batch1_anon_execute_1_6.sql
-- Roots 1.6 Supabase table grants cleanup batch 1 execution candidate.
--
-- STATUS: EXECUTION CANDIDATE / DO NOT RUN WHOLE FILE BLINDLY.
--
-- Batch 1 scope:
-- - Newer/support tables only.
-- - Remove anon table privileges from these tables.
-- - Remove admin-like authenticated table privileges.
-- - Re-assert the app-required authenticated and service_role grants.
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
-- - The actual cleanup block is commented out. Run SELECT prechecks first.
-- - Execute only during a planned maintenance window, then immediately run the
--   postcheck and app regression checklist.

-- ---------------------------------------------------------------------------
-- A. PRECHECK: current grants for batch 1 target tables. Read-only.
-- Save/export this output before execution.
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
-- B. PRECHECK: RLS status for batch 1 target tables. Read-only.
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
-- C. PRECHECK: policies for batch 1 target tables. Read-only.
-- Review roles/cmd/qual before execution.
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
-- D. EXECUTION BLOCK — COMMENTED OUT ON PURPOSE.
--
-- DO NOT RUN until explicitly approved.
-- When approved, copy only the block between begin/commit to a new SQL Editor
-- tab, remove the leading comment markers, and run it once.
-- ---------------------------------------------------------------------------

-- begin;
--
-- -- 1) Remove anonymous table access from batch 1 target tables.
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
-- -- 2) Remove admin-like table privileges from authenticated users.
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
-- -- 3) Remove extra authenticated write privileges from read-only/operator tables.
-- -- Keep only app-required privileges below.
-- revoke insert, update, delete on table public.group_challenges from authenticated;
-- revoke update, delete on table public.group_challenge_requests from authenticated;
-- revoke insert, update, delete on table public.group_challenge_participants from authenticated;
-- revoke insert, update, delete on table public.group_challenge_awards from authenticated;
-- revoke update, delete on table public.content_reports from authenticated;
--
-- -- 4) Re-assert app-required authenticated grants.
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
-- -- 5) Re-assert operational service_role grants.
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
-- E. POSTCHECK: grants for batch 1 target tables. Read-only.
-- After execution, expected:
-- - no anon rows for these tables
-- - authenticated does not have TRUNCATE/REFERENCES/TRIGGER
-- - authenticated keeps the explicitly required app privileges
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
-- F. Focused regression checklist after execution.
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
-- G. Emergency rollback notes — DO NOT RUN unless explicitly approved.
-- Prefer fixing the exact missing grant shown by PostgREST 42501 instead of
-- restoring broad anon access.
-- ---------------------------------------------------------------------------
-- Example targeted rollback shapes only:
-- grant select, insert on table public.group_challenge_requests to authenticated;
-- grant select on table public.group_challenges to authenticated;
-- grant select, insert, update, delete on table public.companions to authenticated;
-- grant select, insert, update, delete on table public.companion_preferences to authenticated;
