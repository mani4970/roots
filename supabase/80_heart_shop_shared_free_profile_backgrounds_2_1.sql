-- 80_heart_shop_shared_free_profile_backgrounds_2_1.sql
-- Adds six shared, free profile-character backgrounds to the Love Shop.
--
-- Safety scope:
-- - Reuses the existing Love Shop catalog, ownership table, RLS policies,
--   and authenticated-only item-toggle RPC.
-- - Free backgrounds never touch Love Heart wallets or spend events.
-- - Does not change reflection progress, streaks, daily check-ins, profiles,
--   badges, reward maps, companion challenges, or group challenges.

begin;

-- The catalog and ownership records must be able to represent genuinely free items.
alter table public.heart_shop_items
  drop constraint if exists heart_shop_items_price_check,
  add constraint heart_shop_items_price_check check (price >= 0);

alter table public.heart_shop_purchases
  drop constraint if exists heart_shop_purchases_price_paid_check,
  add constraint heart_shop_purchases_price_paid_check check (price_paid >= 0);

-- "shared" means the layer is compatible with both Rootsman and Rootswoman.
alter table public.heart_shop_items
  drop constraint if exists heart_shop_items_avatar_type_check,
  add constraint heart_shop_items_avatar_type_check
    check (avatar_type is null or avatar_type in ('rootsman', 'rootswoman', 'shared')),
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
        'hair_accessory',
        'headwear'
      )
    );

comment on column public.heart_shop_items.avatar_type is
  'Character-item compatibility. NULL for map items; rootsman, rootswoman, or shared for character layers.';

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
  ('shared_background_01', 'character', 0, '/images/heart-shop/character/shared/backgrounds/background-01.png', null, 1, 'ground', 901, true, 'shared', 'background', now()),
  ('shared_background_02', 'character', 0, '/images/heart-shop/character/shared/backgrounds/background-02.png', null, 1, 'ground', 902, true, 'shared', 'background', now()),
  ('shared_background_03', 'character', 0, '/images/heart-shop/character/shared/backgrounds/background-03.png', null, 1, 'ground', 903, true, 'shared', 'background', now()),
  ('shared_background_04', 'character', 0, '/images/heart-shop/character/shared/backgrounds/background-04.png', null, 1, 'ground', 904, true, 'shared', 'background', now()),
  ('shared_background_05', 'character', 0, '/images/heart-shop/character/shared/backgrounds/background-05.png', null, 1, 'ground', 905, true, 'shared', 'background', now()),
  ('shared_background_06', 'character', 0, '/images/heart-shop/character/shared/backgrounds/background-06.png', null, 1, 'ground', 906, true, 'shared', 'background', now())
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

-- Free application persists the selected background without touching any wallet.
create or replace function public.apply_free_heart_shop_item(
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
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select item.*
  into v_item
  from public.heart_shop_items item
  where item.item_key = p_item_key
    and item.active = true
    and item.category = 'character'
    and item.price = 0
    and item.avatar_type = 'shared'
    and item.character_slot = 'background';

  if not found then
    return jsonb_build_object(
      'applied', false,
      'reason', 'not_free_background',
      'item_key', p_item_key,
      'is_enabled', false
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  update public.heart_shop_purchases purchase
  set is_enabled = false,
      updated_at = now()
  from public.heart_shop_items owned_item
  where purchase.user_id = v_user_id
    and purchase.item_key = owned_item.item_key
    and purchase.item_key <> v_item.item_key
    and owned_item.category = 'character'
    and owned_item.avatar_type = 'shared'
    and owned_item.character_slot = 'background'
    and purchase.is_enabled = true;

  insert into public.heart_shop_purchases (
    user_id,
    item_key,
    price_paid,
    is_enabled,
    purchased_at,
    updated_at
  )
  values (v_user_id, v_item.item_key, 0, true, now(), now())
  on conflict (user_id, item_key) do update
  set is_enabled = true,
      updated_at = now();

  return jsonb_build_object(
    'applied', true,
    'reason', 'applied',
    'item_key', v_item.item_key,
    'is_enabled', true
  );
end;
$$;

comment on function public.apply_free_heart_shop_item(text) is
  'Applies one authenticated user''s shared free profile background without changing Love Hearts or spend events.';

-- Keep the existing toggle behavior, but allow shared character backgrounds
-- to be enabled for either avatar type.
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

  if p_enabled
    and v_item.category = 'character'
    and v_item.avatar_type <> 'shared'
  then
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
  'Updates one owned Love Shop item. Shared backgrounds work for either avatar; other character layers still require the matching avatar.';

revoke execute on function public.apply_free_heart_shop_item(text) from public, anon, authenticated, service_role;
grant execute on function public.apply_free_heart_shop_item(text) to authenticated, service_role;

revoke execute on function public.set_heart_shop_item_enabled(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_heart_shop_item_enabled(text, boolean) to authenticated, service_role;

commit;

-- Postcheck 1: expected 6 active shared backgrounds, all free.
select
  count(*) as shared_background_count,
  min(price) as min_price,
  max(price) as max_price,
  bool_and(active) as all_active
from public.heart_shop_items
where avatar_type = 'shared'
  and character_slot = 'background';

-- Postcheck 2: anon must not execute the free-apply RPC; authenticated must.
select
  has_function_privilege('anon', 'public.apply_free_heart_shop_item(text)', 'EXECUTE') as anon_can_apply,
  has_function_privilege('authenticated', 'public.apply_free_heart_shop_item(text)', 'EXECUTE') as authenticated_can_apply;
