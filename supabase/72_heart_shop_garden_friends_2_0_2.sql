-- 72_heart_shop_garden_friends_2_0_2.sql
-- Adds Bamtoli and Mongsili to the existing server-authoritative Love Shop catalog.
--
-- Safety:
-- - Reuses the existing heart_shop_items table, RLS policies, explicit grants,
--   purchase RPC, wallet lock, duplicate guard, and spend ledger from SQL 71.
-- - Creates no new table, function, sequence, policy, or broad Data API grant.
-- - Does not touch Bible Reflection progress/streak, qt_records, daily_checkins,
--   companion challenges, group challenges, or existing purchases.

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
  updated_at
)
values
  ('bamtoli',  'map', 60, '/images/heart-shop/previews/bamtoli.webp',  '/images/heart-shop/source-sprites/bamtoli.png',  6, 'ground', 50, true, now()),
  ('mongsili', 'map', 60, '/images/heart-shop/previews/mongsili.webp', '/images/heart-shop/source-sprites/mongsili.png', 6, 'ground', 60, true, now())
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
  updated_at = now();

commit;

-- Postcheck: both rows should be active, price 60, frame_count 6.
select
  item_key,
  price,
  frame_count,
  placement_zone,
  sort_order,
  active
from public.heart_shop_items
where item_key in ('bamtoli', 'mongsili')
order by sort_order;
