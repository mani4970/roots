-- 52_love_hearts_foundation_1_8.sql
-- Roots 1.8 Love Hearts foundation
--
-- Purpose:
-- - Add a separate Love Hearts wallet + ledger reward layer.
-- - Love Hearts are earned by the user who blesses, prays, or gives thanks.
-- - This migration starts Love Hearts from the 1.8 release onward.
-- - It does NOT backfill historical qt_reactions, user_prayer_logs, or prayer_likes.
--
-- Safety notes:
-- - Does NOT change Bible Reflection completion/progress/streak logic.
-- - Does NOT change daily_checkins, profiles progress fields, watering, garden/ark growth,
--   group challenge awards, notification delivery, or community feed visibility.
-- - Does NOT change existing reaction tables or existing reaction semantics.
-- - No anon grants on new tables or RPC.
-- - Explicit GRANTs, RLS, and policies are included for Supabase Data API readiness.

begin;

create table if not exists public.love_heart_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint love_heart_wallets_lifetime_balance_check check (lifetime_earned >= balance)
);

comment on table public.love_heart_wallets is
  'Current Love Hearts balance for each Roots user. Love Hearts are earned by blessing, praying, or giving thanks.';
comment on column public.love_heart_wallets.balance is
  'Current spendable Love Hearts balance. Spending is not implemented in 1.8.';
comment on column public.love_heart_wallets.lifetime_earned is
  'Total Love Hearts earned over time. Does not decrease when future spending is added.';

alter table public.love_heart_wallets enable row level security;

drop policy if exists "roots_love_heart_wallets_select_own" on public.love_heart_wallets;
create policy "roots_love_heart_wallets_select_own"
on public.love_heart_wallets
for select
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.love_heart_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in (
    'qt_reaction',
    'prayer_intercession',
    'answered_prayer_gratitude'
  )),
  source_id uuid not null,
  target_owner_id uuid references public.profiles(id) on delete set null,
  amount integer not null default 1 check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

comment on table public.love_heart_events is
  'Ledger of Love Hearts earned from blessing, praying, and giving thanks. One reward per user/source target.';
comment on column public.love_heart_events.source_type is
  'Reward source: qt_reaction, prayer_intercession, or answered_prayer_gratitude.';
comment on column public.love_heart_events.source_id is
  'Target content id for the source type: qt_records.id or prayer_items.id.';
comment on column public.love_heart_events.target_owner_id is
  'Owner of the target content at award time. Used for audit and self-reward prevention.';

create index if not exists love_heart_events_user_created_idx
  on public.love_heart_events (user_id, created_at desc);

create index if not exists love_heart_events_source_idx
  on public.love_heart_events (source_type, source_id, created_at desc);

alter table public.love_heart_events enable row level security;

drop policy if exists "roots_love_heart_events_select_own" on public.love_heart_events;
create policy "roots_love_heart_events_select_own"
on public.love_heart_events
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.award_love_heart_once(
  p_source_type text,
  p_source_id uuid
)
returns table (
  awarded boolean,
  balance integer,
  amount integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_owner_id uuid;
  v_has_interaction boolean := false;
  v_inserted boolean := false;
  v_balance integer := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_source_type not in ('qt_reaction', 'prayer_intercession', 'answered_prayer_gratitude') then
    raise exception 'invalid love heart source_type: %', p_source_type using errcode = '22023';
  end if;

  if p_source_type = 'qt_reaction' then
    select
      qr.user_id,
      exists (
        select 1
        from public.qt_reactions qtr
        where qtr.qt_id = qr.id
          and qtr.user_id = v_user_id
      )
    into v_target_owner_id, v_has_interaction
    from public.qt_records qr
    where qr.id = p_source_id;

  elsif p_source_type = 'prayer_intercession' then
    select
      pi.user_id,
      exists (
        select 1
        from public.user_prayer_logs upl
        where upl.prayer_id = pi.id
          and upl.user_id = v_user_id
      )
    into v_target_owner_id, v_has_interaction
    from public.prayer_items pi
    where pi.id = p_source_id;

  elsif p_source_type = 'answered_prayer_gratitude' then
    select
      pi.user_id,
      exists (
        select 1
        from public.prayer_likes pl
        where pl.prayer_id = pi.id
          and pl.user_id = v_user_id
      )
    into v_target_owner_id, v_has_interaction
    from public.prayer_items pi
    where pi.id = p_source_id
      and pi.is_answered = true;
  end if;

  -- No target, no matching interaction row, or self-targeted interaction:
  -- return the current balance without creating a wallet or ledger event.
  if v_target_owner_id is null
     or coalesce(v_has_interaction, false) is not true
     or v_target_owner_id = v_user_id then
    select coalesce(wallet.balance, 0)
    into v_balance
    from public.love_heart_wallets wallet
    where wallet.user_id = v_user_id;

    return query select false, coalesce(v_balance, 0), 0;
    return;
  end if;

  insert into public.love_heart_events (
    user_id,
    source_type,
    source_id,
    target_owner_id,
    amount
  )
  values (
    v_user_id,
    p_source_type,
    p_source_id,
    v_target_owner_id,
    1
  )
  on conflict (user_id, source_type, source_id) do nothing
  returning true into v_inserted;

  if coalesce(v_inserted, false) is true then
    insert into public.love_heart_wallets as wallet (
      user_id,
      balance,
      lifetime_earned,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      1,
      1,
      now(),
      now()
    )
    on conflict (user_id) do update
    set
      balance = wallet.balance + 1,
      lifetime_earned = wallet.lifetime_earned + 1,
      updated_at = now()
    returning wallet.balance into v_balance;

    return query select true, coalesce(v_balance, 1), 1;
    return;
  end if;

  select coalesce(wallet.balance, 0)
  into v_balance
  from public.love_heart_wallets wallet
  where wallet.user_id = v_user_id;

  return query select false, coalesce(v_balance, 0), 0;
end;
$$;

comment on function public.award_love_heart_once(text, uuid) is
  'Awards one Love Heart to the authenticated user after verifying an existing reaction/intercession/gratitude row, blocking self-target rewards and duplicates.';

-- Clean up broad default privileges first because existing project default privileges
-- may be wider than desired. Then add only the explicit minimum grants needed.
revoke all privileges on table public.love_heart_wallets from public;
revoke all privileges on table public.love_heart_wallets from anon;
revoke all privileges on table public.love_heart_wallets from authenticated;
revoke all privileges on table public.love_heart_wallets from service_role;

grant select on table public.love_heart_wallets to authenticated;
grant select, insert, update, delete on table public.love_heart_wallets to service_role;

revoke all privileges on table public.love_heart_events from public;
revoke all privileges on table public.love_heart_events from anon;
revoke all privileges on table public.love_heart_events from authenticated;
revoke all privileges on table public.love_heart_events from service_role;

grant select on table public.love_heart_events to authenticated;
grant select, insert, update, delete on table public.love_heart_events to service_role;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- Revoke PUBLIC/anon explicitly before adding only the required roles.
revoke execute on function public.award_love_heart_once(text, uuid) from public;
revoke execute on function public.award_love_heart_once(text, uuid) from anon;
revoke execute on function public.award_love_heart_once(text, uuid) from authenticated;
revoke execute on function public.award_love_heart_once(text, uuid) from service_role;

grant execute on function public.award_love_heart_once(text, uuid) to authenticated;
grant execute on function public.award_love_heart_once(text, uuid) to service_role;

commit;
