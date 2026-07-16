-- 74_heart_shop_character_items_2_1.sql
-- Adds Rootsman/Rootswoman profile-character layers to the Love Shop.
--
-- Safety scope:
-- - Changes only the Love Shop catalog and its two existing purchase/toggle RPCs.
-- - Does not change reflection completion, streaks, daily check-ins, watering,
--   reward-map progress, badges, companion challenges, or group challenges.
-- - Character equipment is isolated by avatar and slot. Map-item toggles keep
--   their existing independent behavior.

begin;

alter table public.heart_shop_items
  add column if not exists avatar_type text,
  add column if not exists character_slot text;

comment on column public.heart_shop_items.avatar_type is
  'Character-item compatibility. NULL for map items; rootsman or rootswoman for character layers.';
comment on column public.heart_shop_items.character_slot is
  'Exclusive equipment slot for character layers. NULL for map items.';

alter table public.heart_shop_items
  drop constraint if exists heart_shop_items_avatar_type_check,
  add constraint heart_shop_items_avatar_type_check
    check (avatar_type is null or avatar_type in ('rootsman', 'rootswoman')),
  drop constraint if exists heart_shop_items_character_slot_check,
  add constraint heart_shop_items_character_slot_check
    check (character_slot is null or character_slot in ('bottom', 'shoes', 'top', 'eyewear', 'headwear')),
  drop constraint if exists heart_shop_items_category_metadata_check,
  add constraint heart_shop_items_category_metadata_check
    check (
      (category = 'map' and avatar_type is null and character_slot is null)
      or
      (category = 'character' and avatar_type is not null and character_slot is not null)
    );

-- Keep all previously shipped map friends explicitly outside character slots.
update public.heart_shop_items
set avatar_type = null,
    character_slot = null,
    updated_at = now()
where category = 'map'
  and (avatar_type is not null or character_slot is not null);

-- 52 transparent 1086x1448 layers: 26 for Rootsman and 26 for Rootswoman.
with character_groups (
  avatar_type,
  character_slot,
  item_count,
  price,
  directory_name,
  file_prefix,
  sort_base
) as (
  values
    ('rootsman',   'bottom',   6, 30, 'bottoms',   'bottom',   1000),
    ('rootsman',   'shoes',    4, 30, 'shoes',     'shoes',    1100),
    ('rootsman',   'top',      6, 30, 'tops',      'top',      1200),
    ('rootsman',   'eyewear',  6, 40, 'eyewear',   'eyewear',  1300),
    ('rootsman',   'headwear', 4, 10, 'headwear',  'headwear', 1400),
    ('rootswoman', 'bottom',   6, 30, 'bottoms',   'bottom',   2000),
    ('rootswoman', 'shoes',    4, 30, 'shoes',     'shoes',    2100),
    ('rootswoman', 'top',      6, 30, 'tops',      'top',      2200),
    ('rootswoman', 'eyewear',  6, 40, 'eyewear',   'eyewear',  2300),
    ('rootswoman', 'headwear', 4, 10, 'headwear',  'headwear', 2400)
), character_items as (
  select
    format('%s_%s_%s', groups.avatar_type, groups.character_slot, lpad(item_number::text, 2, '0')) as item_key,
    groups.price,
    format(
      '/images/heart-shop/character/%s/%s/%s-%s.png',
      groups.avatar_type,
      groups.directory_name,
      groups.file_prefix,
      lpad(item_number::text, 2, '0')
    ) as layer_path,
    groups.sort_base + item_number as sort_order,
    groups.avatar_type,
    groups.character_slot
  from character_groups groups
  cross join lateral generate_series(1, groups.item_count) as item_number
)
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
  avatar_type,
  character_slot,
  updated_at
)
select
  item_key,
  'character',
  price,
  layer_path,
  null,
  1,
  'ground',
  sort_order,
  true,
  avatar_type,
  character_slot,
  now()
