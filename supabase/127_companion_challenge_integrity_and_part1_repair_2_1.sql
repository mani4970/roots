-- 127_companion_challenge_integrity_and_part1_repair_2_1.sql
-- Roots companion challenge integrity hardening (safe ZIP 20260810_1958)
--
-- SAFETY: This migration never calls or updates record_bible_reflection_progress,
-- profiles.streak_days, profiles.total_days, profiles.last_checkin, or daily_checkins.
-- Companion challenge remains a separate reward-layer ledger.
--
-- Part 2 relationship rule:
-- - accepted on 2026-08-15 -> 2026-08-15 can count
-- - accepted on 2026-08-16 -> 2026-08-15 can never count retroactively
--
-- Part 1 repair scope:
-- - exactly one audited missing 2026-07-29 ledger row for the verified Part 1 pair
-- - no generic qt_records backfill, because past/catch-up QT must never count
-- - no direct heart/badge award; existing normal claim flow remains authoritative

begin;

alter table public.companions
  add column if not exists accepted_local_date date;

comment on column public.companions.accepted_local_date is
  'Device-local calendar date on which this relationship became accepted. Used only for companion challenge pair eligibility; never for Bible Reflection streak/progress.';

-- Existing accepted relationships are intentionally left NULL here.
-- The current production table has an authenticated UPDATE guard, so an admin SQL
-- backfill would be rejected by design. All challenge functions below safely fall
-- back to responded_at/updated_at/created_at for pre-migration relationships. New
-- acceptances are stamped with the device-local date by the app/trigger.

create or replace function public.normalize_companion_accepted_local_date()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status <> 'accepted' then
    new.accepted_local_date := null;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'accepted' then
    new.accepted_local_date := old.accepted_local_date;
    return new;
  end if;

  if new.accepted_local_date is null then
    new.accepted_local_date := current_date;
  elsif new.accepted_local_date < current_date - 1
     or new.accepted_local_date > current_date + 1 then
    raise exception 'accepted_local_date is outside the current local-date window'
      using errcode = '22007';
  end if;

  return new;
end;
$$;

drop trigger if exists companions_normalize_accepted_local_date on public.companions;
create trigger companions_normalize_accepted_local_date
before insert or update on public.companions
for each row execute function public.normalize_companion_accepted_local_date();

revoke all on function public.normalize_companion_accepted_local_date()
  from public, anon, authenticated;

