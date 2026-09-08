-- September 2026: 우리의 묵상 테이프 (data-only operator script).
-- Announcement: Sep 9-10 local dates; challenge: Sep 11-19, all 9 days.
-- Existing accepted-pair, same-day ledger and exactly-once reward RPCs are reused.
-- No table, function, RLS, grant, reflection, progress, or existing reward changes.
-- Run after deploying the accompanying web patch. Safe to run again.

begin;

do $$
begin
  if to_regclass('public.companion_challenges') is null
    or to_regclass('public.companion_challenge_daily_completions') is null
    or to_regclass('public.companion_challenge_awards') is null
    or to_regclass('public.user_campaign_impressions') is null
    or to_regprocedure('public.record_companion_challenge_completion(date,uuid)') is null
    or to_regprocedure('public.get_companion_challenge_status(uuid,date)') is null
    or to_regprocedure('public.claim_pending_challenge_rewards(date)') is null
    or to_regprocedure('public.get_unseen_challenge_rewards()') is null
    or to_regprocedure('public.mark_challenge_reward_seen(text,uuid)') is null
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'companions'
        and column_name = 'accepted_local_date'
    )
  then
    raise exception 'Existing companion challenge / reward-popup prerequisites are missing';
  end if;
end;
$$;

insert into public.companion_challenges (
  id, title, description, start_date, end_date, required_days, reward_hearts,
  badge_name, badge_description, badge_image_path, status, operator_notes
)
values (
  '548e06a4-456f-4ed9-9ea0-4708828fe383'::uuid,
  '우리의 묵상 테이프',
  '9월 11일부터 9월 19일까지 총 9일간, 매일 빠짐없이 동역자끼리 묵상을 나누어보세요!',
  date '2026-09-11', date '2026-09-19', 9, 30,
  '우리의 묵상 테이프',
  '9일 동안 매일 말씀 묵상을 함께 완료한 동역자 챌린지 스페셜 배지',
  '/images/companion-challenges/companion-challenge-3.webp',
  'scheduled',
  'Same accepted companion pair must both complete same-day Bible Reflection on all 9 local dates. Past-date reflections and drafts do not count. One badge and 30 Love Hearts per user/challenge regardless of qualifying pair count. Existing Home auto-claim starts after Sep 19; acknowledgement of either popup button prevents repeats. Campaign key: companion_challenge_3_announcement_20260909.'
)
on conflict (id) do nothing;

-- A conflicting configuration aborts rather than rewriting a live challenge.
do $$
declare
  v_challenge public.companion_challenges%rowtype;
begin
  select * into strict v_challenge
  from public.companion_challenges
  where id = '548e06a4-456f-4ed9-9ea0-4708828fe383'::uuid;
  if v_challenge.title is distinct from '우리의 묵상 테이프'
    or v_challenge.start_date is distinct from date '2026-09-11'
    or v_challenge.end_date is distinct from date '2026-09-19'
    or v_challenge.required_days is distinct from 9
    or v_challenge.reward_hearts is distinct from 30
    or v_challenge.badge_name is distinct from '우리의 묵상 테이프'
    or v_challenge.badge_image_path is distinct from '/images/companion-challenges/companion-challenge-3.webp'
    or v_challenge.status = 'cancelled'
  then
    raise exception 'Companion Challenge 3 conflicts with the approved configuration; no changes committed';
  end if;
end;
$$;

commit;

select title, start_date, end_date,
  end_date - start_date + 1 as calendar_days,
  required_days, reward_hearts, badge_image_path, status
from public.companion_challenges
where id = '548e06a4-456f-4ed9-9ea0-4708828fe383'::uuid;
