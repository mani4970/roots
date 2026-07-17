-- 77_heart_shop_rootsman_summer_tops_bag_update_2_1.sql
-- Adds four Rootsman summer tops and finalizes the four Rootswoman bags.
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
  ('rootsman_top_07', 'character', 20, '/images/heart-shop/character/rootsman/tops/top-07.png', null, 1, 'ground', 1190, true, 'rootsman', 'top', now()),
  ('rootsman_top_08', 'character', 20, '/images/heart-shop/character/rootsman/tops/top-08.png', null, 1, 'ground', 1191, true, 'rootsman', 'top', now()),
  ('rootsman_top_09', 'character', 20, '/images/heart-shop/character/rootsman/tops/top-09.png', null, 1, 'ground', 1192, true, 'rootsman', 'top', now()),
  ('rootsman_top_10', 'character', 20, '/images/heart-shop/character/rootsman/tops/top-10.png', null, 1, 'ground', 1193, true, 'rootsman', 'top', now()),
  ('rootswoman_bag_01', 'character', 30, '/images/heart-shop/character/rootswoman/bags/bag-01.png', null, 1, 'ground', 2601, true, 'rootswoman', 'bag', now()),
  ('rootswoman_bag_02', 'character', 30, '/images/heart-shop/character/rootswoman/bags/bag-02.png', null, 1, 'ground', 2602, true, 'rootswoman', 'bag', now()),
  ('rootswoman_bag_03', 'character', 30, '/images/heart-shop/character/rootswoman/bags/bag-03.png', null, 1, 'ground', 2603, true, 'rootswoman', 'bag', now()),
  ('rootswoman_bag_04', 'character', 30, '/images/heart-shop/character/rootswoman/bags/bag-04.png', null, 1, 'ground', 2604, true, 'rootswoman', 'bag', now())
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

-- Postcheck: expected Rootsman top 4 at 20 hearts and Rootswoman bag 4 at 30 hearts.
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
  'rootsman_top_07',
  'rootsman_top_08',
  'rootsman_top_09',
  'rootsman_top_10',
  'rootswoman_bag_01',
  'rootswoman_bag_02',
  'rootswoman_bag_03',
  'rootswoman_bag_04'
)
group by avatar_type, character_slot
order by avatar_type, character_slot;
