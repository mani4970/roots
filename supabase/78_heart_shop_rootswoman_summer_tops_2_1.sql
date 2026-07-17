-- 78_heart_shop_rootswoman_summer_tops_2_1.sql
-- Adds four Rootswoman summer tops to the existing Love Shop catalog.
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
  ('rootswoman_top_07', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-07.png', null, 1, 'ground', 2207, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_08', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-08.png', null, 1, 'ground', 2208, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_09', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-09.png', null, 1, 'ground', 2209, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_10', 'character', 30, '/images/heart-shop/character/rootswoman/tops/top-10.png', null, 1, 'ground', 2210, true, 'rootswoman', 'top', now())
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

-- Postcheck: expected four active Rootswoman tops, all priced at 30 hearts.
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
  'rootswoman_top_07',
  'rootswoman_top_08',
  'rootswoman_top_09',
  'rootswoman_top_10'
)
group by avatar_type, character_slot;
