-- 84_profiles_authenticated_select_boundary_2_1.sql
-- Christian Roots 2.1 profiles read-boundary stabilization (phase 2 of 2)
--
-- Confirmed product behavior:
--   - Logged-out visitors cannot access Roots profile data.
--   - The app shows another user's limited profile card only in an existing
--     in-app context such as companions, group members, or shared community
--     content.
--   - The limited card contains only nickname, avatar, and Word-walk days and
--     is loaded through get_authenticated_profile_cards(uuid[]).
--
-- Scope of this migration:
--   - Remove only the two legacy SELECT policies whose USING clause is true.
--   - Add an explicit authenticated policy for direct own-profile SELECT.
--   - Keep the existing profile-card RPC and its grants unchanged.
--   - Keep every INSERT, UPDATE, DELETE, badge, progress, and Storage rule
--     unchanged.
--   - Keep all table grants unchanged in this step.
--
-- Safe execution:
--   The statements are idempotent. The transaction either completes in full
--   or leaves the previous policy state unchanged.


-- =========================================================
-- A. PRECHECK - matching app/RPC must already be deployed
-- =========================================================
-- Expected:
--   rpc_exists                = true
--   anon_can_execute_rpc      = false
--   authenticated_can_execute = true

select
  to_regprocedure(
    'public.get_authenticated_profile_cards(uuid[])'
  ) is not null as rpc_exists,
  has_function_privilege(
    'anon',
    'public.get_authenticated_profile_cards(uuid[])',
    'EXECUTE'
  ) as anon_can_execute_rpc,
  has_function_privilege(
    'authenticated',
    'public.get_authenticated_profile_cards(uuid[])',
    'EXECUTE'
  ) as authenticated_can_execute;


-- =========================================================
-- B. PRECHECK - current profiles policies
-- =========================================================
-- Before section C, the output is expected to include both legacy policies:
--   profiles_select       SELECT  true
--   타인 프로필 조회        SELECT  true

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;


-- =========================================================
-- C. EXECUTE - close direct cross-user profiles SELECT
-- =========================================================

begin;

drop policy if exists profiles_select
  on public.profiles;

drop policy if exists "타인 프로필 조회"
  on public.profiles;

drop policy if exists profiles_select_own
  on public.profiles;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

commit;


-- =========================================================
-- D. POSTCHECK - no unconditional profiles SELECT remains
-- =========================================================
-- Expected result: 0 rows.

select
  policyname,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and cmd = 'SELECT'
  and lower(regexp_replace(coalesce(qual, ''), '[()[:space:]]', '', 'g')) = 'true'
order by policyname;


-- =========================================================
-- E. POSTCHECK - own SELECT and card RPC remain available
-- =========================================================
-- Expected:
--   authenticated_has_table_select = true
--   authenticated_can_execute_rpc   = true
--   anon_can_execute_rpc            = false

select
  has_table_privilege(
    'authenticated',
    'public.profiles',
    'SELECT'
  ) as authenticated_has_table_select,
  has_function_privilege(
    'authenticated',
    'public.get_authenticated_profile_cards(uuid[])',
    'EXECUTE'
  ) as authenticated_can_execute_rpc,
  has_function_privilege(
    'anon',
    'public.get_authenticated_profile_cards(uuid[])',
    'EXECUTE'
  ) as anon_can_execute_rpc;


-- =========================================================
-- F. FINAL POLICY SNAPSHOT
-- =========================================================

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;


-- =========================================================
-- G. EMERGENCY ROLLBACK ONLY - do not run during normal setup
-- =========================================================
-- Restoring these policies recreates the legacy broad read boundary. Only use
-- this after sharing an actual regression and deciding to roll back SQL 84.
--
-- begin;
-- drop policy if exists profiles_select_own on public.profiles;
-- create policy profiles_select
--   on public.profiles for select to public using (true);
-- create policy "타인 프로필 조회"
--   on public.profiles for select to public using (true);
-- commit;
