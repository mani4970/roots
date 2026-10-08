-- 159_heart_shop_bibles_cross_necklaces_2_2.sql
-- Source: roots_safe_current_20261008_0823.zip
-- SHA-256: d784326bdb78741a4031a6a77406a3c35593178bd637427d951641ccdeba8060
-- Adds two crossbody Bibles (30 hearts) and four cross necklaces (70 hearts).
-- Bibles reuse the bag slot; necklaces are exclusive only with other necklaces.
-- Neither buying nor equipping a necklace automatically removes a muffler.
-- Changes only one existing slot CHECK and six new catalog rows.
-- Existing items, purchases, wallets, RLS, grants and RPC functions are not edited.
-- Run the ENTIRE file in Roots SQL Editor after local QA, before code deployment.
-- Matching rows/timestamps stay unchanged. Any conflict rolls back the whole file.
-- The CHECK change needs a brief table lock. Abort immediately if the table is busy;
-- do not remove the lock guard or retry continuously. Review before retrying later.

begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';
lock table public.heart_shop_items in access exclusive mode nowait;

do $accessories$
declare
  definition text;
  validated boolean;
  previous_definition constant text := $previous$CHECK (((character_slot IS NULL) OR (character_slot = ANY (ARRAY['background'::text, 'bottom'::text, 'shoes'::text, 'top'::text, 'bag'::text, 'eyewear'::text, 'hair'::text, 'hair_accessory'::text, 'muffler'::text, 'headwear'::text, 'pet'::text]))))$previous$;
  next_definition constant text := $next$CHECK (((character_slot IS NULL) OR (character_slot = ANY (ARRAY['background'::text, 'bottom'::text, 'shoes'::text, 'top'::text, 'bag'::text, 'eyewear'::text, 'hair'::text, 'hair_accessory'::text, 'muffler'::text, 'headwear'::text, 'pet'::text, 'necklace'::text]))))$next$;
  wanted record;
  actual public.heart_shop_items%rowtype;
  inserted_count integer := 0;
  affected_count integer;
  checked_count integer := 0;
begin
  -- Reject unexpected schema drift rather than silently replacing newer rules.
  select pg_get_constraintdef(c.oid), c.convalidated
    into definition, validated
  from pg_constraint c
  where c.conrelid = 'public.heart_shop_items'::regclass
    and c.conname = 'heart_shop_items_character_slot_check'
    and c.contype = 'c';
  if not found or validated is not true then
    raise exception 'Accessories: expected validated character-slot CHECK is missing. Nothing changed.';
  end if;

  if regexp_replace(definition, '[[:space:]()]', '', 'g') =
     regexp_replace(previous_definition, '[[:space:]()]', '', 'g') then
    alter table public.heart_shop_items
      drop constraint heart_shop_items_character_slot_check,
      add constraint heart_shop_items_character_slot_check check (
        character_slot is null or character_slot in (
          'background', 'bottom', 'shoes', 'top', 'bag', 'eyewear', 'hair', 'hair_accessory', 'muffler', 'headwear', 'pet', 'necklace'
        )
      );
  elsif regexp_replace(definition, '[[:space:]()]', '', 'g') <>
        regexp_replace(next_definition, '[[:space:]()]', '', 'g') then
    raise exception 'Accessories: unexpected character-slot CHECK. Stop and compare the current schema; nothing changed.';
  end if;

  for wanted in
    select * from (values
      ('rootsman_bag_01', 'rootsman', 'bag', 30, '/images/heart-shop/character/rootsman/bags/bag-01-thumb.webp?v=20261008_v1', 1501),
      ('rootsman_necklace_01', 'rootsman', 'necklace', 70, '/images/heart-shop/character/rootsman/necklaces/necklace-01-thumb.webp?v=20261008_v1', 1951),
      ('rootsman_necklace_02', 'rootsman', 'necklace', 70, '/images/heart-shop/character/rootsman/necklaces/necklace-02-thumb.webp?v=20261008_v1', 1952),
      ('rootswoman_bag_05', 'rootswoman', 'bag', 30, '/images/heart-shop/character/rootswoman/bags/bag-05-thumb.webp?v=20261008_v1', 2505),
      ('rootswoman_necklace_01', 'rootswoman', 'necklace', 70, '/images/heart-shop/character/rootswoman/necklaces/necklace-01-thumb.webp?v=20261008_v1', 2951),
      ('rootswoman_necklace_02', 'rootswoman', 'necklace', 70, '/images/heart-shop/character/rootswoman/necklaces/necklace-02-thumb.webp?v=20261008_v1', 2952)
    ) as v(item_key, avatar_type, character_slot, price, preview_path, sort_order)
    order by item_key
  loop
    insert into public.heart_shop_items (
      item_key, category, price, preview_path, sprite_path, frame_count,
      placement_zone, sort_order, active, avatar_type, character_slot
    ) values (
      wanted.item_key, 'character', wanted.price, wanted.preview_path, null, 1,
      'ground', wanted.sort_order, true, wanted.avatar_type, wanted.character_slot
    ) on conflict (item_key) do nothing;
    get diagnostics affected_count = row_count;
    inserted_count := inserted_count + affected_count;

    select * into actual from public.heart_shop_items
      where item_key = wanted.item_key;
    if not found then
      raise exception 'Accessories: missing catalog row %', wanted.item_key;
    end if;
    if row(actual.category, actual.price, actual.preview_path, actual.sprite_path,
           actual.frame_count, actual.placement_zone, actual.sort_order,
           actual.active, actual.avatar_type, actual.character_slot)
       is distinct from
       row('character'::text, wanted.price, wanted.preview_path, null::text,
           1, 'ground'::text, wanted.sort_order,
           true, wanted.avatar_type, wanted.character_slot) then
      raise exception 'Accessories: conflicting item %. No existing row was overwritten; all changes are rolled back.', wanted.item_key;
    end if;
    checked_count := checked_count + 1;
  end loop;
  if checked_count <> 6 then
    raise exception 'Accessories: expected 6 verified rows, got %', checked_count;
  end if;
  raise notice 'Accessories verified: %. New: %. Existing matching rows unchanged: %.',
    checked_count, inserted_count, checked_count - inserted_count;
end;
$accessories$;

commit;

-- Expected: 6 rows. Two 30-heart bag items, four 70-heart necklaces, all active.
select item_key, price, avatar_type, character_slot, active, sort_order, preview_path
from public.heart_shop_items
where item_key in (
  'rootsman_bag_01',
  'rootsman_necklace_01',
  'rootsman_necklace_02',
  'rootswoman_bag_05',
  'rootswoman_necklace_01',
  'rootswoman_necklace_02'
)
order by avatar_type, case when character_slot = 'bag' then 0 else 1 end, item_key;
