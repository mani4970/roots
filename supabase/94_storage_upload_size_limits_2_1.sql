-- 94_storage_upload_size_limits_2_1.sql
-- Christian Roots 2.1 Storage upload-size stabilization
--
-- Exact scope:
--   - avatars: keep the shared photo/character bucket at 5 MiB.
--   - qt-photos: lower the private bucket limit from 5 MiB to 2 MiB.
--
-- Character profile images share the avatars bucket with normal profile photos,
-- so their separate 2 MiB limit is enforced in the app immediately after the
-- 640 x 640 character image is flattened. This SQL must not lower avatars to
-- 2 MiB because normal profile photos are intentionally allowed up to 5 MiB.
--
-- This script does not change bucket privacy, MIME types, Storage policies,
-- existing objects, profile data, Bible Reflection records, sharing, streaks,
-- badges, hearts, notifications, or popup order.


-- =========================================================
-- A. PRECHECK - current buckets and existing object sizes
-- =========================================================

select
  bucket.id,
  bucket.public,
  bucket.file_size_limit,
  bucket.allowed_mime_types
from storage.buckets as bucket
where bucket.id in ('avatars', 'qt-photos')
order by bucket.id;

select
  object.bucket_id,
  count(*)::integer as object_count,
  max(coalesce((object.metadata ->> 'size')::bigint, 0)) as max_bytes,
  count(*) filter (
    where object.bucket_id = 'avatars'
      and coalesce((object.metadata ->> 'size')::bigint, 0) > 5242880
  )::integer as avatars_over_5mb,
  count(*) filter (
    where object.bucket_id = 'qt-photos'
      and coalesce((object.metadata ->> 'size')::bigint, 0) > 2097152
  )::integer as qt_photos_over_2mb
from storage.objects as object
where object.bucket_id in ('avatars', 'qt-photos')
group by object.bucket_id
order by object.bucket_id;


-- =========================================================
-- B. EXECUTE - size limits only
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  expected_bucket_count integer;
  oversized_avatar_count integer;
  oversized_qt_photo_count integer;
begin
  select count(*)::integer
  into expected_bucket_count
  from storage.buckets as bucket
  where (bucket.id = 'avatars' and bucket.public is true)
     or (bucket.id = 'qt-photos' and bucket.public is false);

  if expected_bucket_count <> 2 then
    raise exception 'Safety stop: expected public avatars and private qt-photos buckets';
  end if;

  select count(*)::integer
  into oversized_avatar_count
  from storage.objects as object
  where object.bucket_id = 'avatars'
    and coalesce((object.metadata ->> 'size')::bigint, 0) > 5242880;

  if oversized_avatar_count <> 0 then
    raise exception 'Safety stop: % existing avatars objects exceed 5 MiB', oversized_avatar_count;
  end if;

  select count(*)::integer
  into oversized_qt_photo_count
  from storage.objects as object
  where object.bucket_id = 'qt-photos'
    and coalesce((object.metadata ->> 'size')::bigint, 0) > 2097152;

  if oversized_qt_photo_count <> 0 then
    raise exception 'Safety stop: % existing qt-photos objects exceed 2 MiB', oversized_qt_photo_count;
  end if;
end;
$$;

update storage.buckets
set file_size_limit = case id
  when 'avatars' then 5242880
  when 'qt-photos' then 2097152
end
where id in ('avatars', 'qt-photos');

do $$
begin
  if (select count(*) from storage.buckets where id in ('avatars', 'qt-photos')) <> 2 then
    raise exception 'Safety stop: Storage bucket update did not retain both expected buckets';
  end if;
end;
$$;

commit;


-- =========================================================
-- C. POSTCHECK - expected: avatars 5242880, qt-photos 2097152
-- =========================================================

select
  bucket.id,
  bucket.public,
  bucket.file_size_limit,
  bucket.allowed_mime_types,
  case
    when bucket.id = 'avatars'
      and bucket.public is true
      and bucket.file_size_limit = 5242880
      then 'OK_AVATARS_5MB'
    when bucket.id = 'qt-photos'
      and bucket.public is false
      and bucket.file_size_limit = 2097152
      then 'OK_QT_PHOTOS_2MB'
    else 'STOP_UNEXPECTED_BUCKET_STATE'
  end as verification
from storage.buckets as bucket
where bucket.id in ('avatars', 'qt-photos')
order by bucket.id;

-- Manual rollback, only if explicitly needed:
-- update storage.buckets set file_size_limit = null where id = 'avatars';
-- update storage.buckets set file_size_limit = 5242880 where id = 'qt-photos';
