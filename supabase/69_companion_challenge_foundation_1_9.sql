-- 69_companion_challenge_foundation_1_9.sql
-- Roots 1.9 companion challenge foundation
--
-- Purpose:
-- - Add app-wide companion Bible Reflection challenges.
-- - A pair day counts only when BOTH companions completed a non-draft Bible Reflection
--   for the actual local app day that the client records.
-- - A user may have multiple companions, but receives the challenge reward only once
--   per challenge when any accepted companion pair completes the requirement.
-- - Rewards are a companion challenge badge plus Love Hearts.
--
-- Safety notes:
-- - Does NOT change Bible Reflection completion/progress/streak logic.
-- - Does NOT change qt_records, daily_checkins, profiles progress fields,
--   watering, garden/ark growth, group challenge claim logic, or existing RLS policies.
-- - Past-date/backfilled reflections are not counted by the app integration; the RPC
--   validates that the recorded reflection date matches the completion date.
-- - No anon grants on new tables or RPCs.
-- - Explicit GRANTs, RLS, and policies are included for Supabase Data API readiness.
-- - This migration creates the foundation only. It does NOT insert/activate a challenge row.

begin;

create table if not exists public.companion_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  description text,
  start_date date not null,
  end_date date not null,
  required_days integer not null default 10 check (required_days > 0),
  reward_hearts integer not null default 10 check (reward_hearts >= 0),
  badge_name text not null,
  badge_description text,
  badge_image_path text,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  operator_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companion_challenges_date_order check (end_date >= start_date),
  constraint companion_challenges_required_days_range check (required_days <= (end_date - start_date + 1))
);

comment on table public.companion_challenges is
  'App-wide companion Bible Reflection challenges. A user receives the reward once per challenge when any accepted companion pair completes the required pair days.';
comment on column public.companion_challenges.required_days is
  'Number of dates in the challenge window where both companions must complete a same-day Bible Reflection.';
comment on column public.companion_challenges.reward_hearts is
  'Love Hearts awarded to each successful companion challenge user.';
comment on column public.companion_challenges.badge_image_path is
  'Operator-managed badge image path or URL. App users do not upload badge images.';

create index if not exists companion_challenges_status_dates_idx
  on public.companion_challenges (status, start_date, end_date);

alter table public.companion_challenges enable row level security;

drop policy if exists "roots_companion_challenges_select_authenticated" on public.companion_challenges;
create policy "roots_companion_challenges_select_authenticated"
on public.companion_challenges
for select
to authenticated
using (status in ('scheduled', 'active', 'completed'));

revoke all privileges on table public.companion_challenges from public;
revoke all privileges on table public.companion_challenges from anon;
revoke all privileges on table public.companion_challenges from authenticated;
revoke all privileges on table public.companion_challenges from service_role;

grant select on table public.companion_challenges to authenticated;
grant select, insert, update, delete on table public.companion_challenges to service_role;

create table if not exists public.companion_challenge_daily_completions (
  challenge_id uuid not null references public.companion_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completion_date date not null,
  qt_record_id uuid references public.qt_records(id) on delete set null,
  completed_at timestamptz not null default now(),
  primary key (challenge_id, user_id, completion_date)
);

comment on table public.companion_challenge_daily_completions is
  'Per-user challenge-day ledger. Rows are inserted only for same-day non-draft Bible Reflection completions during an active companion challenge window.';
comment on column public.companion_challenge_daily_completions.completion_date is
  'The local app date that the user completed Bible Reflection. This must match qt_records.date.';

create index if not exists companion_challenge_daily_completions_user_idx
  on public.companion_challenge_daily_completions (user_id, completion_date desc);

create index if not exists companion_challenge_daily_completions_challenge_date_idx
  on public.companion_challenge_daily_completions (challenge_id, completion_date);

alter table public.companion_challenge_daily_completions enable row level security;

