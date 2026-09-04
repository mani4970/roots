-- 141_heart_shop_rootswoman_new_bottoms_2_2.sql
-- Adds four new Rootswoman bottoms to the Love Shop.
--
-- Safety scope:
-- - Reuses the existing heart_shop_items table, RLS policies, explicit grants,
--   purchase/toggle RPCs, wallet lock, duplicate guard, and spend ledger.
-- - Uses duplicate-safe upserts and does not delete or deactivate existing items.
-- - Creates no new table, function, sequence, policy, or Data API grant.
-- - Does not touch Bible Reflection progress, streaks, daily check-ins, profiles,
--   badges, reward maps, companion challenges, or group challenges.

begin;

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
  ('rootswoman_bottom_15', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-15.webp', null, 1, 'ground', 2015, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_16', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-16.webp', null, 1, 'ground', 2016, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_17', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-17.webp', null, 1, 'ground', 2017, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_18', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-18.webp', null, 1, 'ground', 2018, true, 'rootswoman', 'bottom', now())
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

-- Expected result: four active WebP bottom layers, each priced at 30 Love Hearts.
select
  item_key,
  price,
  preview_path,
  sort_order,
  active,
  avatar_type,
  character_slot
from public.heart_shop_items
where item_key in (
  'rootswoman_bottom_15',
  'rootswoman_bottom_16',
  'rootswoman_bottom_17',
  'rootswoman_bottom_18'
)
order by sort_order;
