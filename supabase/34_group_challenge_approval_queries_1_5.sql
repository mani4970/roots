-- Roots 1.5 group challenge approval helper queries
-- Purpose: help the Roots operator turn a reviewed request into an approved challenge.
-- This file is NOT an app migration and should not be run as one large production change.
-- It does not change progress/streak logic, Bible Reflection completion logic,
-- community feed visibility, sharing recipients, reward maps, or badge award logic.
--
-- Usage:
-- 1. Run the SELECT query to review pending/contacted requests.
-- 2. Contact the requester by email and finalize title, dates, badge name, copy, and badge image.
-- 3. Upload the final badge image to the group-challenge-badges Storage bucket.
-- 4. Copy ONE commented INSERT/UPDATE block, replace the placeholders, and run it carefully.

-- Requests that are ready for operator review or approval.
select
  gcr.id as request_id,
  gcr.status,
  gcr.created_at,
  gcr.title as requested_title,
  gcr.requested_start_date,
  gcr.duration_days,
  (gcr.requested_start_date + (gcr.duration_days - 1))::date as suggested_end_date,
  gcr.requester_email,
  gcr.description,
  gcr.badge_idea,
  gcr.extra_questions,
  g.name as group_name,
  g.id as group_id,
  coalesce(nullif(p.name, ''), gcr.requester_email) as requester_name
from public.group_challenge_requests gcr
left join public.groups g on g.id = gcr.group_id
left join public.profiles p on p.id = gcr.requester_id
where gcr.status in ('pending', 'contacted', 'approved')
order by gcr.created_at desc;

-- Create an approved challenge from a finalized request.
-- Replace every placeholder before running.
--
-- begin;
--
-- insert into public.group_challenges (
--   request_id,
--   group_id,
--   title,
--   description,
--   start_date,
--   end_date,
--   badge_name,
--   badge_description,
--   badge_image_path,
--   status,
--   operator_notes
-- )
-- select
--   gcr.id,
--   gcr.group_id,
--   'FINAL_CHALLENGE_TITLE',
--   'FINAL_CHALLENGE_DESCRIPTION',
--   date 'YYYY-MM-DD',
--   date 'YYYY-MM-DD',
--   'FINAL_BADGE_NAME',
--   'FINAL_BADGE_DESCRIPTION',
--   -- Use either a Storage path such as approved-badges/file.webp, a full https:// URL, or a /public-path image.
--   'approved-badges/YYYY-MM-DD-final-badge.webp',
--   'scheduled',
--   'Approved by operator on YYYY-MM-DD.'
-- from public.group_challenge_requests gcr
-- where gcr.id = '00000000-0000-0000-0000-000000000000';
--
-- update public.group_challenge_requests
-- set
--   status = 'approved',
--   operator_notes = coalesce(operator_notes || E'\n', '') || 'Approved and created group_challenges row on YYYY-MM-DD.',
--   updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000';
--
-- commit;

-- Cancel an approved challenge if needed.
-- Replace the id and note before running.
-- update public.group_challenges
-- set
--   status = 'cancelled',
--   operator_notes = coalesce(operator_notes || E'\n', '') || 'Cancelled on YYYY-MM-DD: reason here.',
--   updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000';