drop policy if exists "roots_companion_challenge_daily_completions_select_own" on public.companion_challenge_daily_completions;
create policy "roots_companion_challenge_daily_completions_select_own"
on public.companion_challenge_daily_completions
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all privileges on table public.companion_challenge_daily_completions from public;
revoke all privileges on table public.companion_challenge_daily_completions from anon;
revoke all privileges on table public.companion_challenge_daily_completions from authenticated;
revoke all privileges on table public.companion_challenge_daily_completions from service_role;

grant select on table public.companion_challenge_daily_completions to authenticated;
grant select, insert, update, delete on table public.companion_challenge_daily_completions to service_role;

create table if not exists public.companion_challenge_awards (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.companion_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  companion_user_id uuid references public.profiles(id) on delete set null,
  badge_name text not null,
  badge_description text,
  badge_image_path text,
  hearts_awarded integer not null default 0 check (hearts_awarded >= 0),
  awarded_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (challenge_id, user_id)
);

comment on table public.companion_challenge_awards is
  'Badges and Love Heart rewards awarded for completing an app-wide companion challenge with any accepted companion.';
comment on column public.companion_challenge_awards.companion_user_id is
  'The companion with whom this user first completed the challenge. Reward remains one per challenge even if other pairs also complete it.';

create index if not exists companion_challenge_awards_user_awarded_idx
  on public.companion_challenge_awards (user_id, awarded_at desc);

create index if not exists companion_challenge_awards_challenge_idx
  on public.companion_challenge_awards (challenge_id, user_id);

alter table public.companion_challenge_awards enable row level security;

drop policy if exists "roots_companion_challenge_awards_select_own" on public.companion_challenge_awards;
create policy "roots_companion_challenge_awards_select_own"
on public.companion_challenge_awards
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all privileges on table public.companion_challenge_awards from public;
revoke all privileges on table public.companion_challenge_awards from anon;
revoke all privileges on table public.companion_challenge_awards from authenticated;
revoke all privileges on table public.companion_challenge_awards from service_role;

grant select on table public.companion_challenge_awards to authenticated;
grant select, insert, update, delete on table public.companion_challenge_awards to service_role;

-- Extend the Love Hearts ledger source type for companion challenge rewards.
-- love_heart_events.source_type is a text column with a CHECK constraint, not a Postgres enum.
alter table public.love_heart_events
  drop constraint if exists love_heart_events_source_type_check;

alter table public.love_heart_events
  add constraint love_heart_events_source_type_check
  check (source_type in (
    'qt_reaction',
    'prayer_intercession',
    'answered_prayer_gratitude',
    'companion_challenge'
  ));

comment on column public.love_heart_events.source_type is
  'Reward source: qt_reaction, prayer_intercession, answered_prayer_gratitude, or companion_challenge.';

