-- Roots 1.9 - Companion Challenge 1 activation
-- Purpose:
--   Activate the first app-wide companion challenge after the foundation in 69.
--   This file inserts/updates only the operator-managed challenge row.
--   No grants, RLS policies, progress/streak logic, or core tables are changed here.
--
-- Challenge:
--   Title: 우리의 신앙 여정 Part 1
--   Window: 2026-07-17 through 2026-07-31 inclusive
--   Success: both companions complete same-day Bible Reflection on all 15 days
--   Reward: special badge + 10 Love Hearts, once per user/challenge

begin;

-- A. Precheck: the companion challenge foundation should already exist.
select
  'A. foundation tables/functions present' as section,
  to_regclass('public.companion_challenges') is not null as has_companion_challenges,
  to_regclass('public.companion_challenge_daily_completions') is not null as has_daily_completions,
  to_regclass('public.companion_challenge_awards') is not null as has_awards,
  to_regprocedure('public.get_companion_challenge_status(uuid,date)') is not null as has_status_rpc,
  to_regprocedure('public.claim_companion_challenge_reward(uuid,uuid)') is not null as has_claim_rpc;

-- B. Insert the campaign row if it does not exist yet.
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
select
  '0d92d123-3fbd-48a7-b7f2-ebeee368f660'::uuid,
  '우리의 신앙 여정 Part 1',
  '7월 17일부터 31일까지, 동역자와 매일 함께 말씀 묵상을 완료해보세요.',
  '2026-07-17'::date,
  '2026-07-31'::date,
  15,
  10,
  '우리의 신앙 여정 Part 1',
  '15일 동안 말씀 안에서 함께 걸어온 동역자 챌린지 배지',
  '/images/companion-challenges/companion-challenge-1.png',
  'scheduled',
  'First app-wide companion challenge. Strict condition: both companions must complete Bible Reflection on every date from 2026-07-17 to 2026-07-31. Reward is one badge plus 10 Love Hearts once per user/challenge, even if multiple companion pairs complete.'
where not exists (
  select 1
  from public.companion_challenges cc
  where cc.id = '0d92d123-3fbd-48a7-b7f2-ebeee368f660'::uuid
);

-- C. Keep the row idempotent if this SQL is re-run or if the row was created before.
update public.companion_challenges
set
  title = '우리의 신앙 여정 Part 1',
  description = '7월 17일부터 31일까지, 동역자와 매일 함께 말씀 묵상을 완료해보세요.',
  start_date = '2026-07-17'::date,
  end_date = '2026-07-31'::date,
  required_days = 15,
  reward_hearts = 10,
  badge_name = '우리의 신앙 여정 Part 1',
  badge_description = '15일 동안 말씀 안에서 함께 걸어온 동역자 챌린지 배지',
  badge_image_path = '/images/companion-challenges/companion-challenge-1.png',
  status = 'scheduled',
  operator_notes = 'First app-wide companion challenge. Strict condition: both companions must complete Bible Reflection on every date from 2026-07-17 to 2026-07-31. Reward is one badge plus 10 Love Hearts once per user/challenge, even if multiple companion pairs complete.',
  updated_at = now()
where id = '0d92d123-3fbd-48a7-b7f2-ebeee368f660'::uuid;

-- D. Postcheck: expected one row, 15 required days, 10 hearts, scheduled status.
select
  'D. companion challenge 1 row' as section,
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
where id = '0d92d123-3fbd-48a7-b7f2-ebeee368f660'::uuid;

commit;
