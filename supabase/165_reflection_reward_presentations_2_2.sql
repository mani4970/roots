-- Run this whole file in the Supabase SQL editor before deploying this patch.
-- UI receipts only: the existing progress RPC and all award calculations stay unchanged.
-- Existing users are not backfilled from profile badge flags.
begin;

do $$
begin
  if to_regprocedure('public.record_bible_reflection_progress(uuid,date)') is null then
    raise exception 'Safety stop: install the existing Reflection progress RPC first';
  end if;
end;
$$;

create table if not exists public.reflection_reward_presentations (
  user_id uuid not null references auth.users(id) on delete cascade,
  completion_date date not null,
  item_key text not null,
  streak_days integer not null check (streak_days > 0),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  superseded_at timestamptz,
  primary key (user_id, completion_date, item_key),
  constraint reflection_reward_presentations_item_key_check check (
    item_key in ('badge_rootsman', 'badge_mose', 'badge_rootsman_bible', 'badge_david',
      'badge_angel', 'stage', 'map_start', 'map_complete', 'action')
    or item_key ~ '^fruit_badge_[0-8]$'
  ),
  constraint reflection_reward_presentations_superseded_check check (
    superseded_at is null or item_key = 'action'
  )
);

comment on table public.reflection_reward_presentations is
  'Account-owned pending presentation receipts. Acknowledgement never awards badges or advances progress.';

create index if not exists reflection_reward_presentations_pending_idx
  on public.reflection_reward_presentations (user_id, completion_date, item_key)
  where acknowledged_at is null and superseded_at is null;

alter table public.reflection_reward_presentations enable row level security;

drop policy if exists reflection_reward_presentations_select_own on public.reflection_reward_presentations;
create policy reflection_reward_presentations_select_own
  on public.reflection_reward_presentations for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists reflection_reward_presentations_insert_own on public.reflection_reward_presentations;
create policy reflection_reward_presentations_insert_own
  on public.reflection_reward_presentations for insert to authenticated
  with check ((select auth.uid()) = user_id and acknowledged_at is null and superseded_at is null);

drop policy if exists reflection_reward_presentations_update_own on public.reflection_reward_presentations;
create policy reflection_reward_presentations_update_own
  on public.reflection_reward_presentations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (acknowledged_at is not null or superseded_at is not null));

revoke all on table public.reflection_reward_presentations from public, anon, authenticated;
grant select on table public.reflection_reward_presentations to authenticated;
grant insert (user_id, completion_date, item_key, streak_days)
  on table public.reflection_reward_presentations to authenticated;
grant update (acknowledged_at, superseded_at)
  on table public.reflection_reward_presentations to authenticated;

