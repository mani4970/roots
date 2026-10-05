-- 156_heart_shop_winter_tops_2_2.sql
-- Basis: roots_safe_current_20261005_1714(1).zip, SHA-256
-- 1802fd49bd3d080a97e4b38dfef0f914743ed12e398ad18aaaa82b1275fb95f2
-- Adds eight Rootsman and eight Rootswoman winter tops.
-- Each avatar: source designs 01-04 = 70 hearts, 05-08 = 100 hearts.
-- Names are supplied by lib/profileCharacterText.ts in ko/en/de/fr/es.
-- Uses the existing top slot, purchase RPC, RLS and wallet logic without changes.
--
-- Run this entire file in the Roots project's Supabase SQL Editor after local QA,
-- before pushing/deploying the app patch. Do not run the earlier winter SQL too.
-- Merely copying this file into the project does NOT execute it.
--
-- Safety: INSERT only into public.heart_shop_items. Existing matching rows are
-- left unchanged, including their timestamps. Any conflicting row aborts the
-- entire transaction. No purchase, wallet, profile or other user data is written.
-- No ALTER, UPDATE, DELETE, TRUNCATE, GRANT, policy or function changes.

begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';

do $winter_tops$
declare
  wanted record;
  actual public.heart_shop_items%rowtype;
  inserted_count integer := 0;
  affected_count integer;
  checked_count integer := 0;
begin
  for wanted in
    select * from (values
      ('rootsman_top_27', 'rootsman', 70, '/images/heart-shop/character/rootsman/tops/top-27.webp?v=20261005_winter_v1', 1227),
      ('rootsman_top_28', 'rootsman', 70, '/images/heart-shop/character/rootsman/tops/top-28.webp?v=20261005_winter_v1', 1228),
      ('rootsman_top_29', 'rootsman', 70, '/images/heart-shop/character/rootsman/tops/top-29.webp?v=20261005_winter_v1', 1229),
      ('rootsman_top_30', 'rootsman', 70, '/images/heart-shop/character/rootsman/tops/top-30.webp?v=20261005_winter_v1', 1230),
      ('rootsman_top_31', 'rootsman', 100, '/images/heart-shop/character/rootsman/tops/top-31.webp?v=20261005_winter_v1', 1231),
      ('rootsman_top_32', 'rootsman', 100, '/images/heart-shop/character/rootsman/tops/top-32.webp?v=20261005_winter_v1', 1232),
      ('rootsman_top_33', 'rootsman', 100, '/images/heart-shop/character/rootsman/tops/top-33.webp?v=20261005_winter_v1', 1233),
      ('rootsman_top_34', 'rootsman', 100, '/images/heart-shop/character/rootsman/tops/top-34.webp?v=20261005_winter_v1', 1234),
      ('rootswoman_top_28', 'rootswoman', 70, '/images/heart-shop/character/rootswoman/tops/top-28.webp?v=20261005_winter_v1', 2228),
      ('rootswoman_top_29', 'rootswoman', 70, '/images/heart-shop/character/rootswoman/tops/top-29.webp?v=20261005_winter_v1', 2229),
      ('rootswoman_top_30', 'rootswoman', 70, '/images/heart-shop/character/rootswoman/tops/top-30.webp?v=20261005_winter_v1', 2230),
      ('rootswoman_top_31', 'rootswoman', 70, '/images/heart-shop/character/rootswoman/tops/top-31.webp?v=20261005_winter_v1', 2231),
      ('rootswoman_top_32', 'rootswoman', 100, '/images/heart-shop/character/rootswoman/tops/top-32.webp?v=20261005_winter_v1', 2232),
      ('rootswoman_top_33', 'rootswoman', 100, '/images/heart-shop/character/rootswoman/tops/top-33.webp?v=20261005_winter_v1', 2233),
      ('rootswoman_top_34', 'rootswoman', 100, '/images/heart-shop/character/rootswoman/tops/top-34.webp?v=20261005_winter_v1', 2234),
      ('rootswoman_top_35', 'rootswoman', 100, '/images/heart-shop/character/rootswoman/tops/top-35.webp?v=20261005_winter_v1', 2235)
    ) as v(item_key, avatar_type, price, preview_path, sort_order)
    order by item_key
  loop
    insert into public.heart_shop_items (
      item_key, category, price, preview_path, sprite_path,
      frame_count, placement_zone, sort_order, active, avatar_type, character_slot
    ) values (
      wanted.item_key, 'character', wanted.price, wanted.preview_path, null,
      1, 'ground', wanted.sort_order, true, wanted.avatar_type, 'top'
    ) on conflict (item_key) do nothing;
    get diagnostics affected_count = row_count;
    inserted_count := inserted_count + affected_count;

    -- Keep the validated row stable until this short transaction commits.
    select * into actual
    from public.heart_shop_items
    where item_key = wanted.item_key
    for share;

    if not found then
      raise exception 'Winter tops: missing catalog row %', wanted.item_key;
    end if;
    if row(actual.category, actual.price, actual.preview_path, actual.sprite_path,
           actual.frame_count, actual.placement_zone, actual.sort_order, actual.active,
           actual.avatar_type, actual.character_slot)
       is distinct from
       row('character'::text, wanted.price, wanted.preview_path, null::text,
           1, 'ground'::text, wanted.sort_order, true,
           wanted.avatar_type, 'top'::text) then
      raise exception 'Winter tops: conflicting existing catalog row %. No existing row was overwritten; all inserts are rolled back.', wanted.item_key;
    end if;
    checked_count := checked_count + 1;
  end loop;

  if checked_count <> 16 then
    raise exception 'Winter tops: expected 16 validated rows; got %', checked_count;
  end if;
  raise notice 'Winter tops verified: %. Newly inserted: %. Existing matching rows unchanged: %.', checked_count, inserted_count, checked_count - inserted_count;
end;
$winter_tops$;

commit;

-- Read-only postcheck: 16 rows; eight at 70, eight at 100; active=true; slot=top.
select item_key, price, avatar_type, character_slot, active, sort_order, preview_path
from public.heart_shop_items
where item_key in (
  'rootsman_top_27',
  'rootsman_top_28',
  'rootsman_top_29',
  'rootsman_top_30',
  'rootsman_top_31',
  'rootsman_top_32',
  'rootsman_top_33',
  'rootsman_top_34',
  'rootswoman_top_28',
  'rootswoman_top_29',
  'rootswoman_top_30',
  'rootswoman_top_31',
  'rootswoman_top_32',
  'rootswoman_top_33',
  'rootswoman_top_34',
  'rootswoman_top_35'
)
order by avatar_type, sort_order;
