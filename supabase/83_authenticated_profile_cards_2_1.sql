-- 83_authenticated_profile_cards_2_1.sql
-- Christian Roots 2.1 profile-read stabilization (phase 1 of 2)
--
-- Confirmed product rule:
--   - Roots profile cards are available only after authentication.
--   - A profile card exposes only the nickname, profile image/avatar,
--     and Word-walk day count needed by existing in-app screens.
--
-- Scope of this migration:
--   - Add one authenticated-only RPC for limited cross-user profile cards.
--   - Keep every existing profiles table grant and RLS policy unchanged.
--   - Keep own-profile reads, profile writes, badges, and progress unchanged.
--
-- Deployment order:
--   1. Run this SQL file.
--   2. Deploy the matching app patch that calls this RPC.
--   3. Verify companion, group-member, community-profile, and notification flows.
--   4. Tighten the broad profiles SELECT policies only in a later migration.
--
-- Safe execution:
--   CREATE OR REPLACE and the privilege statements are idempotent.


-- =========================================================
-- A. PRECHECK - preserve the current profiles access state
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
-- B. EXECUTE - authenticated, limited profile-card projection
-- =========================================================

begin;

create or replace function public.get_authenticated_profile_cards(
  p_user_ids uuid[]
)
returns table (
  id uuid,
  name text,
  avatar_url text,
  streak_days integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with requested_raw as (
    select
      input.requested_id,
      input.request_order
    from unnest(coalesce(p_user_ids, '{}'::uuid[]))
      with ordinality as input(requested_id, request_order)
    where input.requested_id is not null
  ),
  requested as (
    select
      requested_id,
      min(request_order) as request_order
    from requested_raw
    group by requested_id
    order by min(request_order)
    limit 100
  )
  select
    profile.id,
    profile.name,
    profile.avatar_url,
    profile.streak_days
  from requested
  join public.profiles as profile
    on profile.id = requested.requested_id
  where auth.uid() is not null
     or auth.role() = 'service_role'
  order by requested.request_order;
$$;

comment on function public.get_authenticated_profile_cards(uuid[]) is
  'Returns nickname, avatar, and Word-walk days for at most 100 requested profiles; authenticated users only.';

revoke all privileges
  on function public.get_authenticated_profile_cards(uuid[])
  from public, anon;

grant execute
  on function public.get_authenticated_profile_cards(uuid[])
  to authenticated, service_role;

commit;


-- =========================================================
-- C. POSTCHECK - expected grants and function properties
-- =========================================================

select
  routine_name,
  security_type,
  data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'get_authenticated_profile_cards';

select
  has_function_privilege(
    'anon',
    'public.get_authenticated_profile_cards(uuid[])',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.get_authenticated_profile_cards(uuid[])',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.get_authenticated_profile_cards(uuid[])',
    'EXECUTE'
  ) as service_role_can_execute;

-- Expected:
--   anon_can_execute          = false
--   authenticated_can_execute = true
--   service_role_can_execute  = true


-- =========================================================
-- D. POLICY SAFETY CHECK - this migration must not change it
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
-- E. EMERGENCY ROLLBACK ONLY - do not run during normal setup
-- =========================================================
-- Dropping the function before the matching app patch is removed would make
-- cross-user profile cards unavailable. Roll back the app first, then run:
--
-- drop function if exists public.get_authenticated_profile_cards(uuid[]);
