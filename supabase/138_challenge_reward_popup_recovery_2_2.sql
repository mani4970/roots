-- 138_challenge_reward_popup_recovery_2_2.sql
-- Recover challenge reward popups that were paid before Home could display them.
--
-- SAFETY:
-- - Does not change challenge eligibility or completion ledgers.
-- - Does not change existing claim RPCs.
-- - Does not award badges or Love Hearts.
-- - Uses the existing seen_at columns only after the user dismisses/confirms.

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
end;
$$;

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
      and award.seen_at is null
  ) pending;
$$;

comment on function public.get_unseen_challenge_rewards() is
  'Returns already-paid companion and group challenge rewards whose popup has not been acknowledged by the authenticated owner.';

create or replace function public.mark_challenge_reward_seen(
  p_reward_type text,
  p_award_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated_count integer := 0;
begin
  if v_user_id is null or p_award_id is null then
    return false;
  end if;

  if p_reward_type = 'companion' then
    update public.companion_challenge_awards
    set seen_at = coalesce(seen_at, now())
    where id = p_award_id
      and user_id = v_user_id;
  elsif p_reward_type = 'group' then
    update public.group_challenge_awards
    set seen_at = coalesce(seen_at, now())
    where id = p_award_id
      and user_id = v_user_id;
  else
    return false;
  end if;

  get diagnostics v_updated_count = row_count;
  return v_updated_count > 0;
end;
$$;

comment on function public.mark_challenge_reward_seen(text, uuid) is
  'Acknowledges one challenge reward popup only when the award belongs to the authenticated user. Does not change rewards or hearts.';

revoke all on function public.get_unseen_challenge_rewards()
  from public, anon, authenticated, service_role;
grant execute on function public.get_unseen_challenge_rewards()
  to authenticated;

revoke all on function public.mark_challenge_reward_seen(text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_challenge_reward_seen(text, uuid)
  to authenticated;

do $$
begin
  if to_regprocedure('public.get_unseen_challenge_rewards()') is null
    or to_regprocedure('public.mark_challenge_reward_seen(text,uuid)') is null
  then
    raise exception 'Challenge reward popup recovery functions were not created';
  end if;

  if has_function_privilege('anon', 'public.get_unseen_challenge_rewards()', 'EXECUTE')
    or has_function_privilege('anon', 'public.mark_challenge_reward_seen(text,uuid)', 'EXECUTE')
  then
    raise exception 'anon must not execute challenge reward popup recovery functions';
  end if;

  if not has_function_privilege('authenticated', 'public.get_unseen_challenge_rewards()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.mark_challenge_reward_seen(text,uuid)', 'EXECUTE')
  then
    raise exception 'authenticated execute grants are missing';
  end if;
end;
$$;

commit;