create or replace function public.get_companion_challenge_status(
  p_partner_id uuid,
  p_today date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.companion_challenges%rowtype;
  v_total_days integer := 0;
  v_user_days integer := 0;
  v_partner_days integer := 0;
  v_pair_days integer := 0;
  v_today_user boolean := false;
  v_today_partner boolean := false;
  v_awarded boolean := false;
  v_display_status text := 'scheduled';
  v_relationship_start_date date;
begin
  if v_user_id is null then
    return jsonb_build_object('has_challenge', false, 'reason', 'not_authenticated');
  end if;

  if p_partner_id is null or p_partner_id = v_user_id then
    return jsonb_build_object('has_challenge', false, 'reason', 'invalid_partner');
  end if;

  select min(
    coalesce(
      c.accepted_local_date,
      coalesce(c.responded_at, c.updated_at, c.created_at)::date
    )
  )
    into v_relationship_start_date
  from public.companions c
  where c.status = 'accepted'
    and (
      (c.requester_id = v_user_id and c.receiver_id = p_partner_id)
      or
      (c.requester_id = p_partner_id and c.receiver_id = v_user_id)
    );

  if v_relationship_start_date is null then
    return jsonb_build_object('has_challenge', false, 'reason', 'not_companions');
  end if;

  select *
    into v_challenge
  from public.companion_challenges cc
  where cc.status in ('scheduled', 'active', 'completed')
    and (
      p_today <= cc.end_date + 7
      or p_today < cc.start_date
    )
  order by
    case
      when p_today between cc.start_date and cc.end_date then 0
      when p_today < cc.start_date then 1
      else 2
    end,
    cc.start_date desc,
    cc.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('has_challenge', false, 'reason', 'no_active_challenge');
  end if;

  v_total_days := greatest(0, (v_challenge.end_date - v_challenge.start_date + 1));

  with challenge_days as (
    select gs::date as day
    from generate_series(
      v_challenge.start_date::timestamp,
      v_challenge.end_date::timestamp,
      interval '1 day'
    ) as gs
  ), day_status as (
    select
      d.day,
      (
        (v_challenge.start_date < date '2026-08-15' or d.day >= v_relationship_start_date)
        and exists (
          select 1
          from public.companion_challenge_daily_completions cdc
          where cdc.challenge_id = v_challenge.id
            and cdc.user_id = v_user_id
            and cdc.completion_date = d.day
        )
      ) as user_done,
      (
        (v_challenge.start_date < date '2026-08-15' or d.day >= v_relationship_start_date)
        and exists (
          select 1
          from public.companion_challenge_daily_completions cdc
          where cdc.challenge_id = v_challenge.id
            and cdc.user_id = p_partner_id
            and cdc.completion_date = d.day
        )
      ) as partner_done
    from challenge_days d
  )
  select
    count(*) filter (where user_done)::integer,
    count(*) filter (where partner_done)::integer,
    count(*) filter (where user_done and partner_done)::integer,
    coalesce(bool_or(user_done) filter (where day = p_today), false),
    coalesce(bool_or(partner_done) filter (where day = p_today), false)
  into v_user_days, v_partner_days, v_pair_days, v_today_user, v_today_partner
  from day_status;

  select exists (
    select 1
    from public.companion_challenge_awards cca
    where cca.challenge_id = v_challenge.id
      and cca.user_id = v_user_id
  ) into v_awarded;

  v_display_status := case
    when v_challenge.status = 'completed' or p_today > v_challenge.end_date then 'completed'
    when p_today < v_challenge.start_date then 'scheduled'
    else 'active'
  end;

  return jsonb_build_object(
    'has_challenge', true,
    'challenge_id', v_challenge.id,
    'title', v_challenge.title,
    'description', v_challenge.description,
    'start_date', v_challenge.start_date,
    'end_date', v_challenge.end_date,
    'required_days', v_challenge.required_days,
    'total_days', v_total_days,
    'reward_hearts', v_challenge.reward_hearts,
    'badge_name', v_challenge.badge_name,
    'badge_description', v_challenge.badge_description,
    'badge_image_path', v_challenge.badge_image_path,
    'status', v_display_status,
    'user_completed_days', coalesce(v_user_days, 0),
    'partner_completed_days', coalesce(v_partner_days, 0),
    'pair_completed_days', coalesce(v_pair_days, 0),
    'today_user_completed', coalesce(v_today_user, false),
    'today_partner_completed', coalesce(v_today_partner, false),
    'today_pair_completed', coalesce(v_today_user, false) and coalesce(v_today_partner, false),
    'is_complete', coalesce(v_pair_days, 0) >= v_challenge.required_days,
    'awarded', coalesce(v_awarded, false),
    'can_claim', coalesce(v_pair_days, 0) >= v_challenge.required_days and coalesce(v_awarded, false) is false
  );
end;
$$;

comment on function public.get_companion_challenge_status(uuid, date) is
  'Returns companion challenge status for an accepted pair. From Part 2 (2026-08-15), pair days count only on/after the pair accepted local date; streak/progress are not involved.';

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
  v_relationship_start_date date;
begin
  if v_user_id is null then
    return jsonb_build_object('awarded', false, 'reason', 'not_authenticated');
  end if;

  if p_partner_id is null or p_partner_id = v_user_id then
    return jsonb_build_object('awarded', false, 'reason', 'invalid_partner');
  end if;

  select min(
    coalesce(
      c.accepted_local_date,
      coalesce(c.responded_at, c.updated_at, c.created_at)::date
    )
  )
    into v_relationship_start_date
  from public.companions c
  where c.status = 'accepted'
    and (
      (c.requester_id = v_user_id and c.receiver_id = p_partner_id)
      or
      (c.requester_id = p_partner_id and c.receiver_id = v_user_id)
    );

  if v_relationship_start_date is null then
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
    and (
      v_challenge.start_date < date '2026-08-15'
      or mine.completion_date >= v_relationship_start_date
    )
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
  'Compatibility claim path. From Part 2 (2026-08-15), pair days count only on/after the pair accepted local date.';

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
            and (
              v_companion_challenge.start_date < date '2026-08-15'
              or mine.completion_date >= relation.relationship_start_date
            )
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
          min(c.created_at) as relationship_created_at,
          min(
            coalesce(
              c.accepted_local_date,
              coalesce(c.responded_at, c.updated_at, c.created_at)::date
            )
          ) as relationship_start_date
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
  'Returns newly paid challenge rewards after the device-local end date. From Part 2 (2026-08-15), companion pair days count only on/after the pair accepted local date.';

revoke all on function public.claim_pending_challenge_rewards(date)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_pending_challenge_rewards(date)
  to authenticated, service_role;

-- Exact Part 1 ledger repair for the single audited pair.
do $$
declare
  v_challenge_id constant uuid := '0d92d123-3fbd-48a7-b7f2-ebeee368f660';
  v_full_ledger_user_id constant uuid := '22abde66-4426-44a4-8da6-ce95e01ab1af';
  v_missing_ledger_user_id constant uuid := 'c59c8408-eb35-414b-96cf-4e56b5ae4487';
  v_completion_date constant date := date '2026-07-29';
  v_qt_record_id uuid;
begin
  if not exists (
    select 1
    from public.companion_challenges cc
    where cc.id = v_challenge_id
      and cc.start_date = date '2026-07-17'
      and cc.end_date = date '2026-07-31'
      and cc.required_days = 15
  ) then
    raise exception 'Part 1 challenge verification failed';
  end if;

  if not exists (
    select 1
    from public.companions c
    where c.status = 'accepted'
      and coalesce(
        c.accepted_local_date,
        coalesce(c.responded_at, c.updated_at, c.created_at)::date
      ) <= date '2026-07-17'
      and (
        (c.requester_id = v_full_ledger_user_id and c.receiver_id = v_missing_ledger_user_id)
        or
        (c.requester_id = v_missing_ledger_user_id and c.receiver_id = v_full_ledger_user_id)
      )
  ) then
    raise exception 'audited Part 1 relationship verification failed';
  end if;

  select qr.id
    into v_qt_record_id
  from public.qt_records qr
  where qr.user_id = v_missing_ledger_user_id
    and qr.date = v_completion_date
    and qr.is_draft = false
    and qr.qt_mode = '6step'
    and qr.reflection_type = 'written'
    and qr.created_at = timestamptz '2026-07-29 21:57:26.925309+00'
    and qr.completed_at = timestamptz '2026-07-29 21:57:26.925309+00';

  if v_qt_record_id is null then
    raise exception 'audited 2026-07-29 QT verification failed';
  end if;

  if not exists (
    select 1
    from public.companion_challenge_daily_completions cdc
    where cdc.challenge_id = v_challenge_id
      and cdc.user_id = v_full_ledger_user_id
      and cdc.completion_date = v_completion_date
  ) then
    raise exception 'matching 2026-07-29 partner ledger verification failed';
  end if;

  insert into public.companion_challenge_daily_completions (
    challenge_id, user_id, completion_date, qt_record_id, completed_at
  ) values (
    v_challenge_id,
    v_missing_ledger_user_id,
    v_completion_date,
    v_qt_record_id,
    timestamptz '2026-07-29 21:57:26.925309+00'
  )
  on conflict (challenge_id, user_id, completion_date) do nothing;
end;
$$;

select
  (
    select count(*)::integer
    from public.companions c
    where c.status = 'accepted'
      and c.accepted_local_date is null
  ) as legacy_accepted_relationships_using_timestamp_fallback,
  exists (
    select 1
    from public.companion_challenge_daily_completions cdc
    where cdc.challenge_id = '0d92d123-3fbd-48a7-b7f2-ebeee368f660'::uuid
      and cdc.user_id = 'c59c8408-eb35-414b-96cf-4e56b5ae4487'::uuid
      and cdc.completion_date = date '2026-07-29'
  ) as missing_user_0729_ledger,
  (
    select count(*)::integer
    from public.companion_challenge_daily_completions mine
    where mine.challenge_id = '0d92d123-3fbd-48a7-b7f2-ebeee368f660'::uuid
      and mine.user_id = '22abde66-4426-44a4-8da6-ce95e01ab1af'::uuid
      and mine.completion_date between date '2026-07-17' and date '2026-07-31'
      and exists (
        select 1
        from public.companion_challenge_daily_completions partner
        where partner.challenge_id = mine.challenge_id
          and partner.user_id = 'c59c8408-eb35-414b-96cf-4e56b5ae4487'::uuid
          and partner.completion_date = mine.completion_date
      )
  ) as audited_pair_days,
  (
    select count(*)::integer
    from public.companion_challenge_awards cca
    where cca.challenge_id = '0d92d123-3fbd-48a7-b7f2-ebeee368f660'::uuid
      and cca.user_id in (
        '22abde66-4426-44a4-8da6-ce95e01ab1af'::uuid,
        'c59c8408-eb35-414b-96cf-4e56b5ae4487'::uuid
      )
  ) as awards_before_normal_auto_claim;

commit;
