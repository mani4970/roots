-- 158_heart_shop_hair_colors_2_2.sql
-- Source: roots_safe_current_20261007_0941.zip
-- SHA-256: ec486bc7dc7946cb722f1fbbb1ef928ed9b8aac6ee577e4f692ec2e012061571
-- Adds 12 NEW hair-color catalog rows: Rootsman 05-08 (100 hearts),
-- Rootswoman 05-12 (150 hearts). Historical keys 01-04 MUST NOT be reused.
-- The existing database already accepts character_slot='hair'.
-- No schema/RLS/RPC/authentication/wallet/purchase/profile changes.
-- The small preview_path is hair-only; the app uses a precomposed character base.
-- Names and category labels are in the five-language app catalog.
-- Run the WHOLE file once in the Roots SQL Editor after local QA and before push.
-- This file is not automatically applied by copying it into the project.
-- Matching rows are unchanged. A conflicting value rolls back all new rows.
-- Existing timestamps and old hair catalog records remain untouched.

begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';

do $hair_colors$
declare
  wanted record;
  actual public.heart_shop_items%rowtype;
  inserted_count integer := 0;
  affected_count integer;
  checked_count integer := 0;
begin
  for wanted in
    select * from (values
      ('rootsman_hair_05', 'rootsman', 100, '/images/heart-shop/character/rootsman/hair/hair-05-thumb.webp?v=20261007_v1', 1905),
      ('rootsman_hair_06', 'rootsman', 100, '/images/heart-shop/character/rootsman/hair/hair-06-thumb.webp?v=20261007_v1', 1906),
      ('rootsman_hair_07', 'rootsman', 100, '/images/heart-shop/character/rootsman/hair/hair-07-thumb.webp?v=20261007_v1', 1907),
      ('rootsman_hair_08', 'rootsman', 100, '/images/heart-shop/character/rootsman/hair/hair-08-thumb.webp?v=20261007_v1', 1908),
      ('rootswoman_hair_05', 'rootswoman', 150, '/images/heart-shop/character/rootswoman/hair/hair-05-thumb.webp?v=20261007_v1', 2905),
      ('rootswoman_hair_06', 'rootswoman', 150, '/images/heart-shop/character/rootswoman/hair/hair-06-thumb.webp?v=20261007_v1', 2906),
      ('rootswoman_hair_07', 'rootswoman', 150, '/images/heart-shop/character/rootswoman/hair/hair-07-thumb.webp?v=20261007_v1', 2907),
      ('rootswoman_hair_08', 'rootswoman', 150, '/images/heart-shop/character/rootswoman/hair/hair-08-thumb.webp?v=20261007_v1', 2908),
      ('rootswoman_hair_09', 'rootswoman', 150, '/images/heart-shop/character/rootswoman/hair/hair-09-thumb.webp?v=20261007_v1', 2909),
      ('rootswoman_hair_10', 'rootswoman', 150, '/images/heart-shop/character/rootswoman/hair/hair-10-thumb.webp?v=20261007_v1', 2910),
      ('rootswoman_hair_11', 'rootswoman', 150, '/images/heart-shop/character/rootswoman/hair/hair-11-thumb.webp?v=20261007_v1', 2911),
      ('rootswoman_hair_12', 'rootswoman', 150, '/images/heart-shop/character/rootswoman/hair/hair-12-thumb.webp?v=20261007_v1', 2912)
    ) as v(item_key, avatar_type, price, preview_path, sort_order)
    order by item_key
  loop
    insert into public.heart_shop_items (
      item_key, category, price, preview_path, sprite_path,
      frame_count, placement_zone, sort_order, active, avatar_type, character_slot
    ) values (
      wanted.item_key, 'character', wanted.price, wanted.preview_path, null,
      1, 'ground', wanted.sort_order, true, wanted.avatar_type, 'hair'
    ) on conflict (item_key) do nothing;
    get diagnostics affected_count = row_count;
    inserted_count := inserted_count + affected_count;

    -- Keep the validated row stable until this short transaction commits.
    select * into actual
    from public.heart_shop_items
    where item_key = wanted.item_key
    for share;

    if not found then
      raise exception 'Hair colors: missing catalog row %', wanted.item_key;
    end if;
    if row(actual.category, actual.price, actual.preview_path, actual.sprite_path,
           actual.frame_count, actual.placement_zone, actual.sort_order, actual.active,
           actual.avatar_type, actual.character_slot)
       is distinct from
       row('character'::text, wanted.price, wanted.preview_path, null::text,
           1, 'ground'::text, wanted.sort_order, true,
           wanted.avatar_type, 'hair'::text) then
      raise exception 'Hair colors: conflicting existing catalog row %. No existing row was overwritten; all inserts are rolled back.', wanted.item_key;
    end if;
    checked_count := checked_count + 1;
  end loop;

  if checked_count <> 12 then
    raise exception 'Hair colors: expected 12 validated rows; got %', checked_count;
  end if;
  raise notice 'Hair colors verified: %. Newly inserted: %. Existing matching rows unchanged: %.', checked_count, inserted_count, checked_count - inserted_count;
end;
$hair_colors$;

commit;

-- Read-only postcheck: 12 rows, 4 at 100 hearts and 8 at 150 hearts.
select item_key, price, avatar_type, character_slot, active, sort_order, preview_path
from public.heart_shop_items
where item_key in (
  'rootsman_hair_05',
  'rootsman_hair_06',
  'rootsman_hair_07',
  'rootsman_hair_08',
  'rootswoman_hair_05',
  'rootswoman_hair_06',
  'rootswoman_hair_07',
  'rootswoman_hair_08',
  'rootswoman_hair_09',
  'rootswoman_hair_10',
  'rootswoman_hair_11',
  'rootswoman_hair_12'
)
order by avatar_type, sort_order;
