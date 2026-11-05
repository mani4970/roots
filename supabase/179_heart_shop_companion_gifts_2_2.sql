-- Christian Roots 2.2 · companion gifts. Apply before the corresponding web patch.
-- No existing ownership, wallet balance, equipped item or receipt is backfilled.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';

create schema if not exists roots_gift_private;
revoke all on schema roots_gift_private from public, anon, authenticated;
grant usage on schema roots_gift_private to authenticated;

create table if not exists roots_gift_private.gifts (
  gift_id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  sender_id uuid references public.profiles(id) on delete set null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null references public.heart_shop_items(item_key) on delete restrict,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (sender_id, request_id),
  check (sender_id <> recipient_id)
);
create index if not exists heart_shop_gifts_recipient_idx on roots_gift_private.gifts (recipient_id);
create index if not exists heart_shop_gifts_pending_idx on roots_gift_private.gifts (recipient_id, created_at, gift_id)
  where seen_at is null;
create index if not exists heart_shop_gifts_item_idx on roots_gift_private.gifts (item_key);
alter table roots_gift_private.gifts enable row level security;
revoke all on roots_gift_private.gifts from public, anon, authenticated;

-- Match the store's recipient avatar slots and the 1701 catalog's three Ark-only
-- ornaments. The Ark unlocks at 101 accumulated days and remains available thereafter.
create or replace function roots_gift_private.item_fits(
  p_item public.heart_shop_items, p_avatar text, p_days integer
) returns boolean language sql immutable security invoker set search_path = '' as $$
  select (p_item.category <> 'character' or p_item.avatar_type = 'shared' or
          p_item.avatar_type is not distinct from p_avatar)
     and (p_item.item_key not in ('ark_supplies','ark_workbench','ark_lantern') or coalesce(p_days, 0) >= 101);
$$;
revoke all on function roots_gift_private.item_fits(public.heart_shop_items,text,integer)
  from public, anon, authenticated, service_role;

create or replace function roots_gift_private.get_heart_shop_gift_recipients(p_item_key text)
returns table (user_id uuid, display_name text, avatar_url text, can_receive boolean)
language sql stable security definer set search_path = '' as $$
  select profile.id, profile.name::text, profile.avatar_url::text,
    roots_gift_private.item_fits(item, profile.avatar_type, profile.total_days)
    and not exists (
      select 1 from public.heart_shop_purchases owned
      where owned.user_id = profile.id and owned.item_key = item.item_key
    )
  from public.companions c
  join public.profiles profile on profile.id =
    case when c.requester_id = (select auth.uid()) then c.receiver_id else c.requester_id end
  join public.heart_shop_items item on item.item_key = p_item_key and item.active and item.price > 0
  where c.status = 'accepted' and (c.requester_id = (select auth.uid()) or c.receiver_id = (select auth.uid()))
    and not roots_comment_private.user_is_blocked(profile.id)
  order by lower(profile.name), profile.id;
$$;

