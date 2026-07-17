-- 79_heart_shop_all_character_tops_price_2_1.sql
-- Aligns every Rootsman and Rootswoman top to 30 hearts.
--
-- Safety scope:
-- - Reuses the existing heart_shop_items table and purchase flow.
-- - Creates no table, function, policy, sequence, or Data API grant.
-- - Does not change item ownership, equipped state, wallets, or purchase history.
-- - Ensures the eight newly added summer tops exist even if their earlier
--   catalog SQL was not run, then aligns every character top price to 30.

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
  ('rootsman_top_07', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-07.png', null, 1, 'ground', 1190, true, 'rootsman', 'top', now()),
  ('rootsman_top_08', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-08.png', null, 1, 'ground', 1191, true, 'rootsman', 'top', now()),
  ('rootsman_top_09', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-09.png', null, 1, 'ground', 1192, true, 'rootsman', 'top', now()),
  ('rootsman_top_10', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-10.png', null, 1, 'ground', 1193, true, 'rootsman', 'top', now()),
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

update public.heart_shop_items
set
  price = 30,
  updated_at = now()
where category = 'character'
  and avatar_type in ('rootsman', 'rootswoman')
  and character_slot = 'top'
  and price is distinct from 30;

commit;

-- Postcheck: expected 10 active tops per avatar, with both price bounds at 30.
select
  avatar_type,
  count(*) as item_count,
  min(price) as min_price,
  max(price) as max_price,
  bool_and(active) as all_active
from public.heart_shop_items
where category = 'character'
  and avatar_type in ('rootsman', 'rootswoman')
  and character_slot = 'top'
group by avatar_type
order by avatar_type;
