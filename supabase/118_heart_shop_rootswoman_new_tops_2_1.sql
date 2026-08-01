-- 118_heart_shop_rootswoman_new_tops_2_1.sql
-- Adds two Rootswoman dresses and two Rootswoman tops to the Love Shop.
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
  ('rootswoman_top_11', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-11.png', null, 1, 'ground', 2211, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_12', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-12.png', null, 1, 'ground', 2212, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_13', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-13.png', null, 1, 'ground', 2213, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_14', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-14.png', null, 1, 'ground', 2214, true, 'rootswoman', 'top', now())
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

-- Expected result: items 11-12 cost 50 hearts, items 13-14 cost 30 hearts.
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
  'rootswoman_top_11',
  'rootswoman_top_12',
  'rootswoman_top_13',
  'rootswoman_top_14'
)
order by sort_order;
