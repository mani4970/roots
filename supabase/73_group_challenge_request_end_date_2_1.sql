-- Roots 2.1 group challenge request end-date support
--
-- Purpose:
-- - Keep the existing, reviewed group_challenge_requests table and RLS model.
-- - Add an operator-friendly requested_end_date generated from the submitted
--   start date and inclusive duration.
-- - The app now lets the requester choose start and end dates directly, while
--   continuing to store duration_days for backward compatibility.
--
-- Safety:
-- - No progress/streak, qt_records, daily_checkins, profiles, challenge awards,
--   or notification behavior is changed.
-- - No anon access is added.
-- - Existing rows receive the generated end date automatically.

-- Precheck (read-only): inspect the current column before the guarded ALTER.
select
  column_name,
  data_type,
  is_generated,
  generation_expression
from information_schema.columns
where table_schema = 'public'
  and table_name = 'group_challenge_requests'
  and column_name = 'requested_end_date';

begin;

alter table public.group_challenge_requests
  add column if not exists requested_end_date date
  generated always as (
    requested_start_date + (duration_days - 1)
  ) stored;

comment on column public.group_challenge_requests.requested_end_date is
  'Inclusive requested end date generated from requested_start_date and duration_days.';

alter table public.group_challenge_requests enable row level security;

-- Re-assert the explicit Data API grants after the schema change.
revoke all privileges on table public.group_challenge_requests from public;
revoke all privileges on table public.group_challenge_requests from anon;
revoke all privileges on table public.group_challenge_requests from authenticated;
revoke all privileges on table public.group_challenge_requests from service_role;

grant select, insert on table public.group_challenge_requests to authenticated;
grant select, insert, update, delete on table public.group_challenge_requests to service_role;

commit;

-- Postcheck: existing and future rows should expose an inclusive requested end date.
select
  id,
  requested_start_date,
  duration_days,
  requested_end_date,
  status,
  created_at
from public.group_challenge_requests
order by created_at desc
limit 20;

-- Rollback reference (do not run after the app/operator workflow starts relying on the column):
-- alter table public.group_challenge_requests drop column if exists requested_end_date;
