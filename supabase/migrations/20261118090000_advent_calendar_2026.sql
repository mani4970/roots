-- Roots Advent Calendar 2026. Apply before releasing the matching app code.
-- An on-time daily reflection is recorded separately from streak and progress.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';

create schema if not exists roots_advent_private;
revoke all on schema roots_advent_private from public, anon, authenticated, service_role;
grant usage on schema roots_advent_private to authenticated;

create table if not exists roots_advent_private.completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day integer not null check (day between 1 and 24),
  qt_record_id uuid references public.qt_records(id) on delete set null,
  completed_at timestamptz not null,
  utc_offset_minutes integer not null check (utc_offset_minutes between -840 and 840),
  primary key (user_id, day),
  unique (qt_record_id)
);

create table if not exists roots_advent_private.claims (
  id uuid not null unique default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day integer not null check (day between 1 and 24),
  reward_type text not null check (reward_type in ('hearts', 'item', 'verse', 'badge')),
  heart_count integer,
  item_key text,
  claimed_at timestamptz not null default now(),
  primary key (user_id, day),
  check ((reward_type = 'hearts' and heart_count is not null and heart_count > 0)
    or (reward_type <> 'hearts' and heart_count is null)),
  check ((reward_type = 'item') = (item_key is not null)),
  check (reward_type <> 'badge' or day = 24)
);

alter table roots_advent_private.completions enable row level security;
alter table roots_advent_private.claims enable row level security;
revoke all on roots_advent_private.completions, roots_advent_private.claims
  from public, anon, authenticated, service_role;

create or replace function roots_advent_private.current_owner(p_expected_user_id uuid)
returns uuid language plpgsql stable security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_expected_user_id is distinct from v_user_id then
    raise exception 'owner_changed' using errcode = '42501';
  end if;
  return v_user_id;
end;
$$;

create or replace function roots_advent_private.device_date(
  p_utc_offset_minutes integer, p_time timestamptz
) returns date language plpgsql immutable security invoker set search_path = '' as $$
begin
  if p_utc_offset_minutes is null or p_utc_offset_minutes not between -840 and 840 then
    raise exception 'invalid_utc_offset' using errcode = '22023';
  end if;
  -- JavaScript Date.getTimezoneOffset() measures the minutes from local time to UTC.
  return ((p_time at time zone 'UTC') - make_interval(mins => p_utc_offset_minutes))::date;
end;
$$;

create or replace function roots_advent_private.claim_json(p_claim roots_advent_private.claims)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('day', p_claim.day, 'reward_type', p_claim.reward_type,
    'heart_count', p_claim.heart_count, 'item_key', p_claim.item_key, 'claimed_at', p_claim.claimed_at);
$$;

