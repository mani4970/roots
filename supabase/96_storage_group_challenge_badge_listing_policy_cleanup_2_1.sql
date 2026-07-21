-- 96_storage_group_challenge_badge_listing_policy_cleanup_2_1.sql
-- Christian Roots 2.1 public group-challenge badge listing cleanup
--
-- Exact scope:
--   - Keep the group-challenge-badges bucket public.
--   - Keep every existing badge object and the 2 MB / image MIME restrictions.
--   - Remove only the broad public SELECT policy that permits object listing.
--   - Public badge URLs continue to work because public bucket downloads do not
--     require a SELECT policy on storage.objects.
--
-- This script does not delete or update bucket objects, challenge rows, badges,
-- awards, progress, hearts, profiles, or app records.


-- =========================================================
-- A. PRECHECK - public bucket and target listing policy
-- =========================================================

select
  bucket.id,
  bucket.public,
  bucket.file_size_limit,
  bucket.allowed_mime_types
from storage.buckets as bucket
where bucket.id = 'group-challenge-badges';

select
  policy.policyname,
  policy.roles,
  policy.cmd,
  policy.qual
from pg_policies as policy
where policy.schemaname = 'storage'
  and policy.tablename = 'objects'
  and policy.policyname = 'roots_group_challenge_badges_select_public';


-- =========================================================
-- B. EXECUTE - remove only the unnecessary listing policy
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if not exists (
    select 1
    from storage.buckets as bucket
    where bucket.id = 'group-challenge-badges'
      and bucket.public is true
  ) then
    raise exception 'Safety stop: expected public group-challenge-badges bucket';
  end if;

  if exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'storage'
      and policy.tablename = 'objects'
      and policy.policyname = 'roots_group_challenge_badges_select_public'
  ) and not exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'storage'
      and policy.tablename = 'objects'
      and policy.policyname = 'roots_group_challenge_badges_select_public'
      and policy.cmd = 'SELECT'
      and 'public' = any (policy.roles)
      and policy.qual ilike '%group-challenge-badges%'
  ) then
    raise exception 'Safety stop: target policy definition is unexpected';
  end if;
end;
$$;

drop policy if exists "roots_group_challenge_badges_select_public"
on storage.objects;

commit;


-- =========================================================
-- C. POSTCHECK - bucket stays public; broad listing is gone
-- =========================================================

select
  case
    when exists (
      select 1
      from storage.buckets as bucket
      where bucket.id = 'group-challenge-badges'
        and bucket.public is true
    )
    and not exists (
      select 1
      from pg_policies as policy
      where policy.schemaname = 'storage'
        and policy.tablename = 'objects'
        and policy.policyname = 'roots_group_challenge_badges_select_public'
    )
      then 'OK_GROUP_CHALLENGE_BADGE_LISTING_POLICY_REMOVED'
    else 'STOP_UNEXPECTED_GROUP_CHALLENGE_BADGE_STORAGE_STATE'
  end as verification;

-- Manual rollback, only if explicitly needed:
-- Recreate roots_group_challenge_badges_select_public from
-- supabase/37_group_challenge_badge_storage_1_5.sql.
