-- 143_heart_shop_rootswoman_fw_shoes_2_2.sql
-- Adds four new Rootswoman shoes to the Love Shop.
--
-- Approved catalog:
-- - rootswoman_shoes_09 and rootswoman_shoes_10: boots, 40 Love Hearts
-- - rootswoman_shoes_11 and rootswoman_shoes_12: shoes, 30 Love Hearts
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
  ('rootswoman_shoes_09', 'character', 40, '/images/heart-shop/character/rootswoman/shoes/shoes-09.webp?v=20260904_fw_v1', null, 1, 'ground', 2109, true, 'rootswoman', 'shoes', now()),
  ('rootswoman_shoes_10', 'character', 40, '/images/heart-shop/character/rootswoman/shoes/shoes-10.webp?v=20260904_fw_v1', null, 1, 'ground', 2110, true, 'rootswoman', 'shoes', now()),
  ('rootswoman_shoes_11', 'character', 30, '/images/heart-shop/character/rootswoman/shoes/shoes-11.webp?v=20260904_fw_v1', null, 1, 'ground', 2111, true, 'rootswoman', 'shoes', now()),
  ('rootswoman_shoes_12', 'character', 30, '/images/heart-shop/character/rootswoman/shoes/shoes-12.webp?v=20260904_fw_v1', null, 1, 'ground', 2112, true, 'rootswoman', 'shoes', now())
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
    where (item_key in ('rootswoman_shoes_09', 'rootswoman_shoes_10') and price = 40)
       or (item_key in ('rootswoman_shoes_11', 'rootswoman_shoes_12') and price = 30)
  ) <> 4 then
    raise exception 'Rootswoman FW shoe price postcondition failed';
  end if;

  if exists (
    select 1
    from public.heart_shop_items
    where item_key in (
      'rootswoman_shoes_09',
      'rootswoman_shoes_10',
      'rootswoman_shoes_11',
      'rootswoman_shoes_12'
    )
      and (
        category is distinct from 'character'
        or preview_path not like '/images/heart-shop/character/rootswoman/shoes/shoes-__.webp?v=20260904_fw_v1'
        or sprite_path is not null
        or frame_count is distinct from 1
        or placement_zone is distinct from 'ground'
        or sort_order is distinct from 2100 + right(item_key, 2)::integer
        or active is distinct from true
        or avatar_type is distinct from 'rootswoman'
        or character_slot is distinct from 'shoes'
      )
  ) then
    raise exception 'Rootswoman FW shoe metadata postcondition failed';
  end if;
end
$$;

commit;

-- Read-only postcheck: expected prices are 40, 40, 30, 30.
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
  'rootswoman_shoes_09',
  'rootswoman_shoes_10',
  'rootswoman_shoes_11',
  'rootswoman_shoes_12'
)
order by sort_order;
