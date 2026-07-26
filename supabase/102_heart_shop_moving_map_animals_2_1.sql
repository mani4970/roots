-- 102_heart_shop_moving_map_animals_2_1.sql
-- Adds Nabi, Kkangchongi, and Salgeumi to the existing Love Shop map catalog.
--
-- Safety:
-- - Reuses the existing heart_shop_items table, RLS policies, explicit grants,
--   purchase RPC, wallet lock, duplicate guard, and spend ledger from SQL 71.
-- - Creates no table, function, sequence, policy, or broad Data API grant.
-- - Does not touch Bible Reflection progress/streak, qt_records, daily_checkins,
--   profiles, reward progress, badges, or existing purchases.

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
  ('nabi',         'map', 40, '/images/heart-shop/previews/nabi.webp',         '/images/heart-shop/source-sprites/nabi.png',         6, 'sky',    70, true, now()),
  ('kkangchongi',  'map', 60, '/images/heart-shop/previews/kkangchongi.webp',  '/images/heart-shop/source-sprites/kkangchongi.png',  8, 'ground', 80, true, now()),
  ('salgeumi',     'map', 25, '/images/heart-shop/previews/salgeumi.webp',     '/images/heart-shop/source-sprites/salgeumi.png',     6, 'soil',   90, true, now())
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

-- Expected result: three active rows with prices 40 / 60 / 25 and
-- frame counts 6 / 8 / 6.
select
  item_key,
  price,
  frame_count,
  placement_zone,
  sort_order,
  active
from public.heart_shop_items
where item_key in ('nabi', 'kkangchongi', 'salgeumi')
order by sort_order;
