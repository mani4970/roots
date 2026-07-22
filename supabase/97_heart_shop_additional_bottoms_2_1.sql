-- 97_heart_shop_additional_bottoms_2_1.sql
-- Adds four Rootsman bottoms and four Rootswoman bottoms to the Love Shop.
--
-- Safety scope:
-- - Reuses the existing heart_shop_items table, RLS policies, explicit grants,
--   purchase/toggle RPCs, wallet lock, duplicate guard, and spend ledger.
-- - Creates no new table, function, sequence, policy, or Data API grant.
-- - Does not touch reflection progress, streaks, daily check-ins, profiles,
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
  ('rootsman_bottom_07', 'character', 30, '/images/heart-shop/character/rootsman/bottoms/bottom-07.png', null, 1, 'ground', 1007, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_08', 'character', 30, '/images/heart-shop/character/rootsman/bottoms/bottom-08.png', null, 1, 'ground', 1008, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_09', 'character', 30, '/images/heart-shop/character/rootsman/bottoms/bottom-09.png', null, 1, 'ground', 1009, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_10', 'character', 30, '/images/heart-shop/character/rootsman/bottoms/bottom-10.png', null, 1, 'ground', 1010, true, 'rootsman', 'bottom', now()),
  ('rootswoman_bottom_07', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-07.png', null, 1, 'ground', 2007, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_08', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-08.png', null, 1, 'ground', 2008, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_09', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-09.png', null, 1, 'ground', 2009, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_10', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-10.png', null, 1, 'ground', 2010, true, 'rootswoman', 'bottom', now())
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

-- Expected result: four active bottoms per avatar, all priced at 30 hearts.
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
  'rootsman_bottom_07',
  'rootsman_bottom_08',
  'rootsman_bottom_09',
  'rootsman_bottom_10',
  'rootswoman_bottom_07',
  'rootswoman_bottom_08',
  'rootswoman_bottom_09',
  'rootswoman_bottom_10'
)
group by avatar_type, character_slot
order by avatar_type, character_slot;