create or replace function roots_gift_private.send_heart_shop_gift(
  p_item_key text, p_recipient_id uuid, p_request_id uuid, p_expected_price integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_item public.heart_shop_items%rowtype;
  v_actor_lock bigint;
  v_recipient_lock bigint;
  v_prior roots_gift_private.gifts%rowtype;
  v_gift_id uuid;
  v_balance integer;
  v_fits boolean;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_request_id is null or p_item_key is null or p_expected_price is null or p_expected_price <= 0
      or p_recipient_id is null or p_recipient_id = v_me then
    return jsonb_build_object('sent', false, 'reason', 'invalid_request', 'balance', null);
  end if;

  -- Reject arbitrary target IDs before taking their lock. A committed request can still be
  -- replayed by its own sender if the companion relationship has since ended.
  if not exists (
    select 1 from roots_gift_private.gifts g where g.sender_id = v_me and g.request_id = p_request_id
      and g.recipient_id = p_recipient_id and g.item_key = p_item_key
  ) and not exists (
    select 1 from public.companions c where c.status = 'accepted'
    and ((c.requester_id = v_me and c.receiver_id = p_recipient_id)
      or (c.receiver_id = v_me and c.requester_id = p_recipient_id))
  ) then
    return jsonb_build_object('sent', false, 'reason', 'not_companions', 'balance', null);
  end if;

  -- Acquisition order is independent of the gift direction. The key matches purchase_heart_shop_item.
  v_actor_lock := pg_catalog.hashtextextended(v_me::text, 0);
  v_recipient_lock := pg_catalog.hashtextextended(p_recipient_id::text, 0);
  perform pg_catalog.pg_advisory_xact_lock(least(v_actor_lock, v_recipient_lock));
  perform pg_catalog.pg_advisory_xact_lock(greatest(v_actor_lock, v_recipient_lock));

  select g.* into v_prior from roots_gift_private.gifts g
    where g.sender_id = v_me and g.request_id = p_request_id;
  if found then
    if v_prior.recipient_id <> p_recipient_id or v_prior.item_key <> p_item_key then
      return jsonb_build_object('sent', false, 'reason', 'invalid_request', 'balance', null);
    end if;
    select w.balance into v_balance from public.love_heart_wallets w where w.user_id = v_me;
    return jsonb_build_object('sent', true, 'reason', 'sent', 'balance', v_balance);
  end if;

  -- Synchronize acceptance/removal without permitting an arbitrary recipient or revealing their inventory.
  perform 1 from public.companions c where c.status = 'accepted'
    and ((c.requester_id = v_me and c.receiver_id = p_recipient_id)
      or (c.receiver_id = v_me and c.requester_id = p_recipient_id)) for share;
  if not found or roots_comment_private.user_is_blocked(p_recipient_id) then
    return jsonb_build_object('sent', false, 'reason', 'not_companions', 'balance', null);
  end if;

  select item.* into v_item from public.heart_shop_items item
    where item.item_key = p_item_key and item.active and item.price > 0 for share;
  if not found then
    return jsonb_build_object('sent', false, 'reason', 'invalid_item', 'balance', null);
  end if;
  if v_item.price <> p_expected_price then
    return jsonb_build_object('sent', false, 'reason', 'price_changed', 'balance', null);
  end if;
  select roots_gift_private.item_fits(v_item, p.avatar_type, p.total_days) into v_fits
    from public.profiles p where p.id = p_recipient_id;
  if v_fits is not true then
    return jsonb_build_object('sent', false, 'reason', 'incompatible', 'balance', null);
  end if;
  if exists (select 1 from public.heart_shop_purchases p where p.user_id = p_recipient_id and p.item_key = p_item_key) then
    return jsonb_build_object('sent', false, 'reason', 'already_owned', 'balance', null);
  end if;

  select w.balance into v_balance from public.love_heart_wallets w where w.user_id = v_me for update;
  if coalesce(v_balance, 0) < v_item.price then
    return jsonb_build_object('sent', false, 'reason', 'insufficient_hearts', 'balance', coalesce(v_balance, 0));
  end if;

  -- Only the sender pays. Receiving does not enable an item or displace any equipped item.
  insert into public.heart_shop_purchases (user_id, item_key, price_paid, is_enabled)
    values (p_recipient_id, p_item_key, 0, false)
    on conflict (user_id, item_key) do nothing;
  if not found then
    return jsonb_build_object('sent', false, 'reason', 'already_owned', 'balance', null);
  end if;
  update public.love_heart_wallets set balance = balance - v_item.price, updated_at = now()
    where user_id = v_me returning balance into v_balance;
  insert into roots_gift_private.gifts (request_id, sender_id, recipient_id, item_key)
    values (p_request_id, v_me, p_recipient_id, p_item_key) returning gift_id into v_gift_id;
  insert into public.love_heart_spend_events (user_id, source_type, source_key, amount, balance_after)
    values (v_me, 'heart_shop_gift', v_gift_id::text, v_item.price, v_balance);
  return jsonb_build_object('sent', true, 'reason', 'sent', 'balance', v_balance);
end;
$$;

create or replace function roots_gift_private.get_pending_heart_shop_gifts()
returns table (gift_id uuid, item_key text, sender_name text)
language sql stable security definer set search_path = '' as $$
  select g.gift_id, g.item_key, p.name::text
  from roots_gift_private.gifts g
  left join public.profiles p on p.id = g.sender_id
  where g.recipient_id = (select auth.uid()) and g.seen_at is null
    and (g.sender_id is null or not roots_comment_private.user_is_blocked(g.sender_id))
  order by g.created_at, g.gift_id limit 25;
$$;

create or replace function roots_gift_private.acknowledge_heart_shop_gift(p_gift_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update roots_gift_private.gifts set seen_at = now()
    where gift_id = p_gift_id and recipient_id = (select auth.uid()) and seen_at is null;
  if found then return true; end if;
  return exists (select 1 from roots_gift_private.gifts g
    where g.gift_id = p_gift_id and g.recipient_id = (select auth.uid()));
end;
$$;

-- PostgREST exposes only invoker wrappers. Every privileged helper checks auth.uid()
-- and works on one sender or recipient. App roles never receive table access.
create or replace function public.get_heart_shop_gift_recipients(p_item_key text)
returns table (user_id uuid, display_name text, avatar_url text, can_receive boolean)
language sql stable security invoker set search_path = '' as $$
  select * from roots_gift_private.get_heart_shop_gift_recipients(p_item_key);
$$;
create or replace function public.send_heart_shop_gift(
  p_item_key text, p_recipient_id uuid, p_request_id uuid, p_expected_price integer
) returns jsonb language sql security invoker set search_path = '' as $$
  select roots_gift_private.send_heart_shop_gift(p_item_key, p_recipient_id, p_request_id, p_expected_price);
$$;
create or replace function public.get_pending_heart_shop_gifts()
returns table (gift_id uuid, item_key text, sender_name text)
language sql stable security invoker set search_path = '' as $$
  select * from roots_gift_private.get_pending_heart_shop_gifts();
$$;
create or replace function public.acknowledge_heart_shop_gift(p_gift_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  select roots_gift_private.acknowledge_heart_shop_gift(p_gift_id);
$$;

do $$
declare
  v_schema text;
  v_signature text;
begin
  foreach v_schema in array array['roots_gift_private','public'] loop
    foreach v_signature in array array['get_heart_shop_gift_recipients(text)',
      'send_heart_shop_gift(text,uuid,uuid,integer)','get_pending_heart_shop_gifts()',
      'acknowledge_heart_shop_gift(uuid)'] loop
      execute format('revoke all on function %I.%s from public, anon, authenticated, service_role', v_schema, v_signature);
      execute format('grant execute on function %I.%s to authenticated', v_schema, v_signature);
    end loop;
  end loop;
end
$$;

-- Acquire the only lock on an existing table immediately before COMMIT.
-- Existing purchases use this ledger and its unique (user_id, source_type, source_key).
-- Refuse to overwrite a separately modified restriction on the spending ledger.
do $$
declare
  v_original text;
begin
  if to_regprocedure('roots_comment_private.user_is_blocked(uuid)') is null or
     to_regprocedure('public.purchase_heart_shop_item(text)') is null then
    raise exception 'Required Love Shop purchase or community block function is missing.';
  end if;
  select pg_get_expr(c.conbin, c.conrelid) into v_original from pg_constraint c
  where c.conrelid = 'public.love_heart_spend_events'::regclass
    and c.conname = 'love_heart_spend_events_source_type_check';
  if found then
    if v_original is distinct from '(source_type = ''heart_shop_purchase''::text)' then
      raise exception 'Spend ledger check differs from the expected purchase-only definition.';
    end if;
    alter table public.love_heart_spend_events
      drop constraint love_heart_spend_events_source_type_check,
      add constraint roots_heart_shop_spend_source_types
        check (source_type in ('heart_shop_purchase', 'heart_shop_gift'));
  elsif not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.love_heart_spend_events'::regclass
      and c.conname = 'roots_heart_shop_spend_source_types'
      and c.contype = 'c' and c.convalidated
      and pg_get_expr(c.conbin,c.conrelid) =
        '(source_type = ANY (ARRAY[''heart_shop_purchase''::text, ''heart_shop_gift''::text]))'
  ) then
    raise exception 'Expected purchase/gift spend ledger check is missing or modified.';
  end if;
end
$$;

commit;

-- SQL Editor: expect true in every column. These checks do not create gifts or spend Hearts.
with gift_functions as (
  select p.oid, p.prosecdef, n.nspname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public','roots_gift_private')
    and p.proname in ('get_heart_shop_gift_recipients','send_heart_shop_gift',
                      'get_pending_heart_shop_gifts','acknowledge_heart_shop_gift')
)
select
  (select count(*) = 4 and bool_and(not prosecdef) from gift_functions where nspname = 'public') as api_ready,
  (select count(*) = 4 and bool_and(prosecdef) from gift_functions where nspname = 'roots_gift_private') as private_helpers_ready,
  (select bool_and(has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')) from gift_functions) as rpc_grants_ok,
  (select relrowsecurity from pg_class where oid = 'roots_gift_private.gifts'::regclass)
    and not has_table_privilege('authenticated','roots_gift_private.gifts','select,insert,update,delete')
    and not has_table_privilege('anon','roots_gift_private.gifts','select,insert,update,delete') as receipt_table_private,
  exists (select 1 from pg_constraint where conrelid = 'public.love_heart_spend_events'::regclass
    and conname = 'roots_heart_shop_spend_source_types' and convalidated) as gift_ledger_ready;
