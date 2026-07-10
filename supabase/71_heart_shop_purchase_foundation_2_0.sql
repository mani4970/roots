-- 71_heart_shop_purchase_foundation_2_0.sql
-- Roots 2.0 Love Shop purchase foundation
--
-- Purpose:
-- - Add the server-authoritative Love Shop catalog.
-- - Store one-time item purchases and each purchased item's ON/OFF state.
-- - Spend Love Hearts atomically through a SECURITY DEFINER RPC.
-- - Prevent duplicate purchases and negative balances at the database layer.
--
-- Safety:
-- - Does NOT change Bible Reflection completion/progress/streak logic.
-- - Does NOT change qt_records, daily_checkins, profiles progress fields,
--   watering, reward maps, companion challenges, or group challenges.
-- - No anon grants.
-- - Every new table and function has explicit GRANTs, RLS, and policies.

begin;

create table if not exists public.heart_shop_items (
  item_key text primary key,
  category text not null default 'map' check (category in ('map', 'character')),
  price integer not null check (price > 0),
  preview_path text not null,
  sprite_path text,
  frame_count integer not null default 1 check (frame_count > 0),
  placement_zone text not null default 'ground' check (placement_zone in ('sky', 'ground', 'soil')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.heart_shop_items is
  'Server-authoritative Love Shop catalog. Prices and active status used by purchase RPCs live here, not in the client.';
comment on column public.heart_shop_items.item_key is
  'Stable app item key used by the dedicated KO/EN/DE/FR Love Shop text registry.';
comment on column public.heart_shop_items.placement_zone is
  'Future Home map placement hint for purchased animated map friends.';

alter table public.heart_shop_items enable row level security;

drop policy if exists "roots_heart_shop_items_select_active" on public.heart_shop_items;
create policy "roots_heart_shop_items_select_active"
on public.heart_shop_items
for select
to authenticated
using (active = true);

create table if not exists public.heart_shop_purchases (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null references public.heart_shop_items(item_key) on delete restrict,
  price_paid integer not null check (price_paid > 0),
  is_enabled boolean not null default true,
  purchased_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

comment on table public.heart_shop_purchases is
  'One-time Love Shop item ownership. The primary key prevents duplicate purchases per user/item.';
comment on column public.heart_shop_purchases.is_enabled is
  'Whether the purchased item should be shown on the user Home map once map rendering is connected.';

create index if not exists heart_shop_purchases_user_date_idx
  on public.heart_shop_purchases (user_id, purchased_at desc);

alter table public.heart_shop_purchases enable row level security;

drop policy if exists "roots_heart_shop_purchases_select_own" on public.heart_shop_purchases;
create policy "roots_heart_shop_purchases_select_own"
on public.heart_shop_purchases
for select
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.love_heart_spend_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null default 'heart_shop_purchase' check (source_type = 'heart_shop_purchase'),
  source_key text not null,
  amount integer not null check (amount > 0),
  balance_after integer not null check (balance_after >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_key)
);

comment on table public.love_heart_spend_events is
  'Immutable audit ledger for Love Hearts spent in the Love Shop.';
comment on column public.love_heart_spend_events.amount is
  'Positive number of Love Hearts spent. The wallet balance itself is decreased atomically by the purchase RPC.';

create index if not exists love_heart_spend_events_user_created_idx
  on public.love_heart_spend_events (user_id, created_at desc);

alter table public.love_heart_spend_events enable row level security;

drop policy if exists "roots_love_heart_spend_events_select_own" on public.love_heart_spend_events;
create policy "roots_love_heart_spend_events_select_own"
on public.love_heart_spend_events
for select
to authenticated
using (user_id = (select auth.uid()));

-- Seed/update the first four Roots 2.0 animated map friends.
insert into public.heart_shop_items (
  item_key,
  category,
  price,
  preview_path,
  sprite_path,
  frame_count,
  placement_zone,
  sort_order,
  active,
  updated_at
)
values
  ('jjaekjjaek', 'map', 40, '/images/heart-shop/previews/jjaekjjaek.webp', '/images/heart-shop/source-sprites/jjaekjjaek.png', 4, 'sky', 10, true, now()),
  ('hindungi',   'map', 60, '/images/heart-shop/previews/hindungi.webp',   '/images/heart-shop/source-sprites/hindungi.png',   4, 'ground', 20, true, now()),
  ('choko',      'map', 60, '/images/heart-shop/previews/choko.webp',      '/images/heart-shop/source-sprites/choko.png',      4, 'ground', 30, true, now()),
  ('kkumdeuli',  'map', 25, '/images/heart-shop/previews/kkumdeuli.webp',  '/images/heart-shop/source-sprites/kkumdeuli.png',  4, 'soil', 40, true, now())
on conflict (item_key) do update
set
  category = excluded.category,
  price = excluded.price,
  preview_path = excluded.preview_path,
  sprite_path = excluded.sprite_path,
  frame_count = excluded.frame_count,
  placement_zone = excluded.placement_zone,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

create or replace function public.purchase_heart_shop_item(
  p_item_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.heart_shop_items%rowtype;
  v_balance integer := 0;
  v_new_balance integer := 0;
  v_already_owned boolean := false;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if nullif(trim(coalesce(p_item_key, '')), '') is null then
    return jsonb_build_object(
      'purchased', false,
      'already_owned', false,
      'reason', 'invalid_item',
      'balance', 0
    );
  end if;

  select *
  into v_item
  from public.heart_shop_items item
  where item.item_key = p_item_key
    and item.active = true;

  if not found then
    select coalesce(wallet.balance, 0)
    into v_balance
    from public.love_heart_wallets wallet
    where wallet.user_id = v_user_id;

    return jsonb_build_object(
      'purchased', false,
      'already_owned', false,
      'reason', 'invalid_item',
      'item_key', p_item_key,
      'balance', coalesce(v_balance, 0)
    );
  end if;

  -- Ensure every buyer has a wallet row, then lock it. The row lock serializes
  -- concurrent purchases for the same account and prevents over-spending.
  insert into public.love_heart_wallets (
    user_id,
    balance,
    lifetime_earned,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    0,
    0,
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  select wallet.balance
  into v_balance
  from public.love_heart_wallets wallet
  where wallet.user_id = v_user_id
  for update;

  select exists (
    select 1
    from public.heart_shop_purchases purchase
    where purchase.user_id = v_user_id
      and purchase.item_key = v_item.item_key
  ) into v_already_owned;

  if coalesce(v_already_owned, false) is true then
    return jsonb_build_object(
      'purchased', false,
      'already_owned', true,
      'reason', 'already_owned',
      'item_key', v_item.item_key,
      'price', v_item.price,
      'balance', coalesce(v_balance, 0),
      'is_enabled', true
    );
  end if;

  if coalesce(v_balance, 0) < v_item.price then
    return jsonb_build_object(
      'purchased', false,
      'already_owned', false,
      'reason', 'insufficient_hearts',
      'item_key', v_item.item_key,
      'price', v_item.price,
      'balance', coalesce(v_balance, 0),
      'needed', greatest(v_item.price - coalesce(v_balance, 0), 0)
    );
  end if;

  insert into public.heart_shop_purchases (
    user_id,
    item_key,
    price_paid,
    is_enabled,
    purchased_at,
    updated_at
  )
  values (
    v_user_id,
    v_item.item_key,
    v_item.price,
    true,
    now(),
    now()
  );

  update public.love_heart_wallets wallet
  set
    balance = wallet.balance - v_item.price,
    updated_at = now()
  where wallet.user_id = v_user_id
  returning wallet.balance into v_new_balance;

  insert into public.love_heart_spend_events (
    user_id,
    source_type,
    source_key,
    amount,
    balance_after,
    created_at
  )
  values (
    v_user_id,
    'heart_shop_purchase',
    v_item.item_key,
    v_item.price,
    v_new_balance,
    now()
  );

  return jsonb_build_object(
    'purchased', true,
    'already_owned', false,
    'reason', 'purchased',
    'item_key', v_item.item_key,
    'price', v_item.price,
    'balance', v_new_balance,
    'is_enabled', true
  );
end;
$$;

comment on function public.purchase_heart_shop_item(text) is
  'Atomically validates a server-side catalog price, locks the authenticated user wallet, prevents duplicate ownership, spends Love Hearts, and records the purchase/audit event.';

create or replace function public.set_heart_shop_item_enabled(
  p_item_key text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_enabled boolean;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_enabled is null then
    return jsonb_build_object(
      'updated', false,
      'reason', 'invalid_enabled_value',
      'item_key', p_item_key
    );
  end if;

  update public.heart_shop_purchases purchase
  set
    is_enabled = p_enabled,
    updated_at = now()
  where purchase.user_id = v_user_id
    and purchase.item_key = p_item_key
  returning purchase.is_enabled into v_enabled;

  if not found then
    return jsonb_build_object(
      'updated', false,
      'reason', 'not_owned',
      'item_key', p_item_key
    );
  end if;

  return jsonb_build_object(
    'updated', true,
    'reason', 'updated',
    'item_key', p_item_key,
    'is_enabled', v_enabled
  );
end;
$$;

comment on function public.set_heart_shop_item_enabled(text, boolean) is
  'Updates only the authenticated user purchased item ON/OFF state. Does not affect ownership or Love Heart balance.';

-- Explicit Data API grants. RLS alone is not enough.
revoke all privileges on table public.heart_shop_items from public;
revoke all privileges on table public.heart_shop_items from anon;
revoke all privileges on table public.heart_shop_items from authenticated;
revoke all privileges on table public.heart_shop_items from service_role;
grant select on table public.heart_shop_items to authenticated;
grant select, insert, update, delete on table public.heart_shop_items to service_role;

revoke all privileges on table public.heart_shop_purchases from public;
revoke all privileges on table public.heart_shop_purchases from anon;
revoke all privileges on table public.heart_shop_purchases from authenticated;
revoke all privileges on table public.heart_shop_purchases from service_role;
grant select on table public.heart_shop_purchases to authenticated;
grant select, insert, update, delete on table public.heart_shop_purchases to service_role;

revoke all privileges on table public.love_heart_spend_events from public;
revoke all privileges on table public.love_heart_spend_events from anon;
revoke all privileges on table public.love_heart_spend_events from authenticated;
revoke all privileges on table public.love_heart_spend_events from service_role;
grant select on table public.love_heart_spend_events to authenticated;
grant select, insert, update, delete on table public.love_heart_spend_events to service_role;

revoke execute on function public.purchase_heart_shop_item(text) from public;
revoke execute on function public.purchase_heart_shop_item(text) from anon;
revoke execute on function public.purchase_heart_shop_item(text) from authenticated;
revoke execute on function public.purchase_heart_shop_item(text) from service_role;
grant execute on function public.purchase_heart_shop_item(text) to authenticated;
grant execute on function public.purchase_heart_shop_item(text) to service_role;

revoke execute on function public.set_heart_shop_item_enabled(text, boolean) from public;
revoke execute on function public.set_heart_shop_item_enabled(text, boolean) from anon;
revoke execute on function public.set_heart_shop_item_enabled(text, boolean) from authenticated;
revoke execute on function public.set_heart_shop_item_enabled(text, boolean) from service_role;
grant execute on function public.set_heart_shop_item_enabled(text, boolean) to authenticated;
grant execute on function public.set_heart_shop_item_enabled(text, boolean) to service_role;

commit;
