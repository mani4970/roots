-- 133_heart_shop_new_profile_tops_2_2.sql
-- Adds four new Rootsman tops and four new Rootswoman tops to the Love Shop.
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
  ('rootsman_top_15', 'character', 50, '/images/heart-shop/character/rootsman/tops/top-15.webp', null, 1, 'ground', 1215, true, 'rootsman', 'top', now()),
  ('rootsman_top_16', 'character', 50, '/images/heart-shop/character/rootsman/tops/top-16.webp', null, 1, 'ground', 1216, true, 'rootsman', 'top', now()),
  ('rootsman_top_17', 'character', 50, '/images/heart-shop/character/rootsman/tops/top-17.webp', null, 1, 'ground', 1217, true, 'rootsman', 'top', now()),
  ('rootsman_top_18', 'character', 50, '/images/heart-shop/character/rootsman/tops/top-18.webp', null, 1, 'ground', 1218, true, 'rootsman', 'top', now()),
  ('rootswoman_top_19', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-19.webp', null, 1, 'ground', 2219, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_20', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-20.webp', null, 1, 'ground', 2220, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_21', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-21.webp', null, 1, 'ground', 2221, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_22', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-22.webp', null, 1, 'ground', 2222, true, 'rootswoman', 'top', now())
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

-- Expected result: eight active WebP top layers, each priced at 50 Love Hearts.
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
  'rootsman_top_15',
  'rootsman_top_16',
  'rootsman_top_17',
  'rootsman_top_18',
  'rootswoman_top_19',
  'rootswoman_top_20',
  'rootswoman_top_21',
  'rootswoman_top_22'
)
order by avatar_type, sort_order;
