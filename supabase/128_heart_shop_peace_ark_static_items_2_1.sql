-- 128_heart_shop_peace_ark_static_items_2_1.sql
-- Adds three static Love Shop items for the Peace Ark map.
-- ark_supplies is one item: barrel + grain always move together.
--
-- Safety:
-- - Reuses the existing heart_shop_items table and purchase/toggle RPCs.
-- - No table, function, policy, trigger, sequence, or broad grant is created.
-- - Does not touch Bible Reflection progress/streak, qt_records, daily_checkins,
--   group/companion challenges, badges, profiles progress, or existing purchases.

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
  (
    'ark_supplies',
    'map',
    40,
    '/images/reward-maps/peace-ark/static-items/ark-supplies.webp',
    '/images/reward-maps/peace-ark/static-items/ark-supplies.webp',
    1,
    'ground',
    1,
    true,
    now()
  ),
  (
    'ark_workbench',
    'map',
    40,
    '/images/reward-maps/peace-ark/static-items/ark-workbench.webp',
    '/images/reward-maps/peace-ark/static-items/ark-workbench.webp',
    1,
    'ground',
    2,
    true,
    now()
  ),
  (
    'ark_lantern',
    'map',
    40,
    '/images/reward-maps/peace-ark/static-items/ark-lantern.webp',
    '/images/reward-maps/peace-ark/static-items/ark-lantern.webp',
    1,
    'ground',
    3,
    true,
    now()
  )
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

-- Postcheck: exactly three active rows, all at 40 hearts and one frame.
select
  item_key,
  price,
  frame_count,
  placement_zone,
  sort_order,
  active
from public.heart_shop_items
where item_key in ('ark_supplies', 'ark_workbench', 'ark_lantern')
order by sort_order;
