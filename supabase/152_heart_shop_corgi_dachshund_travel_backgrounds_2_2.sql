-- 152_heart_shop_corgi_dachshund_travel_backgrounds_2_2.sql
-- Adds two shared pets and four shared profile backgrounds to the Love Shop.
--
-- Approved catalog:
-- - shared_pet_08: Welsh Corgi, 150 Hearts
-- - shared_pet_09: Dachshund, 150 Hearts
-- - shared_background_25: Venice, free
-- - shared_background_26: Dolomites, free
-- - shared_background_27: Quebec, free
-- - shared_background_28: Grand Canyon, free
--
-- The new pets lead their category. Photo with Jesus stays first among
-- backgrounds, followed by the four new destinations in the order above.
-- Catalog rows only: no changes to wallets, purchases, profile preferences,
-- functions, grants, RLS, Bible Reflection, growth, or challenge rewards.
-- Run this complete file in SQL Editor after deploying the matching assets.

begin;

-- Preserve the existing paid, pinned background instead of recreating it.
do $$
begin
  if not exists (
    select 1
    from public.heart_shop_items
    where item_key = 'shared_background_15'
      and category = 'character'
      and price = 300
      and active = true
      and avatar_type = 'shared'
      and character_slot = 'background'
  ) then
    raise exception 'Expected existing Photo with Jesus background';
  end if;

  if exists (
    select 1
    from (
      values
        ('shared_pet_08'::text, 'pet'::text),
        ('shared_pet_09', 'pet'),
        ('shared_background_25', 'background'),
        ('shared_background_26', 'background'),
        ('shared_background_27', 'background'),
        ('shared_background_28', 'background')
    ) as expected(item_key, character_slot)
    join public.heart_shop_items item on item.item_key = expected.item_key
    where item.category is distinct from 'character'
       or item.avatar_type is distinct from 'shared'
       or item.character_slot is distinct from expected.character_slot
  ) then
    raise exception 'A new Love Shop key is already used by another item type';
  end if;
end
$$;

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
  ('shared_pet_08', 'character', 150, '/images/heart-shop/character/shared/pets/pet-08.webp', null, 1, 'ground', 798, true, 'shared', 'pet', now()),
  ('shared_pet_09', 'character', 150, '/images/heart-shop/character/shared/pets/pet-09.webp', null, 1, 'ground', 799, true, 'shared', 'pet', now()),
  ('shared_background_25', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-25.webp?v=20260911_travel_v1', null, 1, 'ground', 877, true, 'shared', 'background', now()),
  ('shared_background_26', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-26.webp?v=20260911_travel_v1', null, 1, 'ground', 878, true, 'shared', 'background', now()),
  ('shared_background_27', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-27.webp?v=20260911_travel_v1', null, 1, 'ground', 879, true, 'shared', 'background', now()),
  ('shared_background_28', 'character', 0, '/images/heart-shop/character/shared/profile-backgrounds/background-28.webp?v=20260911_travel_v1', null, 1, 'ground', 880, true, 'shared', 'background', now())
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

-- Move only the pinned row; all other existing item ordering is preserved.
update public.heart_shop_items
set sort_order = 876,
    updated_at = now()
where item_key = 'shared_background_15'
  and sort_order is distinct from 876;

do $$
begin
  if exists (
    select 1
    from (
      values
        ('shared_pet_08'::text, 150, 798, 'pet'::text, '/images/heart-shop/character/shared/pets/pet-08.webp'::text),
        ('shared_pet_09', 150, 799, 'pet', '/images/heart-shop/character/shared/pets/pet-09.webp'),
        ('shared_background_25', 0, 877, 'background', '/images/heart-shop/character/shared/profile-backgrounds/background-25.webp?v=20260911_travel_v1'),
        ('shared_background_26', 0, 878, 'background', '/images/heart-shop/character/shared/profile-backgrounds/background-26.webp?v=20260911_travel_v1'),
        ('shared_background_27', 0, 879, 'background', '/images/heart-shop/character/shared/profile-backgrounds/background-27.webp?v=20260911_travel_v1'),
        ('shared_background_28', 0, 880, 'background', '/images/heart-shop/character/shared/profile-backgrounds/background-28.webp?v=20260911_travel_v1')
    ) as expected(item_key, price, sort_order, character_slot, preview_path)
    left join public.heart_shop_items item on item.item_key = expected.item_key
    where item.item_key is null
       or item.category is distinct from 'character'
       or item.price is distinct from expected.price
       or item.sort_order is distinct from expected.sort_order
       or item.character_slot is distinct from expected.character_slot
       or item.preview_path is distinct from expected.preview_path
       or item.active is distinct from true
       or item.avatar_type is distinct from 'shared'
       or item.sprite_path is not null
       or item.frame_count is distinct from 1
       or item.placement_zone is distinct from 'ground'
  ) then
    raise exception 'New pet and travel background catalog postcondition failed';
  end if;

  if exists (
    select 1
    from public.heart_shop_items
    where category = 'character'
      and avatar_type = 'shared'
      and active = true
      and (
        (character_slot = 'background'
         and item_key not in ('shared_background_15', 'shared_background_25', 'shared_background_26', 'shared_background_27', 'shared_background_28')
         and sort_order <= 880)
        or
        (character_slot = 'pet'
         and item_key not in ('shared_pet_08', 'shared_pet_09')
         and sort_order <= 799)
      )
  ) then
    raise exception 'An existing item conflicts with the approved category order';
  end if;
end
$$;

commit;

-- Read-only postcheck: two 150-heart pets and Jesus followed by four free rows.
select item_key, price, preview_path, sort_order, active, avatar_type, character_slot
from public.heart_shop_items
where item_key in (
  'shared_pet_08', 'shared_pet_09', 'shared_background_15',
  'shared_background_25', 'shared_background_26', 'shared_background_27', 'shared_background_28'
)
order by character_slot, sort_order, item_key;
