-- Roots 2.1: pay completed group/companion challenge rewards from Home.
--
-- Behavior:
-- - The client passes the device-local date.
-- - A challenge is claimable only after its end date.
-- - Users who already have an award row are ignored and are never returned again.
-- - Companion rewards are paid per user. One companion can no longer pay the
--   other companion's award before that person opens the app.
-- - Existing award rows, badge data, Love Heart ledgers, reflection progress,
--   streaks, reward maps, and watering are not modified.

begin;

do $$
begin
  if to_regclass('public.profiles') is null
    or to_regclass('public.qt_records') is null
    or to_regclass('public.groups') is null
    or to_regclass('public.group_challenges') is null
    or to_regclass('public.group_challenge_participants') is null
    or to_regclass('public.group_challenge_awards') is null
    or to_regclass('public.companions') is null
    or to_regclass('public.companion_challenges') is null
    or to_regclass('public.companion_challenge_daily_completions') is null
    or to_regclass('public.companion_challenge_awards') is null
    or to_regclass('public.love_heart_events') is null
    or to_regclass('public.love_heart_wallets') is null
  then
    raise exception 'Roots challenge reward prerequisites are missing';
  end if;
end;
$$;

-- Keep the old detail-screen RPC safe for a briefly cached older web client.
-- It now pays only the caller and only after the challenge has ended.
create or replace function public.claim_companion_challenge_reward(
  p_challenge_id uuid,
  p_partner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.companion_challenges%rowtype;
  v_pair_days integer := 0;
  v_existing public.companion_challenge_awards%rowtype;
  v_award public.companion_challenge_awards%rowtype;
  v_heart_amount integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('awarded', false, 'reason', 'not_authenticated');
  end if;

  if p_partner_id is null or p_partner_id = v_user_id then
    return jsonb_build_object('awarded', false, 'reason', 'invalid_partner');
  end if;

  if not exists (
    select 1
    from public.companions c
    where c.status = 'accepted'
      and (
        (c.requester_id = v_user_id and c.receiver_id = p_partner_id)
        or
        (c.requester_id = p_partner_id and c.receiver_id = v_user_id)
      )
  ) then
    return jsonb_build_object('awarded', false, 'reason', 'not_companions');
  end if;

  select *
    into v_challenge
  from public.companion_challenges cc
  where cc.id = p_challenge_id
    and cc.status <> 'cancelled';

  if not found then
    return jsonb_build_object('awarded', false, 'reason', 'challenge_not_found');
  end if;

  if current_date <= v_challenge.end_date then
    return jsonb_build_object('awarded', false, 'reason', 'challenge_not_finished');
  end if;

  select count(*)::integer
    into v_pair_days
  from public.companion_challenge_daily_completions mine
  where mine.challenge_id = v_challenge.id
    and mine.user_id = v_user_id
    and mine.completion_date between v_challenge.start_date and v_challenge.end_date
    and exists (
      select 1
      from public.companion_challenge_daily_completions partner
      where partner.challenge_id = mine.challenge_id
        and partner.user_id = p_partner_id
        and partner.completion_date = mine.completion_date
    );

  if coalesce(v_pair_days, 0) < v_challenge.required_days then
    return jsonb_build_object(
      'awarded', false,
      'reason', 'not_completed',
      'pair_completed_days', coalesce(v_pair_days, 0),
      'required_days', v_challenge.required_days
    );
  end if;

  select *
    into v_existing
  from public.companion_challenge_awards cca
  where cca.challenge_id = v_challenge.id
    and cca.user_id = v_user_id;

  if found then
    return jsonb_build_object(
      'awarded', true,
      'already_awarded', true,
      'award_id', v_existing.id,
      'challenge_id', v_challenge.id,
      'challenge_title', v_challenge.title,
      'partner_id', coalesce(v_existing.companion_user_id, p_partner_id),
      'badge_name', v_existing.badge_name,
      'badge_image_path', v_existing.badge_image_path,
      'reward_hearts', 0
    );
  end if;

  v_award := null;
  insert into public.companion_challenge_awards (
    challenge_id,
    user_id,
    companion_user_id,
    badge_name,
    badge_description,
    badge_image_path,
    hearts_awarded
  ) values (
    v_challenge.id,
    v_user_id,
    p_partner_id,
    coalesce(nullif(v_challenge.badge_name, ''), v_challenge.title),
    v_challenge.badge_description,
    v_challenge.badge_image_path,
    v_challenge.reward_hearts
  )
  on conflict (challenge_id, user_id) do nothing
  returning * into v_award;

  if v_award.id is null then
    select *
      into v_existing
    from public.companion_challenge_awards cca
    where cca.challenge_id = v_challenge.id
      and cca.user_id = v_user_id;

    return jsonb_build_object(
      'awarded', true,
      'already_awarded', true,
      'award_id', v_existing.id,
      'challenge_id', v_challenge.id,
      'challenge_title', v_challenge.title,
      'partner_id', coalesce(v_existing.companion_user_id, p_partner_id),
      'badge_name', v_existing.badge_name,
      'badge_image_path', v_existing.badge_image_path,
      'reward_hearts', 0
    );
  end if;

  if v_challenge.reward_hearts > 0 then
    insert into public.love_heart_events (
      user_id,
      source_type,
      source_id,
      target_owner_id,
      amount
    ) values (
      v_user_id,
      'companion_challenge',
      v_challenge.id,
      p_partner_id,
      v_challenge.reward_hearts
    )
    on conflict (user_id, source_type, source_id) do nothing
    returning amount into v_heart_amount;

    if coalesce(v_heart_amount, 0) > 0 then
      insert into public.love_heart_wallets as wallet (
        user_id,
        balance,
        lifetime_earned,
        created_at,
        updated_at
      ) values (
        v_user_id,
        v_heart_amount,
        v_heart_amount,
        now(),
        now()
      )
      on conflict (user_id) do update
      set
        balance = wallet.balance + excluded.balance,
        lifetime_earned = wallet.lifetime_earned + excluded.lifetime_earned,
        updated_at = now();
    end if;
  end if;

  return jsonb_build_object(
    'awarded', true,
    'already_awarded', false,
    'award_id', v_award.id,
    'challenge_id', v_challenge.id,
    'challenge_title', v_challenge.title,
    'partner_id', p_partner_id,
    'badge_name', v_award.badge_name,
    'badge_image_path', v_award.badge_image_path,
    'reward_hearts', coalesce(v_heart_amount, 0),
    'pair_completed_days', coalesce(v_pair_days, 0),
    'required_days', v_challenge.required_days
  );
end;
$$;

comment on function public.claim_companion_challenge_reward(uuid, uuid) is
  'Compatibility claim path: after the challenge ends, awards only the authenticated caller once.';

revoke all on function public.claim_companion_challenge_reward(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_companion_challenge_reward(uuid, uuid)
  to authenticated, service_role;

create or replace function public.claim_pending_challenge_rewards(
  p_today date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rewards jsonb := '[]'::jsonb;
  v_companion_challenge public.companion_challenges%rowtype;
  v_companion_award public.companion_challenge_awards%rowtype;
  v_partner_id uuid;
  v_partner_name text;
  v_pair_days integer := 0;
  v_heart_amount integer := 0;
  v_group_challenge public.group_challenges%rowtype;
  v_group_award public.group_challenge_awards%rowtype;
  v_group_name text;
  v_group_total_days integer := 0;
  v_group_done_days integer := 0;
begin
  if v_user_id is null or p_today is null then
    return v_rewards;
  end if;

  -- Device-local dates can differ from the database date by one day around UTC
  -- midnight. Reject wider values so clients cannot claim a future challenge.
  if p_today < current_date - 1 or p_today > current_date + 1 then
    return v_rewards;
  end if;

  for v_companion_challenge in
    select cc.*
    from public.companion_challenges cc
    where cc.status <> 'cancelled'
      and p_today > cc.end_date
      and not exists (
        select 1
        from public.companion_challenge_awards cca
        where cca.challenge_id = cc.id
          and cca.user_id = v_user_id
      )
    order by cc.end_date, cc.created_at, cc.id
  loop
    v_partner_id := null;
    v_partner_name := '';
    v_pair_days := 0;

    select candidate.partner_id, candidate.pair_days
      into v_partner_id, v_pair_days
    from (
      select
        relation.partner_id,
        relation.relationship_created_at,
        (
          select count(*)::integer
          from public.companion_challenge_daily_completions mine
          where mine.challenge_id = v_companion_challenge.id
            and mine.user_id = v_user_id
            and mine.completion_date between v_companion_challenge.start_date and v_companion_challenge.end_date
            and exists (
              select 1
              from public.companion_challenge_daily_completions partner
              where partner.challenge_id = mine.challenge_id
                and partner.user_id = relation.partner_id
                and partner.completion_date = mine.completion_date
            )
        ) as pair_days
      from (
        select
          case
            when c.requester_id = v_user_id then c.receiver_id
            else c.requester_id
          end as partner_id,
          min(c.created_at) as relationship_created_at
        from public.companions c
        where c.status = 'accepted'
          and (c.requester_id = v_user_id or c.receiver_id = v_user_id)
        group by case
          when c.requester_id = v_user_id then c.receiver_id
          else c.requester_id
        end
      ) relation
    ) candidate
    where candidate.pair_days >= v_companion_challenge.required_days
    order by
      candidate.pair_days desc,
      candidate.relationship_created_at,
      candidate.partner_id
    limit 1;

    if v_partner_id is null then
      continue;
    end if;

    v_companion_award := null;
    insert into public.companion_challenge_awards (
      challenge_id,
      user_id,
      companion_user_id,
      badge_name,
      badge_description,
      badge_image_path,
      hearts_awarded
    ) values (
      v_companion_challenge.id,
      v_user_id,
      v_partner_id,
      coalesce(nullif(v_companion_challenge.badge_name, ''), v_companion_challenge.title),
      v_companion_challenge.badge_description,
      v_companion_challenge.badge_image_path,
      v_companion_challenge.reward_hearts
    )
    on conflict (challenge_id, user_id) do nothing
    returning * into v_companion_award;

    if v_companion_award.id is null then
      continue;
    end if;

    v_heart_amount := 0;
    if v_companion_challenge.reward_hearts > 0 then
      insert into public.love_heart_events (
        user_id,
        source_type,
        source_id,
        target_owner_id,
        amount
      ) values (
        v_user_id,
        'companion_challenge',
        v_companion_challenge.id,
        v_partner_id,
        v_companion_challenge.reward_hearts
      )
      on conflict (user_id, source_type, source_id) do nothing
      returning amount into v_heart_amount;

      if coalesce(v_heart_amount, 0) > 0 then
        insert into public.love_heart_wallets as wallet (
          user_id,
          balance,
          lifetime_earned,
          created_at,
          updated_at
        ) values (
          v_user_id,
          v_heart_amount,
          v_heart_amount,
          now(),
          now()
        )
        on conflict (user_id) do update
        set
          balance = wallet.balance + excluded.balance,
          lifetime_earned = wallet.lifetime_earned + excluded.lifetime_earned,
          updated_at = now();
      end if;
    end if;

    select coalesce(p.name, '')
      into v_partner_name
    from public.profiles p
    where p.id = v_partner_id;

    v_rewards := v_rewards || jsonb_build_array(
      jsonb_build_object(
        'reward_type', 'companion',
        'award_id', v_companion_award.id,
        'challenge_id', v_companion_challenge.id,
        'challenge_title', v_companion_challenge.title,
        'companion_name', coalesce(v_partner_name, ''),
        'group_name', '',
        'badge_name', v_companion_award.badge_name,
        'badge_image_path', v_companion_award.badge_image_path,
        'reward_hearts', coalesce(v_heart_amount, 0)
      )
    );
  end loop;

  for v_group_challenge in
    select gc.*
    from public.group_challenges gc
    where gc.status <> 'cancelled'
      and p_today > gc.end_date
      and exists (
        select 1
        from public.group_challenge_participants gcp
        where gcp.challenge_id = gc.id
          and gcp.user_id = v_user_id
      )
      and not exists (
        select 1
        from public.group_challenge_awards gca
        where gca.challenge_id = gc.id
          and gca.user_id = v_user_id
      )
    order by gc.end_date, gc.created_at, gc.id
  loop
    v_group_total_days := greatest(
      0,
      v_group_challenge.end_date - v_group_challenge.start_date + 1
    );

    select count(distinct qr.date)::integer
      into v_group_done_days
    from public.qt_records qr
    where qr.user_id = v_user_id
      and qr.is_draft = false
      and qr.date between v_group_challenge.start_date and v_group_challenge.end_date;

    if v_group_total_days = 0
      or coalesce(v_group_done_days, 0) < v_group_total_days
    then
      continue;
    end if;

    select coalesce(g.name, '')
      into v_group_name
    from public.groups g
    where g.id = v_group_challenge.group_id;

    v_group_award := null;
    insert into public.group_challenge_awards (
      challenge_id,
      group_id,
      user_id,
      badge_name,
      badge_description,
      badge_image_path,
      challenge_title,
      group_name
    ) values (
      v_group_challenge.id,
      v_group_challenge.group_id,
      v_user_id,
      coalesce(nullif(v_group_challenge.badge_name, ''), v_group_challenge.title),
      v_group_challenge.badge_description,
      v_group_challenge.badge_image_path,
      v_group_challenge.title,
      coalesce(v_group_name, '')
    )
    on conflict (challenge_id, user_id) do nothing
    returning * into v_group_award;

    if v_group_award.id is null then
      continue;
    end if;

    v_rewards := v_rewards || jsonb_build_array(
      jsonb_build_object(
        'reward_type', 'group',
        'award_id', v_group_award.id,
        'challenge_id', v_group_challenge.id,
        'challenge_title', v_group_award.challenge_title,
        'companion_name', '',
        'group_name', v_group_award.group_name,
        'badge_name', v_group_award.badge_name,
        'badge_image_path', v_group_award.badge_image_path,
        'reward_hearts', 0
      )
    );
  end loop;

  return v_rewards;
end;
$$;

comment on function public.claim_pending_challenge_rewards(date) is
  'Returns only challenge rewards newly paid to the authenticated user after the device-local end date. Existing awards are omitted.';

revoke all on function public.claim_pending_challenge_rewards(date)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_pending_challenge_rewards(date)
  to authenticated, service_role;

do $$
begin
  if to_regprocedure('public.claim_pending_challenge_rewards(date)') is null then
    raise exception 'claim_pending_challenge_rewards(date) was not created';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.claim_pending_challenge_rewards(date)',
    'EXECUTE'
  ) then
    raise exception 'authenticated EXECUTE grant is missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.claim_pending_challenge_rewards(date)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute claim_pending_challenge_rewards(date)';
  end if;
end;
$$;

commit;
