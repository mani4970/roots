-- 76_heart_shop_rootswoman_accessories_bags_2_1.sql
-- Adds Rootswoman hair accessories and bags to the existing Love Shop catalog.
--
-- Safety scope:
-- - Reuses the existing heart_shop_items table, RLS policies, explicit grants,
--   purchase/toggle RPCs, wallet lock, duplicate guard, and spend ledger.
-- - Creates no new table, function, sequence, policy, or Data API grant.
-- - Does not touch reflection progress, streaks, daily check-ins, profiles,
--   badges, reward maps, companion challenges, or group challenges.
-- - The supplied bag archive contains items 02-04 only; item 01 is not seeded.

begin;

alter table public.heart_shop_items
  drop constraint if exists heart_shop_items_character_slot_check,
  add constraint heart_shop_items_character_slot_check
    check (
      character_slot is null
      or character_slot in (
        'bottom',
        'shoes',
        'top',
        'bag',
        'eyewear',
        'hair_accessory',
        'headwear'
      )
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
  ('rootswoman_hair_accessory_01', 'character', 5, '/images/heart-shop/character/rootswoman/hair-accessories/hair-accessory-01.png', null, 1, 'ground', 2501, true, 'rootswoman', 'hair_accessory', now()),
  ('rootswoman_hair_accessory_02', 'character', 5, '/images/heart-shop/character/rootswoman/hair-accessories/hair-accessory-02.png', null, 1, 'ground', 2502, true, 'rootswoman', 'hair_accessory', now()),
  ('rootswoman_hair_accessory_03', 'character', 5, '/images/heart-shop/character/rootswoman/hair-accessories/hair-accessory-03.png', null, 1, 'ground', 2503, true, 'rootswoman', 'hair_accessory', now()),
  ('rootswoman_hair_accessory_04', 'character', 5, '/images/heart-shop/character/rootswoman/hair-accessories/hair-accessory-04.png', null, 1, 'ground', 2504, true, 'rootswoman', 'hair_accessory', now()),
  ('rootswoman_hair_accessory_05', 'character', 5, '/images/heart-shop/character/rootswoman/hair-accessories/hair-accessory-05.png', null, 1, 'ground', 2505, true, 'rootswoman', 'hair_accessory', now()),
  ('rootswoman_hair_accessory_06', 'character', 5, '/images/heart-shop/character/rootswoman/hair-accessories/hair-accessory-06.png', null, 1, 'ground', 2506, true, 'rootswoman', 'hair_accessory', now()),
  ('rootswoman_bag_02', 'character', 40, '/images/heart-shop/character/rootswoman/bags/bag-02.png', null, 1, 'ground', 2602, true, 'rootswoman', 'bag', now()),
  ('rootswoman_bag_03', 'character', 40, '/images/heart-shop/character/rootswoman/bags/bag-03.png', null, 1, 'ground', 2603, true, 'rootswoman', 'bag', now()),
  ('rootswoman_bag_04', 'character', 40, '/images/heart-shop/character/rootswoman/bags/bag-04.png', null, 1, 'ground', 2604, true, 'rootswoman', 'bag', now())
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

commit;

-- Postcheck: expected hair_accessory 6 and bag 3, all Rootswoman-only.
select
  character_slot,
  count(*) as item_count,
  min(price) as min_price,
  max(price) as max_price,
  bool_and(active) as all_active
from public.heart_shop_items
where item_key in (
  'rootswoman_hair_accessory_01',
  'rootswoman_hair_accessory_02',
  'rootswoman_hair_accessory_03',
  'rootswoman_hair_accessory_04',
  'rootswoman_hair_accessory_05',
  'rootswoman_hair_accessory_06',
  'rootswoman_bag_02',
  'rootswoman_bag_03',
  'rootswoman_bag_04'
)
group by character_slot
order by character_slot;
