-- 150_heart_shop_rootsman_tops_refresh_2_2.sql
-- Adds Rootsman tops 23-26 to the Love Shop at 30 Love Hearts each.
--
-- Safety scope:
-- - Reuses the existing heart_shop_items table, RLS policies, explicit grants,
--   purchase/toggle RPCs, wallet lock, duplicate guard, and spend ledger.
-- - Uses duplicate-safe upserts and does not delete or deactivate existing items.
-- - Creates no table, function, sequence, policy, grant, or RLS change.
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
  ('rootsman_top_23', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-23.webp?v=20260905_fw_v2', null, 1, 'ground', 1223, true, 'rootsman', 'top', now()),
  ('rootsman_top_24', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-24.webp?v=20260905_fw_v2', null, 1, 'ground', 1224, true, 'rootsman', 'top', now()),
  ('rootsman_top_25', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-25.webp?v=20260905_fw_v2', null, 1, 'ground', 1225, true, 'rootsman', 'top', now()),
  ('rootsman_top_26', 'character', 30, '/images/heart-shop/character/rootsman/tops/top-26.webp?v=20260905_fw_v2', null, 1, 'ground', 1226, true, 'rootsman', 'top', now())
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

-- Stop and roll back unless all four rows match the approved catalog exactly.
do $$
begin
  if (
    select count(*)
    from public.heart_shop_items
    where item_key in (
      'rootsman_top_23',
      'rootsman_top_24',
      'rootsman_top_25',
      'rootsman_top_26'
    )
      and price = 30
      and preview_path = '/images/heart-shop/character/rootsman/tops/'
        || replace(item_key, 'rootsman_top_', 'top-') || '.webp?v=20260905_fw_v2'
      and sprite_path is null
      and frame_count = 1
      and placement_zone = 'ground'
      and sort_order = 1200 + right(item_key, 2)::integer
      and active = true
      and avatar_type = 'rootsman'
      and character_slot = 'top'
  ) <> 4 then
    raise exception 'New Rootsman top catalog postcondition failed';
  end if;
end
$$;

commit;

-- Read-only postcheck: all four rows must remain active at 30 Love Hearts.
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
  'rootsman_top_23',
  'rootsman_top_24',
  'rootsman_top_25',
  'rootsman_top_26'
)
order by sort_order;
