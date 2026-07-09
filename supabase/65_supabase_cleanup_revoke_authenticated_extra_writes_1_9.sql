-- 65_supabase_cleanup_revoke_authenticated_extra_writes_1_9.sql
-- Christian Roots 1.9 Supabase cleanup batch 65
--
-- STATUS: EXECUTION CANDIDATE / RUN SECTIONS SEPARATELY.
--
-- Purpose:
--   Batch 64 showed that several support/challenge tables still grant more direct
--   authenticated write privileges than their original Roots migrations intended.
--   This batch removes only those extra authenticated DML privileges from a small,
--   policy-reviewed set.
--
-- Why this is narrowly scoped:
--   - Batch 64 section C showed no anon grants on these support/challenge targets.
--   - Batch 64 section D showed no authenticated admin-like grants on these targets.
--   - Batch 64 section F showed RLS is enabled.
--   - Batch 64 section G showed the app-facing RLS policies only allow the expected
--     user actions for these tables.
--   - The app code uses content_reports INSERT, group_challenge_requests INSERT/SELECT,
--     and group challenge table SELECTs. Operator actions use SQL Editor/service_role.
--
-- This batch revokes only:
--   - content_reports: UPDATE, DELETE from authenticated
--   - group_challenge_requests: UPDATE, DELETE from authenticated
--   - group_challenges: INSERT, UPDATE, DELETE from authenticated
--   - group_challenge_participants: INSERT, UPDATE, DELETE from authenticated
--   - group_challenge_awards: INSERT, UPDATE, DELETE from authenticated
--
-- Explicitly NOT touched:
--   - SELECT/INSERT privileges that the app still needs
--   - service_role privileges
--   - anon grants (already absent for these targets)
--   - RLS policies
--   - companions / companion_preferences
--   - hidden_community_items / hidden_community_users
--   - groups / group_members / get_group_invite
--   - group challenge claim RPC public.claim_group_challenge_award(uuid)
--   - progress/streak/checkin functions
--   - qt_records / daily_checkins / profiles
--   - prayer tables
--   - storage buckets
--   - default privileges
--
-- Run order in Supabase SQL Editor:
--   1) Run section A and confirm the exact five target rows/extra privileges.
--   2) Run section B to confirm RLS policies still match expected app behavior.
--   3) Run section C once.
--   4) Run section D and confirm it returns 0 rows, or Supabase displays only "success".
--   5) Run section E to confirm expected authenticated privileges remain.
--   6) Run section F only as a service_role snapshot.
--   7) Keep section G only for emergency rollback. Do not run G unless explicitly needed.


-- =========================================================
-- A. PRECHECK - authenticated extra write privileges to remove
-- =========================================================
-- Expected before section C:
--   content_reports: {DELETE,UPDATE}
--   group_challenge_awards: {DELETE,INSERT,UPDATE}
--   group_challenge_participants: {DELETE,INSERT,UPDATE}
--   group_challenge_requests: {DELETE,UPDATE}
--   group_challenges: {DELETE,INSERT,UPDATE}
-- If any unexpected table appears, stop and send the result.

with expected(table_name, expected_privileges) as (
  values
    ('content_reports', array['INSERT','SELECT']::text[]),
    ('group_challenge_awards', array['SELECT']::text[]),
    ('group_challenge_participants', array['SELECT']::text[]),
    ('group_challenge_requests', array['INSERT','SELECT']::text[]),
    ('group_challenges', array['SELECT']::text[])
), actual as (
  select
    g.table_name,
    array_agg(g.privilege_type order by g.privilege_type) as actual_privileges
  from information_schema.role_table_grants g
  join expected e on e.table_name = g.table_name
  where g.table_schema = 'public'
    and g.grantee = 'authenticated'
  group by g.table_name
)
select
  e.table_name,
  e.expected_privileges,
  coalesce(a.actual_privileges, array[]::text[]) as actual_privileges,
  array(
    select p
    from unnest(coalesce(a.actual_privileges, array[]::text[])) as p
    where not (p = any(e.expected_privileges))
    order by p
  ) as extra_privileges_to_revoke
from expected e
left join actual a on a.table_name = e.table_name
where exists (
  select 1
  from unnest(coalesce(a.actual_privileges, array[]::text[])) as p
  where not (p = any(e.expected_privileges))
)
order by e.table_name;


-- =========================================================
-- B. POLICY GUARD - expected app-facing policies
-- =========================================================
-- Read-only.
-- Expected policy intent:
--   content_reports: authenticated SELECT own, INSERT own
--   group_challenge_requests: authenticated SELECT own, INSERT if group member
--   group_challenges: authenticated SELECT group-member visible challenges
--   group_challenge_participants: authenticated SELECT own
--   group_challenge_awards: authenticated SELECT own

