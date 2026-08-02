-- 119_heart_shop_profile_pets_2_1.sql
-- Adds four shared profile pets for both Rootsman and Rootswoman.
--
-- Safety scope:
-- - Reuses the existing heart_shop_items table, RLS policies, explicit grants,
--   wallet lock, duplicate guard, spend ledger, and item-toggle RPC.
-- - Preserves the purchase RPC's wallet and ownership logic while extending
--   only its avatar compatibility gate to paid shared character items.
-- - Adds only the new exclusive character slot "pet" and four shared catalog rows.
-- - Removes the unshipped duplicate Rootsman/Rootswoman pet catalog rows only
--   after proving that no purchase or spend record references them.
-- - Creates no table, sequence, policy, or Data API grant.
-- - Does not touch reflection progress, streaks, daily check-ins, profiles,
--   badges, reward maps, watering, companion challenges, or group challenges.

begin;

alter table public.heart_shop_items
  drop constraint if exists heart_shop_items_character_slot_check,
  add constraint heart_shop_items_character_slot_check
    check (
      character_slot is null
      or character_slot in (
        'background',
        'bottom',
        'shoes',
        'top',
        'bag',
        'eyewear',
        'hair',
        'hair_accessory',
        'headwear',
        'pet'
      )
    );

do $$
begin
  if exists (
    select 1
    from public.heart_shop_purchases
    where item_key in (
      'rootsman_pet_01',
      'rootsman_pet_02',
      'rootsman_pet_03',
      'rootsman_pet_04',
      'rootswoman_pet_01',
      'rootswoman_pet_02',
      'rootswoman_pet_03',
      'rootswoman_pet_04'
    )
  ) then
    raise exception 'Cannot consolidate duplicate pet items while legacy pet purchases exist.';
  end if;

  if exists (
    select 1
    from public.love_heart_spend_events
    where source_type = 'heart_shop_purchase'
      and source_key in (
        'rootsman_pet_01',
        'rootsman_pet_02',
        'rootsman_pet_03',
        'rootsman_pet_04',
        'rootswoman_pet_01',
        'rootswoman_pet_02',
        'rootswoman_pet_03',
        'rootswoman_pet_04'
      )
  ) then
    raise exception 'Cannot consolidate duplicate pet items while legacy pet spend events exist.';
  end if;
end
$$;

delete from public.heart_shop_items
where item_key in (
  'rootsman_pet_01',
  'rootsman_pet_02',
  'rootsman_pet_03',
  'rootsman_pet_04',
  'rootswoman_pet_01',
  'rootswoman_pet_02',
  'rootswoman_pet_03',
  'rootswoman_pet_04'
);

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
values
  ('shared_pet_01', 'character', 150, '/images/heart-shop/character/shared/pets/pet-01.png', null, 1, 'ground', 801, true, 'shared', 'pet', now()),
  ('shared_pet_02', 'character', 150, '/images/heart-shop/character/shared/pets/pet-02.png', null, 1, 'ground', 802, true, 'shared', 'pet', now()),
  ('shared_pet_03', 'character', 150, '/images/heart-shop/character/shared/pets/pet-03.png', null, 1, 'ground', 803, true, 'shared', 'pet', now()),
  ('shared_pet_04', 'character', 150, '/images/heart-shop/character/shared/pets/pet-04.png', null, 1, 'ground', 804, true, 'shared', 'pet', now())
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

  if v_item.category = 'character'
    and v_item.avatar_type <> 'shared'
  then
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

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

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
  'Atomically purchases Love Shop items. Shared character items work for either avatar; avatar-specific items still require the matching current avatar.';

revoke execute on function public.purchase_heart_shop_item(text) from public, anon, authenticated, service_role;
grant execute on function public.purchase_heart_shop_item(text) to authenticated, service_role;


commit;

-- Expected result: four active shared 150-heart pets.
select
  avatar_type,
  character_slot,
  count(*) as item_count,
  min(price) as min_price,
  max(price) as max_price,
  min(sort_order) as first_sort_order,
  max(sort_order) as last_sort_order,
  bool_and(active) as all_active
from public.heart_shop_items
where item_key in (
  'shared_pet_01',
  'shared_pet_02',
  'shared_pet_03',
  'shared_pet_04'
)
group by avatar_type, character_slot
order by avatar_type, character_slot;
