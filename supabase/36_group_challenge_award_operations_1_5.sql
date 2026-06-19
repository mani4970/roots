-- Roots 1.5 group challenge award operations helper
-- This file is NOT a migration to run all at once.
-- Use it when operating an approved group challenge.
--
-- Important:
-- - Replace the placeholder UUIDs before running UPDATE/INSERT examples.
-- - The participant snapshot should be created when the approved challenge is finalized,
--   ideally before or on the challenge start date.
-- - This helper does not modify progress/streak or Bible Reflection records.

-- 1) View approved challenges that still need participant snapshots.
select
  gc.id as challenge_id,
  gc.title,
  gc.start_date,
  gc.end_date,
  gc.status,
  g.name as group_name,
  count(gcp.user_id) as participant_count
from public.group_challenges gc
join public.groups g on g.id = gc.group_id
left join public.group_challenge_participants gcp on gcp.challenge_id = gc.id
where gc.status in ('scheduled', 'active', 'completed')
group by gc.id, gc.title, gc.start_date, gc.end_date, gc.status, g.name
order by gc.start_date desc;

-- 2) Create the automatic participant snapshot for a challenge.
-- Replace the UUID below, then run only this INSERT.
-- insert into public.group_challenge_participants (challenge_id, group_id, user_id, snapshot_at)
-- select
--   gc.id,
--   gc.group_id,
--   gm.user_id,
--   now()
-- from public.group_challenges gc
-- join public.group_members gm on gm.group_id = gc.group_id
-- where gc.id = '00000000-0000-0000-0000-000000000000'
-- on conflict (challenge_id, user_id) do nothing;

-- 3) Preview completion status after the challenge has ended.
-- Replace the UUID below, then run this SELECT.
-- with challenge as (
--   select *
--   from public.group_challenges
--   where id = '00000000-0000-0000-0000-000000000000'
-- ), completion as (
--   select
--     gcp.user_id,
--     count(distinct qr.date)::integer as done_days
--   from public.group_challenge_participants gcp
--   join challenge c on c.id = gcp.challenge_id
--   left join public.qt_records qr
--     on qr.user_id = gcp.user_id
--    and qr.is_draft = false
--    and qr.date between c.start_date and c.end_date
--   group by gcp.user_id
-- )
-- select
--   p.name,
--   completion.done_days,
--   (challenge.end_date - challenge.start_date + 1) as total_days,
--   completion.done_days = (challenge.end_date - challenge.start_date + 1) as completed
-- from completion
-- cross join challenge
-- left join public.profiles p on p.id = completion.user_id
-- order by completed desc, completion.done_days desc, p.name nulls last;

-- 4) View awarded group challenge badges.
select
  gca.awarded_at,
  gca.badge_name,
  gc.title as challenge_title,
  g.name as group_name,
  p.name as user_name
from public.group_challenge_awards gca
join public.group_challenges gc on gc.id = gca.challenge_id
join public.groups g on g.id = gca.group_id
left join public.profiles p on p.id = gca.user_id
order by gca.awarded_at desc
limit 50;