create or replace function roots_advent_private.record_advent_completion(
  p_completion_date date, p_qt_record_id uuid, p_utc_offset_minutes integer, p_expected_user_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := roots_advent_private.current_owner(p_expected_user_id);
  v_today date := roots_advent_private.device_date(p_utc_offset_minutes, statement_timestamp());
  v_record record;
begin
  if p_completion_date is null or p_qt_record_id is null then
    return jsonb_build_object('recorded', false, 'reason', 'invalid_proof');
  end if;
  if p_completion_date not between date '2026-12-01' and date '2026-12-24' then
    return jsonb_build_object('recorded', false, 'reason', 'outside_event');
  end if;
  select q.date, q.is_draft, q.completed_at into v_record
    from public.qt_records q where q.id = p_qt_record_id and q.user_id = v_user_id;
  if not found then return jsonb_build_object('recorded', false, 'reason', 'reflection_not_found'); end if;
  if v_record.is_draft is distinct from false or v_record.completed_at is null then
    return jsonb_build_object('recorded', false, 'reason', 'not_completed');
  end if;
  if v_record.date is distinct from p_completion_date or p_completion_date > v_today
    or v_record.completed_at > statement_timestamp()
    or roots_advent_private.device_date(p_utc_offset_minutes, v_record.completed_at) <> p_completion_date then
    return jsonb_build_object('recorded', false, 'reason', 'not_same_local_day');
  end if;
  insert into roots_advent_private.completions (user_id, day, qt_record_id, completed_at, utc_offset_minutes)
    values (v_user_id, p_completion_date - date '2026-12-01' + 1, p_qt_record_id, v_record.completed_at, p_utc_offset_minutes)
    on conflict do nothing;
  return jsonb_build_object('recorded', true);
end;
$$;

create or replace function roots_advent_private.get_advent_calendar(
  p_utc_offset_minutes integer, p_expected_user_id uuid
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := roots_advent_private.current_owner(p_expected_user_id);
  v_today date := roots_advent_private.device_date(p_utc_offset_minutes, statement_timestamp());
begin
  return jsonb_build_object(
    'local_date', v_today,
    'completed_days', coalesce((
      select jsonb_agg(proof.day order by proof.day) from roots_advent_private.completions proof
      where proof.user_id = v_user_id and date '2026-12-01' + (proof.day - 1) <= v_today
    ), '[]'::jsonb),
    'claims', coalesce((
      select jsonb_agg(roots_advent_private.claim_json(claim) order by claim.day)
      from roots_advent_private.claims claim where claim.user_id = v_user_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function roots_advent_private.claim_advent_gift(
  p_day integer, p_utc_offset_minutes integer, p_expected_user_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := roots_advent_private.current_owner(p_expected_user_id);
  v_today date := roots_advent_private.device_date(p_utc_offset_minutes, statement_timestamp());
  v_claim roots_advent_private.claims%rowtype;
  v_reward_type text;
  v_hearts integer;
  v_item_keys text[];
  v_item_key text;
  v_credit integer;
begin
  if p_day is null or p_day not between 1 and 24 then raise exception 'invalid_day' using errcode = '22023'; end if;
  select * into v_claim from roots_advent_private.claims claim where claim.user_id = v_user_id and claim.day = p_day;
  if found then return roots_advent_private.claim_json(v_claim); end if;

  if v_today not between date '2026-12-01' and date '2026-12-24' then
    raise exception 'outside_event' using errcode = '22023';
  end if;
  if date '2026-12-01' + (p_day - 1) > v_today then raise exception 'future_day' using errcode = '22023'; end if;
  if not exists (select 1 from roots_advent_private.completions proof where proof.user_id = v_user_id and proof.day = p_day) then
    raise exception 'not_eligible' using errcode = '22023';
  end if;

  if p_day = 24 and (select count(*) from roots_advent_private.completions proof where proof.user_id = v_user_id) = 24 then
    v_reward_type := 'badge';
  elsif p_day in (1, 5, 9, 14, 18, 22, 24) then
    v_reward_type := 'hearts';
    v_hearts := case p_day when 1 then 5 when 5 then 7 when 9 then 10
      when 14 then 13 when 18 then 15 when 22 then 20 else 5 end;
  elsif p_day in (3, 6, 10, 13, 20, 23) then
    v_reward_type := 'verse';
  else
    v_reward_type := 'item';
    v_item_key := case p_day
      when 2 then 'advent_2026_sheep'
      when 4 then 'advent_2026_red_scarf'
      when 7 then 'advent_2026_bethlehem'
      when 8 then 'advent_2026_cream_knit'
      when 11 then 'advent_2026_tree'
      when 12 then 'advent_2026_hat'
      when 15 then 'advent_2026_cream_scarf'
      when 16 then 'advent_2026_church'
      when 17 then 'advent_2026_cardigan'
      when 19 then 'advent_2026_snowman'
      when 21 then 'advent_2026_home' end;
    -- Both fitted silhouettes belong to one gift so switching avatar later does
    -- not take the earned outfit away. The claim keeps its stable base key.
    v_item_keys := case when p_day in (4, 8, 12, 15, 17)
      then array[v_item_key || '_rootsman', v_item_key || '_rootswoman']
      else array[v_item_key] end;
    if v_item_key is null or (
      select count(*) from public.heart_shop_items item where item.item_key = any(v_item_keys)
    ) <> cardinality(v_item_keys) then
      raise exception 'reward_unavailable' using errcode = '55000';
    end if;
  end if;

  -- The unique owner/day row is the award lock. Any failed grant rolls back that
  -- row too, so a retry can safely complete the original transaction.
  insert into roots_advent_private.claims (user_id, day, reward_type, heart_count, item_key)
    values (v_user_id, p_day, v_reward_type, v_hearts, v_item_key)
    on conflict (user_id, day) do nothing returning * into v_claim;
  if not found then
    select * into strict v_claim from roots_advent_private.claims claim
      where claim.user_id = v_user_id and claim.day = p_day;
    return roots_advent_private.claim_json(v_claim);
  end if;

  if v_reward_type = 'hearts' then
    insert into public.love_heart_events (user_id, source_type, source_id, target_owner_id, amount)
      values (v_user_id, 'advent_calendar', v_claim.id, null, v_hearts)
      on conflict (user_id, source_type, source_id) do nothing returning amount into v_credit;
    if v_credit is not null then
      insert into public.love_heart_wallets as wallet (user_id, balance, lifetime_earned, created_at, updated_at)
        values (v_user_id, v_credit, v_credit, now(), now())
        on conflict (user_id) do update set balance = wallet.balance + excluded.balance,
          lifetime_earned = wallet.lifetime_earned + excluded.lifetime_earned, updated_at = now();
    end if;
  elsif v_reward_type = 'item' then
    insert into public.heart_shop_purchases (user_id, item_key, price_paid, is_enabled)
      select v_user_id, entitlement.item_key, 0, false from unnest(v_item_keys) entitlement(item_key)
      on conflict (user_id, item_key) do nothing;
  end if;
  return roots_advent_private.claim_json(v_claim);
end;
$$;

create or replace function roots_advent_private.get_advent_badge(p_expected_user_id uuid)
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := roots_advent_private.current_owner(p_expected_user_id);
begin
  return (select claim.claimed_at from roots_advent_private.claims claim
    where claim.user_id = v_user_id and claim.day = 24 and claim.reward_type = 'badge');
end;
$$;

create or replace function public.record_advent_completion(
  p_completion_date date, p_qt_record_id uuid, p_utc_offset_minutes integer, p_expected_user_id uuid
) returns jsonb language sql security invoker set search_path = '' as $$
  select roots_advent_private.record_advent_completion(p_completion_date, p_qt_record_id, p_utc_offset_minutes, p_expected_user_id);
$$;

create or replace function public.get_advent_calendar(p_utc_offset_minutes integer, p_expected_user_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select roots_advent_private.get_advent_calendar(p_utc_offset_minutes, p_expected_user_id);
$$;

create or replace function public.claim_advent_gift(p_day integer, p_utc_offset_minutes integer, p_expected_user_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select roots_advent_private.claim_advent_gift(p_day, p_utc_offset_minutes, p_expected_user_id);
$$;

create or replace function public.get_advent_badge(p_expected_user_id uuid)
returns timestamptz language sql stable security invoker set search_path = '' as $$
  select roots_advent_private.get_advent_badge(p_expected_user_id);
$$;

revoke all on all functions in schema roots_advent_private from public, anon, authenticated, service_role;
grant execute on function roots_advent_private.record_advent_completion(date, uuid, integer, uuid),
  roots_advent_private.get_advent_calendar(integer, uuid), roots_advent_private.claim_advent_gift(integer, integer, uuid),
  roots_advent_private.get_advent_badge(uuid) to authenticated;
revoke all on function public.record_advent_completion(date, uuid, integer, uuid),
  public.get_advent_calendar(integer, uuid), public.claim_advent_gift(integer, integer, uuid),
  public.get_advent_badge(uuid) from public, anon, authenticated, service_role;
grant execute on function public.record_advent_completion(date, uuid, integer, uuid),
  public.get_advent_calendar(integer, uuid), public.claim_advent_gift(integer, integer, uuid),
  public.get_advent_badge(uuid) to authenticated;

-- Extend the current ledger source guard as a superset, preserving existing sources.
do $$
declare
  v_guard text;
begin
  select pg_get_expr(c.conbin, c.conrelid) into strict v_guard from pg_constraint c
    where c.conrelid = 'public.love_heart_events'::regclass
      and c.contype = 'c' and c.conname = 'love_heart_events_source_type_check';
  if position('source_type' in v_guard) = 0 then raise exception 'Unexpected Love Hearts source constraint'; end if;
  if position('advent_calendar' in v_guard) = 0 then
    alter table public.love_heart_events drop constraint love_heart_events_source_type_check;
    execute format('alter table public.love_heart_events add constraint love_heart_events_source_type_check check ((%s) or source_type = %L)',
      v_guard, 'advent_calendar');
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