with target_tables(table_name) as (
  values
    ('content_reports'),
    ('group_challenge_awards'),
    ('group_challenge_participants'),
    ('group_challenge_requests'),
    ('group_challenges')
)
select
  p.schemaname,
  p.tablename,
  p.policyname,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
from pg_policies p
join target_tables t on t.table_name = p.tablename
where p.schemaname = 'public'
order by p.tablename, p.policyname;


-- =========================================================
-- C. EXECUTE - revoke only the extra authenticated writes
-- =========================================================
-- These revokes should leave the expected app privileges in place:
--   content_reports: SELECT, INSERT
--   group_challenge_requests: SELECT, INSERT
--   group_challenges: SELECT
--   group_challenge_participants: SELECT
--   group_challenge_awards: SELECT

begin;

revoke update, delete on table public.content_reports from authenticated;
revoke update, delete on table public.group_challenge_requests from authenticated;

revoke insert, update, delete on table public.group_challenges from authenticated;
revoke insert, update, delete on table public.group_challenge_participants from authenticated;
revoke insert, update, delete on table public.group_challenge_awards from authenticated;

commit;


-- =========================================================
-- D. POSTCHECK - extra authenticated writes should be gone
-- =========================================================
-- Expected after section C: 0 rows, or Supabase may display only "success".
-- If rows remain, stop and send the result before doing anything else.

with expected(table_name, expected_privileges) as (
  values
    ('content_reports', array['INSERT','SELECT']::text[]),
    ('group_challenge_awards', array['SELECT']::text[]),
    ('group_challenge_participants', array['SELECT']::text[]),
    ('group_challenge_requests', array['INSERT','SELECT']::text[]),
    ('group_challenges', array['SELECT']::text[])
), actual as (
  select
    g.table_name,
    array_agg(g.privilege_type order by g.privilege_type) as actual_privileges
  from information_schema.role_table_grants g
  join expected e on e.table_name = g.table_name
  where g.table_schema = 'public'
    and g.grantee = 'authenticated'
  group by g.table_name
)
select
  e.table_name,
  e.expected_privileges,
  coalesce(a.actual_privileges, array[]::text[]) as actual_privileges,
  array(
    select p
    from unnest(coalesce(a.actual_privileges, array[]::text[])) as p
    where not (p = any(e.expected_privileges))
    order by p
  ) as unexpected_remaining_privileges
from expected e
left join actual a on a.table_name = e.table_name
where exists (
  select 1
  from unnest(coalesce(a.actual_privileges, array[]::text[])) as p
  where not (p = any(e.expected_privileges))
)
order by e.table_name;


-- =========================================================
-- E. POSTCHECK - expected authenticated privileges should remain
-- =========================================================
-- Expected:
--   content_reports: {INSERT,SELECT}
--   group_challenge_awards: {SELECT}
--   group_challenge_participants: {SELECT}
--   group_challenge_requests: {INSERT,SELECT}
--   group_challenges: {SELECT}

with target_tables(table_name) as (
  values
    ('content_reports'),
    ('group_challenge_awards'),
    ('group_challenge_participants'),
    ('group_challenge_requests'),
    ('group_challenges')
)
select
  g.table_schema,
  g.table_name,
  g.grantee,
  array_agg(g.privilege_type order by g.privilege_type) as privileges
from information_schema.role_table_grants g
join target_tables t on t.table_name = g.table_name
where g.table_schema = 'public'
  and g.grantee = 'authenticated'
group by g.table_schema, g.table_name, g.grantee
order by g.table_name;


-- =========================================================
-- F. SNAPSHOT - service_role privileges should remain untouched
-- =========================================================
-- Read-only.
-- This is only to verify operator/service workflows still have table-level access.

with target_tables(table_name) as (
  values
    ('content_reports'),
    ('group_challenge_awards'),
    ('group_challenge_participants'),
    ('group_challenge_requests'),
    ('group_challenges')
)
select
  g.table_schema,
  g.table_name,
  g.grantee,
  array_agg(g.privilege_type order by g.privilege_type) as privileges
from information_schema.role_table_grants g
join target_tables t on t.table_name = g.table_name
where g.table_schema = 'public'
  and g.grantee = 'service_role'
group by g.table_schema, g.table_name, g.grantee
order by g.table_name;


-- =========================================================
-- G. EMERGENCY ROLLBACK ONLY
-- =========================================================
-- Do not run this unless a production issue is clearly traced to batch 65.
-- This restores only the direct authenticated privileges removed in section C.
-- RLS policies will still restrict rows/actions.
--
-- begin;
--
-- grant update, delete on table public.content_reports to authenticated;
-- grant update, delete on table public.group_challenge_requests to authenticated;
--
-- grant insert, update, delete on table public.group_challenges to authenticated;
-- grant insert, update, delete on table public.group_challenge_participants to authenticated;
-- grant insert, update, delete on table public.group_challenge_awards to authenticated;
--
-- commit;