create or replace function public.record_companion_challenge_completion(
  p_completion_date date,
  p_qt_record_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reflection_exists boolean := false;
  v_inserted_count integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('recorded', false, 'reason', 'not_authenticated');
  end if;

  if p_completion_date is null then
    return jsonb_build_object('recorded', false, 'reason', 'missing_completion_date');
  end if;

  -- Guardrail against intentionally backfilled challenge credit. The client only calls this
  -- for its local current day. A +/-1 day window keeps edge cases safe for users around UTC
  -- midnight or different device time zones without allowing old catch-up records.
  if p_completion_date < current_date - 1 or p_completion_date > current_date + 1 then
    return jsonb_build_object('recorded', false, 'reason', 'not_current_app_day');
  end if;

  if p_qt_record_id is not null then
    select exists (
      select 1
      from public.qt_records qr
      where qr.id = p_qt_record_id
        and qr.user_id = v_user_id
        and qr.is_draft = false
        and qr.date = p_completion_date
    ) into v_reflection_exists;
  else
    select exists (
      select 1
      from public.qt_records qr
      where qr.user_id = v_user_id
        and qr.is_draft = false
        and qr.date = p_completion_date
    ) into v_reflection_exists;
  end if;

  if coalesce(v_reflection_exists, false) is not true then
    return jsonb_build_object('recorded', false, 'reason', 'reflection_not_found');
  end if;

  insert into public.companion_challenge_daily_completions (
    challenge_id,
    user_id,
    completion_date,
    qt_record_id,
    completed_at
  )
  select
    cc.id,
    v_user_id,
    p_completion_date,
    p_qt_record_id,
    now()
  from public.companion_challenges cc
  where cc.status in ('scheduled', 'active')
    and p_completion_date between cc.start_date and cc.end_date
  on conflict (challenge_id, user_id, completion_date) do nothing;

  get diagnostics v_inserted_count = row_count;

  return jsonb_build_object(
    'recorded', v_inserted_count > 0,
    'recorded_count', v_inserted_count
  );
end;
$$;

comment on function public.record_companion_challenge_completion(date, uuid) is
  'Records a same-day Bible Reflection completion for active companion challenges. Best-effort companion challenge ledger only; does not affect progress/streak.';

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
begin
  if v_user_id is null then
    return jsonb_build_object('has_challenge', false, 'reason', 'not_authenticated');
  end if;

  if p_partner_id is null or p_partner_id = v_user_id then
    return jsonb_build_object('has_challenge', false, 'reason', 'invalid_partner');
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
      exists (
        select 1
        from public.companion_challenge_daily_completions cdc
        where cdc.challenge_id = v_challenge.id
          and cdc.user_id = v_user_id
          and cdc.completion_date = d.day
      ) as user_done,
      exists (
        select 1
        from public.companion_challenge_daily_completions cdc
        where cdc.challenge_id = v_challenge.id
          and cdc.user_id = p_partner_id
          and cdc.completion_date = d.day
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
  'Returns the active companion challenge status for an accepted companion pair. Reads pair progress through a SECURITY DEFINER RPC so partner-day status is only exposed inside the accepted relationship.';

create or replace function public.claim_companion_challenge_reward(
  p_challenge_id uuid,
  p_partner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.companion_challenges%rowtype;
  v_pair_days integer := 0;
  v_existing public.companion_challenge_awards%rowtype;
  v_inserted_user_award_count integer := 0;
  v_hearts_for_user integer := 0;
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
      exists (
        select 1
        from public.companion_challenge_daily_completions cdc
        where cdc.challenge_id = v_challenge.id
          and cdc.user_id = v_user_id
          and cdc.completion_date = d.day
      ) as user_done,
      exists (
        select 1
        from public.companion_challenge_daily_completions cdc
        where cdc.challenge_id = v_challenge.id
          and cdc.user_id = p_partner_id
          and cdc.completion_date = d.day
      ) as partner_done
    from challenge_days d
  )
  select count(*) filter (where user_done and partner_done)::integer
    into v_pair_days
  from day_status;

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
      'partner_id', p_partner_id,
      'badge_name', v_existing.badge_name,
      'badge_image_path', v_existing.badge_image_path,
      'reward_hearts', 0
    );
  end if;

  with award_candidates as (
    select v_user_id as user_id, p_partner_id as companion_user_id
    union all
    select p_partner_id as user_id, v_user_id as companion_user_id
  ), inserted_awards as (
    insert into public.companion_challenge_awards (
      challenge_id,
      user_id,
      companion_user_id,
      badge_name,
      badge_description,
      badge_image_path,
      hearts_awarded
    )
    select
      v_challenge.id,
      ac.user_id,
      ac.companion_user_id,
      coalesce(nullif(v_challenge.badge_name, ''), v_challenge.title),
      v_challenge.badge_description,
      v_challenge.badge_image_path,
      v_challenge.reward_hearts
    from award_candidates ac
    on conflict (challenge_id, user_id) do nothing
    returning user_id, companion_user_id, hearts_awarded
  ), inserted_events as (
    insert into public.love_heart_events (
      user_id,
      source_type,
      source_id,
      target_owner_id,
      amount
    )
    select
      ia.user_id,
      'companion_challenge',
      v_challenge.id,
      ia.companion_user_id,
      ia.hearts_awarded
    from inserted_awards ia
    where ia.hearts_awarded > 0
    on conflict (user_id, source_type, source_id) do nothing
    returning user_id, amount
  ), wallet_totals as (
    select user_id, sum(amount)::integer as amount
    from inserted_events
    group by user_id
  ), wallet_updates as (
    insert into public.love_heart_wallets as wallet (
      user_id,
      balance,
      lifetime_earned,
      created_at,
      updated_at
    )
    select
      wt.user_id,
      wt.amount,
      wt.amount,
      now(),
      now()
    from wallet_totals wt
    on conflict (user_id) do update
    set
      balance = wallet.balance + excluded.balance,
      lifetime_earned = wallet.lifetime_earned + excluded.lifetime_earned,
      updated_at = now()
    returning user_id
  )
  select
    count(*) filter (where ia.user_id = v_user_id)::integer,
    coalesce(sum(ie.amount) filter (where ie.user_id = v_user_id), 0)::integer
  into v_inserted_user_award_count, v_hearts_for_user
  from inserted_awards ia
  left join inserted_events ie on ie.user_id = ia.user_id;

  if coalesce(v_inserted_user_award_count, 0) = 0 then
    return jsonb_build_object(
      'awarded', true,
      'already_awarded', true,
      'challenge_id', v_challenge.id,
      'challenge_title', v_challenge.title,
      'partner_id', p_partner_id,
      'badge_name', coalesce(nullif(v_challenge.badge_name, ''), v_challenge.title),
      'badge_image_path', v_challenge.badge_image_path,
      'reward_hearts', 0
    );
  end if;

  return jsonb_build_object(
    'awarded', true,
    'already_awarded', false,
    'challenge_id', v_challenge.id,
    'challenge_title', v_challenge.title,
    'partner_id', p_partner_id,
    'badge_name', coalesce(nullif(v_challenge.badge_name, ''), v_challenge.title),
    'badge_image_path', v_challenge.badge_image_path,
    'reward_hearts', coalesce(v_hearts_for_user, v_challenge.reward_hearts),
    'pair_completed_days', coalesce(v_pair_days, 0),
    'required_days', v_challenge.required_days
  );
end;
$$;

comment on function public.claim_companion_challenge_reward(uuid, uuid) is
  'Awards a companion challenge badge and Love Hearts once per user/challenge when any accepted companion pair completes the required same-day pair completions.';

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- Revoke PUBLIC/anon explicitly before adding only the required roles.
revoke execute on function public.record_companion_challenge_completion(date, uuid) from public;
revoke execute on function public.record_companion_challenge_completion(date, uuid) from anon;
revoke execute on function public.record_companion_challenge_completion(date, uuid) from authenticated;
revoke execute on function public.record_companion_challenge_completion(date, uuid) from service_role;
grant execute on function public.record_companion_challenge_completion(date, uuid) to authenticated;
grant execute on function public.record_companion_challenge_completion(date, uuid) to service_role;

revoke execute on function public.get_companion_challenge_status(uuid, date) from public;
revoke execute on function public.get_companion_challenge_status(uuid, date) from anon;
revoke execute on function public.get_companion_challenge_status(uuid, date) from authenticated;
revoke execute on function public.get_companion_challenge_status(uuid, date) from service_role;
grant execute on function public.get_companion_challenge_status(uuid, date) to authenticated;
grant execute on function public.get_companion_challenge_status(uuid, date) to service_role;

revoke execute on function public.claim_companion_challenge_reward(uuid, uuid) from public;
revoke execute on function public.claim_companion_challenge_reward(uuid, uuid) from anon;
revoke execute on function public.claim_companion_challenge_reward(uuid, uuid) from authenticated;
revoke execute on function public.claim_companion_challenge_reward(uuid, uuid) from service_role;
grant execute on function public.claim_companion_challenge_reward(uuid, uuid) to authenticated;
grant execute on function public.claim_companion_challenge_reward(uuid, uuid) to service_role;

commit;
