-- 106_heart_shop_new_shoes_2_1.sql
-- Adds four Rootsman shoes and four Rootswoman shoes to the Love Shop.
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
  ('rootsman_shoes_05', 'character', 30, '/images/heart-shop/character/rootsman/shoes/shoes-05.png', null, 1, 'ground', 1105, true, 'rootsman', 'shoes', now()),
  ('rootsman_shoes_06', 'character', 30, '/images/heart-shop/character/rootsman/shoes/shoes-06.png', null, 1, 'ground', 1106, true, 'rootsman', 'shoes', now()),
  ('rootsman_shoes_07', 'character', 30, '/images/heart-shop/character/rootsman/shoes/shoes-07.png', null, 1, 'ground', 1107, true, 'rootsman', 'shoes', now()),
  ('rootsman_shoes_08', 'character', 30, '/images/heart-shop/character/rootsman/shoes/shoes-08.png', null, 1, 'ground', 1108, true, 'rootsman', 'shoes', now()),
  ('rootswoman_shoes_05', 'character', 30, '/images/heart-shop/character/rootswoman/shoes/shoes-05.png', null, 1, 'ground', 2105, true, 'rootswoman', 'shoes', now()),
  ('rootswoman_shoes_06', 'character', 30, '/images/heart-shop/character/rootswoman/shoes/shoes-06.png', null, 1, 'ground', 2106, true, 'rootswoman', 'shoes', now()),
  ('rootswoman_shoes_07', 'character', 30, '/images/heart-shop/character/rootswoman/shoes/shoes-07.png', null, 1, 'ground', 2107, true, 'rootswoman', 'shoes', now()),
  ('rootswoman_shoes_08', 'character', 30, '/images/heart-shop/character/rootswoman/shoes/shoes-08.png', null, 1, 'ground', 2108, true, 'rootswoman', 'shoes', now())
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

-- Expected result: four active shoe items per avatar, all priced at 30 hearts.
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
  'rootsman_shoes_05',
  'rootsman_shoes_06',
  'rootsman_shoes_07',
  'rootsman_shoes_08',
  'rootswoman_shoes_05',
  'rootswoman_shoes_06',
  'rootswoman_shoes_07',
  'rootswoman_shoes_08'
)
group by avatar_type, character_slot
order by avatar_type, character_slot;