-- Also imports actual device-local pending receipts created before this SQL was installed.
-- ON CONFLICT DO NOTHING deliberately preserves acknowledgements from other devices.
create or replace function public.import_reflection_reward_presentations(
  p_user_id uuid,
  p_receipts jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_receipt jsonb;
  v_date date;
  v_days integer;
  v_key text;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;
  if p_receipts is null or jsonb_typeof(p_receipts) <> 'array'
    or jsonb_array_length(p_receipts) > 500 then
    raise exception 'expected at most 500 UI receipts' using errcode = '22023';
  end if;
  select profile.* into v_profile from public.profiles as profile where profile.id = v_user_id;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  for v_receipt in select value from jsonb_array_elements(p_receipts) loop
    v_date := (v_receipt ->> 'date')::date;
    v_days := (v_receipt ->> 'days')::integer;
    v_key := v_receipt ->> 'itemKey';
    if v_date is null or v_days is null or v_key is null or v_days <= 0
      or v_profile.last_checkin is null or v_date > v_profile.last_checkin
      or v_days > coalesce(v_profile.streak_days, 0) then
      raise exception 'invalid completed Reflection UI receipt' using errcode = '22023';
    end if;
    -- These are private UI receipts, not award requests. Keep earned pending
    -- notices even if their old reflection was subsequently deleted.
    insert into public.reflection_reward_presentations (user_id, completion_date, item_key, streak_days)
      values (v_user_id, v_date, v_key, v_days)
      on conflict (user_id, completion_date, item_key) do nothing;
  end loop;

  -- Daily actions describe the newest state once. Milestone notices/badges stay pending.
  update public.reflection_reward_presentations as receipt
    set superseded_at = now()
    where receipt.user_id = v_user_id and receipt.item_key = 'action'
      and receipt.acknowledged_at is null and receipt.superseded_at is null
      and (
        receipt.streak_days < coalesce(v_profile.streak_days, 0)
        or exists (
          select 1 from public.reflection_reward_presentations as newer
          where newer.user_id = receipt.user_id and newer.item_key = 'action'
            and (
              newer.streak_days > receipt.streak_days
              or (newer.streak_days = receipt.streak_days and (
                newer.completion_date > receipt.completion_date or newer.acknowledged_at is not null
              ))
            )
        )
      );
end;
$$;

create or replace function public.record_bible_reflection_progress_with_receipts(
  p_user_id uuid,
  p_date date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_days integer;
  v_day integer;
  v_keys text[] := '{}'::text[];
  v_badge jsonb;
  v_receipts jsonb;
begin
  -- This call retains its existing auth, completed-record check, row lock,
  -- date window, idempotency, progress math and badge eligibility.
  v_result := public.record_bible_reflection_progress(p_user_id, p_date);
  if coalesce((v_result ->> 'updated')::boolean, false) then
    v_days := (v_result #>> '{profile,streak_days}')::integer;
    v_day := ((v_days - 1) % 100) + 1;
    for v_badge in select value from jsonb_array_elements(coalesce(v_result -> 'awarded_badges', '[]'::jsonb)) loop
      v_keys := array_append(v_keys, v_badge #>> '{}');
    end loop;
    if v_days between 1 and 300 then
      if v_days % 100 = 0 then
        v_keys := array_append(v_keys, 'map_complete');
      else
        v_keys := array_append(v_keys, 'action');
        if v_days in (101, 201) then
          v_keys := array_append(v_keys, 'map_start');
        end if;
      end if;
      if (v_days <= 200 and v_day > 1 and v_day % 10 = 1)
        or (v_days > 200 and v_day in (8, 11, 16, 19, 31, 41, 51, 61, 70, 71, 81, 91)) then
        v_keys := array_append(v_keys, 'stage');
      end if;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('date', p_date, 'days', v_days, 'itemKey', key)), '[]'::jsonb)
      into v_receipts from unnest(v_keys) as key;
    perform public.import_reflection_reward_presentations(p_user_id, v_receipts);
  end if;
  return v_result;
end;
$$;

create or replace function public.acknowledge_reflection_reward_presentations(
  p_user_id uuid,
  p_receipts jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_user_id is null or p_user_id <> v_user_id then
    raise exception 'user mismatch' using errcode = '42501';
  end if;
  if p_receipts is null or jsonb_typeof(p_receipts) <> 'array'
    or jsonb_array_length(p_receipts) > 500 then
    raise exception 'expected at most 500 UI receipts' using errcode = '22023';
  end if;
  update public.reflection_reward_presentations as receipt
    set acknowledged_at = now()
    where receipt.user_id = v_user_id and receipt.acknowledged_at is null
      and exists (
        select 1 from jsonb_array_elements(p_receipts) as requested(value)
        where (requested.value ->> 'date')::date = receipt.completion_date
          and requested.value ->> 'itemKey' = receipt.item_key
      );

  -- Two legacy devices may describe the same latest map state with different
  -- completion dates. Confirming either visible copy finishes that daily state.
  update public.reflection_reward_presentations as receipt
    set superseded_at = now()
    where receipt.user_id = v_user_id and receipt.item_key = 'action'
      and receipt.acknowledged_at is null and receipt.superseded_at is null
      and exists (
        select 1 from public.reflection_reward_presentations as acknowledged
        where acknowledged.user_id = v_user_id and acknowledged.acknowledged_at is not null
          and acknowledged.item_key in ('action', 'map_complete')
          and acknowledged.streak_days >= receipt.streak_days
      );
end;
$$;

revoke execute on function public.import_reflection_reward_presentations(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.record_bible_reflection_progress_with_receipts(uuid, date)
  from public, anon, authenticated, service_role;
revoke execute on function public.acknowledge_reflection_reward_presentations(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.import_reflection_reward_presentations(uuid, jsonb) to authenticated;
grant execute on function public.record_bible_reflection_progress_with_receipts(uuid, date) to authenticated;
grant execute on function public.acknowledge_reflection_reward_presentations(uuid, jsonb) to authenticated;

commit;

-- All booleans should be true. No production progress function is replaced above.
select
  (select relrowsecurity from pg_class where oid = 'public.reflection_reward_presentations'::regclass) as receipts_rls_enabled,
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'reflection_reward_presentations_pending_idx') as pending_index_exists,
  (select not prosecdef from pg_proc where oid = 'public.record_bible_reflection_progress_with_receipts(uuid,date)'::regprocedure) as wrapper_is_security_invoker,
  has_function_privilege('authenticated', 'public.record_bible_reflection_progress_with_receipts(uuid,date)', 'execute') as authenticated_wrapper_allowed,
  not has_function_privilege('anon', 'public.record_bible_reflection_progress_with_receipts(uuid,date)', 'execute') as anonymous_wrapper_blocked,
  has_column_privilege('authenticated', 'public.reflection_reward_presentations', 'acknowledged_at', 'update') as own_ack_column_allowed,
  not has_column_privilege('authenticated', 'public.reflection_reward_presentations', 'streak_days', 'update') as snapshot_changes_blocked;
