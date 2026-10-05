-- October 2026 Companion Challenge (data-only operator script).
-- Announcement: Oct 5-6 local dates; challenge: Oct 7-16, all 10 days.
-- Existing accepted-pair, same-day ledger and exactly-once reward RPCs are reused.
-- No table, function, RLS, grant, reflection, progress, or existing reward changes.
-- Safe to run again.

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
    or to_regprocedure('public.get_my_companion_challenge_completion_partners(uuid)') is null
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
  '5fb6a1e5-d0b7-4531-b42d-bfa7cbd721b4'::uuid,
  '10월 동역자 챌린지',
  '10월 7-16일까지 총 10일간, 매일 빠짐없이 묵상을 나누어보세요!',
  date '2026-10-07', date '2026-10-16', 10, 20,
  '10월 동역자 챌린지',
  '10일 동안 매일 말씀 묵상을 함께 완료한 동역자 챌린지 스페셜 배지',
  '/images/companion-challenges/companion-challenge-4.webp',
  'scheduled',
  'Same accepted companion pair must both complete same-day Bible Reflection on all 10 local dates. Past-date reflections and drafts do not count. One badge and 20 Love Hearts per user/challenge regardless of qualifying pair count. Existing Home auto-claim starts after Oct 16; acknowledgement of either completion-popup button prevents repeats. Profile badge detail lists all completion partners through get_my_companion_challenge_completion_partners. Campaign key: companion_challenge_4_announcement_20261005.'
)
on conflict (id) do nothing;

-- A conflicting configuration aborts rather than rewriting a live challenge.
do $$
declare
  v_challenge public.companion_challenges%rowtype;
begin
  select * into strict v_challenge
  from public.companion_challenges
  where id = '5fb6a1e5-d0b7-4531-b42d-bfa7cbd721b4'::uuid;

  if v_challenge.title is distinct from '10월 동역자 챌린지'
    or v_challenge.start_date is distinct from date '2026-10-07'
    or v_challenge.end_date is distinct from date '2026-10-16'
    or v_challenge.description is distinct from '10월 7-16일까지 총 10일간, 매일 빠짐없이 묵상을 나누어보세요!'
    or v_challenge.required_days is distinct from 10
    or v_challenge.reward_hearts is distinct from 20
    or v_challenge.badge_name is distinct from '10월 동역자 챌린지'
    or v_challenge.badge_image_path is distinct from '/images/companion-challenges/companion-challenge-4.webp'
    or v_challenge.status = 'cancelled'
  then
    raise exception 'October Companion Challenge conflicts with the approved configuration; no changes committed';
  end if;
end;
$$;

commit;

select title, start_date, end_date,
  end_date - start_date + 1 as calendar_days,
  required_days, reward_hearts, badge_image_path, status
from public.companion_challenges
where id = '5fb6a1e5-d0b7-4531-b42d-bfa7cbd721b4'::uuid;
