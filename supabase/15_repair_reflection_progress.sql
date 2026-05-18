-- Optional one-time repair for users whose completed Bible Reflection records exist,
-- but profiles.streak_days / total_days / last_checkin were not updated by the old Home/watering flow.
--
-- IMPORTANT:
-- - Do not run blindly while reviewing a specific user. Prefer the single-user repair first.
-- - Roots currently treats streak_days as cumulative Bible Reflection completion days, not a reset-on-gap streak.
-- - This script counts distinct non-draft qt_records.date values up to today.

-- 1) Preview affected users before updating.
select
  p.id,
  p.name,
  p.streak_days,
  p.total_days,
  p.last_checkin,
  c.completed_days,
  c.last_completed_date
from public.profiles p
join (
  select
    user_id,
    count(distinct date)::int as completed_days,
    max(date)::date as last_completed_date
  from public.qt_records
  where is_draft = false
    and date <= current_date
  group by user_id
) c on c.user_id = p.id
where coalesce(p.total_days, 0) < c.completed_days
   or coalesce(p.streak_days, 0) < c.completed_days
   or p.last_checkin is null
order by c.completed_days desc, c.last_completed_date desc;

-- 2) Single-user repair. Replace the UUID before running.
-- with completed as (
--   select
--     user_id,
--     count(distinct date)::int as completed_days,
--     max(date)::date as last_completed_date
--   from public.qt_records
--   where user_id = 'REPLACE_WITH_USER_ID'
--     and is_draft = false
--     and date <= current_date
--   group by user_id
-- )
-- update public.profiles p
-- set
--   total_days = greatest(coalesce(p.total_days, 0), completed.completed_days),
--   streak_days = greatest(coalesce(p.streak_days, 0), completed.completed_days),
--   last_checkin = case
--     when p.last_checkin is null then completed.last_completed_date
--     when p.last_checkin::date < completed.last_completed_date then completed.last_completed_date
--     else p.last_checkin::date
--   end
-- from completed
-- where p.id = completed.user_id
-- returning p.id, p.name, p.streak_days, p.total_days, p.last_checkin;

-- 3) Broad repair. Only run during a planned maintenance/check window after previewing.
-- with completed as (
--   select
--     user_id,
--     count(distinct date)::int as completed_days,
--     max(date)::date as last_completed_date
--   from public.qt_records
--   where is_draft = false
--     and date <= current_date
--   group by user_id
-- )
-- update public.profiles p
-- set
--   total_days = greatest(coalesce(p.total_days, 0), completed.completed_days),
--   streak_days = greatest(coalesce(p.streak_days, 0), completed.completed_days),
--   last_checkin = case
--     when p.last_checkin is null then completed.last_completed_date
--     when p.last_checkin::date < completed.last_completed_date then completed.last_completed_date
--     else p.last_checkin::date
--   end
-- from completed
-- where p.id = completed.user_id
--   and (
--     coalesce(p.total_days, 0) < completed.completed_days
--     or coalesce(p.streak_days, 0) < completed.completed_days
--     or p.last_checkin is null
--   )
-- returning p.id, p.name, p.streak_days, p.total_days, p.last_checkin;
