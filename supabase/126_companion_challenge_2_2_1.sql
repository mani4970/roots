-- Roots 2.1: Companion Challenge 2 + one-time announcement receipt.
--
-- Challenge:
-- - Title: 우리의 신앙 여정 Part 2
-- - Window: 2026-08-15 through 2026-08-31 inclusive (17 days)
-- - Success: an accepted companion pair completes Bible Reflection on every day
-- - Reward: special badge + 20 Love Hearts, once per user/challenge
--
-- Announcement:
-- - Client window: 2026-08-11 through 2026-08-14
-- - Either explicit button stores one account-scoped receipt
-- - No reflection, prayer, progress, streak, watering, or challenge ledger is changed here

begin;

-- A. Foundation precheck.
do $$
begin
  if to_regclass('public.profiles') is null
    or to_regclass('public.companion_challenges') is null
    or to_regclass('public.companion_challenge_daily_completions') is null
    or to_regclass('public.companion_challenge_awards') is null
    or to_regprocedure('public.record_companion_challenge_completion(date,uuid)') is null
    or to_regprocedure('public.get_companion_challenge_status(uuid,date)') is null
    or to_regprocedure('public.claim_pending_challenge_rewards(date)') is null
  then
    raise exception 'Companion challenge prerequisites are missing';
  end if;
end;
$$;

-- B. Generic account-scoped one-time campaign receipt table.
create table if not exists public.user_campaign_impressions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_key text not null check (length(btrim(campaign_key)) between 1 and 160),
  seen_at timestamptz not null default now(),
  primary key (user_id, campaign_key)
);

comment on table public.user_campaign_impressions is
  'Account-scoped receipts for explicit one-time in-app announcements. Stores no announcement body or private content.';
comment on column public.user_campaign_impressions.campaign_key is
  'Stable operator-defined campaign key, such as companion_challenge_2_announcement_20260811.';

create index if not exists user_campaign_impressions_campaign_seen_idx
  on public.user_campaign_impressions (campaign_key, seen_at desc);

alter table public.user_campaign_impressions enable row level security;

revoke all privileges on table public.user_campaign_impressions from public;
revoke all privileges on table public.user_campaign_impressions from anon;
revoke all privileges on table public.user_campaign_impressions from authenticated;
revoke all privileges on table public.user_campaign_impressions from service_role;

grant select, insert on table public.user_campaign_impressions to authenticated;
grant select, insert, update, delete on table public.user_campaign_impressions to service_role;

drop policy if exists user_campaign_impressions_select_own
  on public.user_campaign_impressions;
create policy user_campaign_impressions_select_own
on public.user_campaign_impressions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists user_campaign_impressions_insert_own
  on public.user_campaign_impressions;
create policy user_campaign_impressions_insert_own
on public.user_campaign_impressions
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- C. Insert or safely update Companion Challenge 2.
insert into public.companion_challenges (
  id,
  title,
  description,
  start_date,
  end_date,
  required_days,
  reward_hearts,
  badge_name,
  badge_description,
  badge_image_path,
  status,
  operator_notes
)
values (
  'f7dbeeac-d739-425b-b26e-536650e5e20f'::uuid,
  '우리의 신앙 여정 Part 2',
  '8월 15일부터 31일까지, 동역자와 매일 함께 말씀 묵상을 완료해보세요.',
  '2026-08-15'::date,
  '2026-08-31'::date,
  17,
  20,
  '우리의 신앙 여정 Part 2',
  '17일 동안 말씀 안에서 함께 걸어온 동역자 챌린지 배지',
  '/images/companion-challenges/companion-challenge-2.png',
  'scheduled',
  'Second app-wide companion challenge. Strict condition: both accepted companions complete same-day Bible Reflection on every date from 2026-08-15 through 2026-08-31. Reward is one badge plus 20 Love Hearts once per user/challenge, even if multiple companion pairs complete.'
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  required_days = excluded.required_days,
  reward_hearts = excluded.reward_hearts,
  badge_name = excluded.badge_name,
  badge_description = excluded.badge_description,
  badge_image_path = excluded.badge_image_path,
  status = excluded.status,
  operator_notes = excluded.operator_notes,
  updated_at = now();

-- D. Safety assertions.
do $$
declare
  v_row public.companion_challenges%rowtype;
begin
  select * into strict v_row
  from public.companion_challenges
  where id = 'f7dbeeac-d739-425b-b26e-536650e5e20f'::uuid;

  if v_row.start_date <> '2026-08-15'::date
    or v_row.end_date <> '2026-08-31'::date
    or v_row.required_days <> 17
    or v_row.reward_hearts <> 20
    or v_row.badge_image_path <> '/images/companion-challenges/companion-challenge-2.png'
    or v_row.status <> 'scheduled'
  then
    raise exception 'Companion Challenge 2 row does not match the approved configuration';
  end if;

  if has_table_privilege('anon', 'public.user_campaign_impressions', 'SELECT')
    or has_table_privilege('anon', 'public.user_campaign_impressions', 'INSERT')
  then
    raise exception 'anon must not access user_campaign_impressions';
  end if;
end;
$$;

commit;

-- Expected final result: one 17-day challenge with 20 Hearts and a secured receipt table.
select
  to_regclass('public.user_campaign_impressions') is not null as campaign_receipts_ready,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_campaign_impressions'
      and policyname = 'user_campaign_impressions_select_own'
  ) as campaign_receipts_select_policy_ready,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_campaign_impressions'
      and policyname = 'user_campaign_impressions_insert_own'
  ) as campaign_receipts_insert_policy_ready;

select
  id,
  title,
  start_date,
  end_date,
  (end_date - start_date + 1) as calendar_days,
  required_days,
  reward_hearts,
  badge_name,
  badge_image_path,
  status
from public.companion_challenges
where id = 'f7dbeeac-d739-425b-b26e-536650e5e20f'::uuid;