from character_items
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
  avatar_type = excluded.avatar_type,
  character_slot = excluded.character_slot,
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
  v_owned_enabled boolean := false;
  v_profile_avatar_type text;
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

  if v_item.category = 'character' then
    select profile.avatar_type
    into v_profile_avatar_type
    from public.profiles profile
    where profile.id = v_user_id;

    if v_profile_avatar_type is distinct from v_item.avatar_type then
      select coalesce(wallet.balance, 0)
      into v_balance
      from public.love_heart_wallets wallet
      where wallet.user_id = v_user_id;

      return jsonb_build_object(
        'purchased', false,
        'already_owned', false,
        'reason', 'incompatible_avatar',
        'item_key', v_item.item_key,
        'price', v_item.price,
        'balance', coalesce(v_balance, 0)
      );
    end if;
  end if;

  -- Serialize all equipment changes for this user, including concurrent toggles.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  -- The wallet row lock preserves the existing no-overspend guarantee.
  insert into public.love_heart_wallets (user_id, balance, lifetime_earned, created_at, updated_at)
  values (v_user_id, 0, 0, now(), now())
  on conflict (user_id) do nothing;

  select wallet.balance
  into v_balance
  from public.love_heart_wallets wallet
  where wallet.user_id = v_user_id
  for update;

  select true, purchase.is_enabled
  into v_already_owned, v_owned_enabled
  from public.heart_shop_purchases purchase
  where purchase.user_id = v_user_id
    and purchase.item_key = v_item.item_key;

  if coalesce(v_already_owned, false) is true then
    return jsonb_build_object(
      'purchased', false,
      'already_owned', true,
      'reason', 'already_owned',
      'item_key', v_item.item_key,
      'price', v_item.price,
      'balance', coalesce(v_balance, 0),
      'is_enabled', coalesce(v_owned_enabled, false)
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

  if v_item.category = 'character' then
    update public.heart_shop_purchases purchase
    set is_enabled = false,
        updated_at = now()
    from public.heart_shop_items owned_item
    where purchase.user_id = v_user_id
      and purchase.item_key = owned_item.item_key
      and owned_item.category = 'character'
      and owned_item.avatar_type = v_item.avatar_type
      and owned_item.character_slot = v_item.character_slot
      and purchase.is_enabled = true;
  end if;

  insert into public.heart_shop_purchases (user_id, item_key, price_paid, is_enabled, purchased_at, updated_at)
  values (v_user_id, v_item.item_key, v_item.price, true, now(), now());

  update public.love_heart_wallets wallet
  set balance = wallet.balance - v_item.price,
      updated_at = now()
  where wallet.user_id = v_user_id
  returning wallet.balance into v_new_balance;

  insert into public.love_heart_spend_events (user_id, source_type, source_key, amount, balance_after, created_at)
  values (v_user_id, 'heart_shop_purchase', v_item.item_key, v_item.price, v_new_balance, now());

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
  'Atomically purchases Love Shop items. Character purchases require the matching current avatar and replace only the same avatar/slot equipment.';

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
  v_item public.heart_shop_items%rowtype;
  v_profile_avatar_type text;
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

  select item.*
  into v_item
  from public.heart_shop_items item
  join public.heart_shop_purchases purchase
    on purchase.item_key = item.item_key
   and purchase.user_id = v_user_id
  where item.item_key = p_item_key
    and item.active = true;

  if not found then
    return jsonb_build_object(
      'updated', false,
      'reason', 'not_owned',
      'item_key', p_item_key
    );
  end if;

  if p_enabled and v_item.category = 'character' then
    select profile.avatar_type
    into v_profile_avatar_type
    from public.profiles profile
    where profile.id = v_user_id;

    if v_profile_avatar_type is distinct from v_item.avatar_type then
      return jsonb_build_object(
        'updated', false,
        'reason', 'incompatible_avatar',
        'item_key', p_item_key,
        'is_enabled', false
      );
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  if p_enabled and v_item.category = 'character' then
    update public.heart_shop_purchases purchase
    set is_enabled = false,
        updated_at = now()
    from public.heart_shop_items owned_item
    where purchase.user_id = v_user_id
      and purchase.item_key = owned_item.item_key
      and purchase.item_key <> v_item.item_key
      and owned_item.category = 'character'
      and owned_item.avatar_type = v_item.avatar_type
      and owned_item.character_slot = v_item.character_slot
      and purchase.is_enabled = true;
  end if;

  update public.heart_shop_purchases purchase
  set is_enabled = p_enabled,
      updated_at = now()
  where purchase.user_id = v_user_id
    and purchase.item_key = v_item.item_key
  returning purchase.is_enabled into v_enabled;

  return jsonb_build_object(
    'updated', true,
    'reason', 'updated',
    'item_key', v_item.item_key,
    'is_enabled', v_enabled
  );
end;
$$;

comment on function public.set_heart_shop_item_enabled(text, boolean) is
  'Updates one owned Love Shop item. Enabling a character layer disables only other items in the same avatar/slot.';

revoke execute on function public.purchase_heart_shop_item(text) from public, anon, authenticated, service_role;
grant execute on function public.purchase_heart_shop_item(text) to authenticated, service_role;

revoke execute on function public.set_heart_shop_item_enabled(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_heart_shop_item_enabled(text, boolean) to authenticated, service_role;

commit;

-- Postcheck: expected 52 active character rows, 26 per avatar.
select avatar_type, count(*) as active_character_items
from public.heart_shop_items
where category = 'character' and active = true
group by avatar_type
order by avatar_type;

-- Postcheck: expected bottom 12, eyewear 12, headwear 8, shoes 8, top 12.
select character_slot, count(*) as item_count
from public.heart_shop_items
where category = 'character' and active = true
group by character_slot
order by character_slot;
