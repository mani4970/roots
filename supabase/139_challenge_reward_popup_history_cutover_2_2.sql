-- 139_challenge_reward_popup_history_cutover_2_2.sql
-- Prevent legacy challenge awards from being replayed after popup tracking began.
--
-- The app started persisting challenge reward popup acknowledgements on
-- 2026-09-01. Awards created before that cutover can have seen_at = null even
-- when their popup was already shown, so they must be treated as historical.
--
-- SAFETY:
-- - Does not insert or delete challenge awards.
-- - Does not change badges, Love Hearts, eligibility, or completion ledgers.
-- - Keeps Companion Challenge Part 2 and every future reward recoverable.
-- - Does not affect monthly badge announcements.

begin;

do $$
begin
  if to_regclass('public.companion_challenge_awards') is null
    or to_regclass('public.companion_challenges') is null
    or to_regclass('public.group_challenge_awards') is null
  then
    raise exception 'Challenge reward tables are missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companion_challenge_awards'
      and column_name = 'seen_at'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'group_challenge_awards'
      and column_name = 'seen_at'
  ) then
    raise exception 'Challenge reward seen_at columns are missing';
  end if;

  if to_regprocedure('public.get_unseen_challenge_rewards()') is null then
    raise exception 'Run SQL 138 before SQL 139';
  end if;
end;
$$;

-- Establish the historical baseline. Existing non-null acknowledgements are
-- preserved, and rewards created on/after the cutover are not touched.
update public.companion_challenge_awards
set seen_at = timestamptz '2026-09-01 00:00:00+00'
where seen_at is null
  and (
    awarded_at is null
    or awarded_at < timestamptz '2026-09-01 00:00:00+00'
  );

update public.group_challenge_awards
set seen_at = timestamptz '2026-09-01 00:00:00+00'
where seen_at is null
  and (
    awarded_at is null
    or awarded_at < timestamptz '2026-09-01 00:00:00+00'
  );

-- Defense in depth: even if an old backup contains null acknowledgements,
-- recovery only returns awards created after popup tracking began.
create or replace function public.get_unseen_challenge_rewards()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(pending.reward order by pending.awarded_at, pending.award_id),
    '[]'::jsonb
  )
  from (
    select
      award.id as award_id,
      award.awarded_at,
      jsonb_build_object(
        'reward_type', 'companion',
        'award_id', award.id,
        'challenge_id', award.challenge_id,
        'challenge_title', challenge.title,
        'companion_name', coalesce(companion.name, ''),
        'group_name', '',
        'badge_name', award.badge_name,
        'badge_image_path', award.badge_image_path,
        'reward_hearts', award.hearts_awarded
      ) as reward
    from public.companion_challenge_awards award
    join public.companion_challenges challenge
      on challenge.id = award.challenge_id
    left join public.profiles companion
      on companion.id = award.companion_user_id
    where award.user_id = (select auth.uid())
      and award.awarded_at >= timestamptz '2026-09-01 00:00:00+00'
      and award.seen_at is null

    union all

    select
      award.id as award_id,
      award.awarded_at,
      jsonb_build_object(
        'reward_type', 'group',
        'award_id', award.id,
        'challenge_id', award.challenge_id,
        'challenge_title', award.challenge_title,
        'companion_name', '',
        'group_name', award.group_name,
        'badge_name', award.badge_name,
        'badge_image_path', award.badge_image_path,
        'reward_hearts', award.hearts_awarded
      ) as reward
    from public.group_challenge_awards award
    where award.user_id = (select auth.uid())
      and award.challenge_id is not null
      and award.awarded_at >= timestamptz '2026-09-01 00:00:00+00'
      and award.seen_at is null
  ) pending;
$$;

comment on function public.get_unseen_challenge_rewards() is
  'Returns unacknowledged companion and group challenge rewards created after popup acknowledgement tracking began on 2026-09-01.';

revoke all on function public.get_unseen_challenge_rewards()
  from public, anon, authenticated, service_role;
grant execute on function public.get_unseen_challenge_rewards()
  to authenticated;

do $$
begin
  if exists (
    select 1
    from public.companion_challenge_awards
    where seen_at is null
      and (
        awarded_at is null
        or awarded_at < timestamptz '2026-09-01 00:00:00+00'
      )
  ) or exists (
    select 1
    from public.group_challenge_awards
    where seen_at is null
      and (
        awarded_at is null
        or awarded_at < timestamptz '2026-09-01 00:00:00+00'
      )
  ) then
    raise exception 'Historical challenge reward acknowledgements were not fully backfilled';
  end if;

  if has_function_privilege('anon', 'public.get_unseen_challenge_rewards()', 'EXECUTE') then
    raise exception 'anon must not execute get_unseen_challenge_rewards()';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.get_unseen_challenge_rewards()',
    'EXECUTE'
  ) then
    raise exception 'authenticated execute grant is missing';
  end if;
end;
$$;

commit;
