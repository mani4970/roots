-- 122_heart_shop_rootsman_rootswoman_new_clothes_2_1.sql
-- Upserts the latest Rootsman clothes 11-14 and adds new Rootswoman clothes to the Love Shop.
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
  ('rootsman_bottom_11', 'character', 30, '/images/heart-shop/character/rootsman/bottoms/bottom-11.png', null, 1, 'ground', 1011, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_12', 'character', 30, '/images/heart-shop/character/rootsman/bottoms/bottom-12.png', null, 1, 'ground', 1012, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_13', 'character', 30, '/images/heart-shop/character/rootsman/bottoms/bottom-13.png', null, 1, 'ground', 1013, true, 'rootsman', 'bottom', now()),
  ('rootsman_bottom_14', 'character', 30, '/images/heart-shop/character/rootsman/bottoms/bottom-14.png', null, 1, 'ground', 1014, true, 'rootsman', 'bottom', now()),
  ('rootsman_top_11', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-11.png', null, 1, 'ground', 1211, true, 'rootsman', 'top', now()),
  ('rootsman_top_12', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-12.png', null, 1, 'ground', 1212, true, 'rootsman', 'top', now()),
  ('rootsman_top_13', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-13.png', null, 1, 'ground', 1213, true, 'rootsman', 'top', now()),
  ('rootsman_top_14', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-14.png', null, 1, 'ground', 1214, true, 'rootsman', 'top', now()),
  ('rootswoman_bottom_11', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-11.png', null, 1, 'ground', 2011, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_12', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-12.png', null, 1, 'ground', 2012, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_13', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-13.png', null, 1, 'ground', 2013, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_bottom_14', 'character', 30, '/images/heart-shop/character/rootswoman/bottoms/bottom-14.png', null, 1, 'ground', 2014, true, 'rootswoman', 'bottom', now()),
  ('rootswoman_top_15', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-15.png', null, 1, 'ground', 2215, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_16', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-16.png', null, 1, 'ground', 2216, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_17', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-17.png', null, 1, 'ground', 2217, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_18', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-18.png', null, 1, 'ground', 2218, true, 'rootswoman', 'top', now())
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

-- Expected result: sixteen active clothing items, all priced at 30 hearts.
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
  'rootsman_bottom_11',
  'rootsman_bottom_12',
  'rootsman_bottom_13',
  'rootsman_bottom_14',
  'rootsman_top_11',
  'rootsman_top_12',
  'rootsman_top_13',
  'rootsman_top_14',
  'rootswoman_bottom_11',
  'rootswoman_bottom_12',
  'rootswoman_bottom_13',
  'rootswoman_bottom_14',
  'rootswoman_top_15',
  'rootswoman_top_16',
  'rootswoman_top_17',
  'rootswoman_top_18'
)
order by sort_order;
