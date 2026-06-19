-- Roots 1.5 group challenge request review queries
-- Purpose: helper queries for the Roots operator to review incoming group challenge requests.
-- This file is NOT an app migration and should not be run as one large production change.
-- It does not change progress/streak logic, Bible Reflection completion logic,
-- community feed visibility, sharing recipients, reward maps, or badge award logic.
--
-- Usage:
-- 1. Run the SELECT queries in Supabase SQL Editor when you need to review requests.
-- 2. Copy and edit one UPDATE statement at a time only after you have contacted the requester.
--
-- Note:
-- Roots profiles use the column name `name` for the visible user name.
-- Do not use `display_name` here.

-- Pending requests, newest first.
select
  gcr.id,
  gcr.status,
  gcr.created_at,
  gcr.title,
  gcr.requested_start_date,
  gcr.duration_days,
  gcr.requester_email,
  gcr.description,
  gcr.badge_idea,
  gcr.extra_questions,
  g.name as group_name,
  coalesce(nullif(p.name, ''), gcr.requester_email) as requester_name
from public.group_challenge_requests gcr
left join public.groups g on g.id = gcr.group_id
left join public.profiles p on p.id = gcr.requester_id
where gcr.status = 'pending'
order by gcr.created_at desc;

-- Recent requests, regardless of status.
select
  gcr.id,
  gcr.status,
  gcr.created_at,
  gcr.updated_at,
  gcr.title,
  gcr.requested_start_date,
  gcr.duration_days,
  gcr.requester_email,
  g.name as group_name,
  coalesce(nullif(p.name, ''), gcr.requester_email) as requester_name
from public.group_challenge_requests gcr
left join public.groups g on g.id = gcr.group_id
left join public.profiles p on p.id = gcr.requester_id
order by gcr.created_at desc
limit 50;

-- Mark one request as contacted after you have emailed the requester.
-- Replace the id and note before running.
-- update public.group_challenge_requests
-- set
--   status = 'contacted',
--   operator_notes = coalesce(operator_notes || E'\n', '') || 'Contacted by email on YYYY-MM-DD.',
--   updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000';

-- Mark one request as rejected/cancelled if needed.
-- Replace the id and note before running.
-- update public.group_challenge_requests
-- set
--   status = 'rejected',
--   operator_notes = coalesce(operator_notes || E'\n', '') || 'Rejected on YYYY-MM-DD: reason here.',
--   updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000';
