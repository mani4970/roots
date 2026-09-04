-- 142_heart_shop_rootswoman_fw_tops_2_2.sql
-- Adds two Rootswoman dresses and three Rootswoman tops to the Love Shop.
--
-- Approved catalog:
-- - rootswoman_top_23 and rootswoman_top_25: dresses, 70 Love Hearts
-- - rootswoman_top_24, rootswoman_top_26, rootswoman_top_27: tops, 50 Love Hearts
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
  ('rootswoman_top_23', 'character', 70, '/images/heart-shop/character/rootswoman/tops/top-23.webp?v=20260904_fw_v1', null, 1, 'ground', 2223, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_24', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-24.webp?v=20260904_fw_v1', null, 1, 'ground', 2224, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_25', 'character', 70, '/images/heart-shop/character/rootswoman/tops/top-25.webp?v=20260904_fw_v1', null, 1, 'ground', 2225, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_26', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-26.webp?v=20260904_fw_v1', null, 1, 'ground', 2226, true, 'rootswoman', 'top', now()),
  ('rootswoman_top_27', 'character', 50, '/images/heart-shop/character/rootswoman/tops/top-27.webp?v=20260904_fw_v1', null, 1, 'ground', 2227, true, 'rootswoman', 'top', now())
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

-- Stop and roll back unless all five rows match the approved catalog exactly.
do $$
begin
  if (
    select count(*)
    from public.heart_shop_items
    where (item_key in ('rootswoman_top_23', 'rootswoman_top_25') and price = 70)
       or (item_key in ('rootswoman_top_24', 'rootswoman_top_26', 'rootswoman_top_27') and price = 50)
  ) <> 5 then
    raise exception 'Rootswoman FW top price postcondition failed';
  end if;

  if exists (
    select 1
    from public.heart_shop_items
    where item_key in (
      'rootswoman_top_23',
      'rootswoman_top_24',
      'rootswoman_top_25',
      'rootswoman_top_26',
      'rootswoman_top_27'
    )
      and (
        category is distinct from 'character'
        or preview_path not like '/images/heart-shop/character/rootswoman/tops/top-__.webp?v=20260904_fw_v1'
        or sprite_path is not null
        or frame_count is distinct from 1
        or placement_zone is distinct from 'ground'
        or active is distinct from true
        or avatar_type is distinct from 'rootswoman'
        or character_slot is distinct from 'top'
      )
  ) then
    raise exception 'Rootswoman FW top metadata postcondition failed';
  end if;
end
$$;

commit;

-- Read-only postcheck: expected prices are 70, 50, 70, 50, 50.
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
  'rootswoman_top_23',
  'rootswoman_top_24',
  'rootswoman_top_25',
  'rootswoman_top_26',
  'rootswoman_top_27'
)
order by sort_order;
