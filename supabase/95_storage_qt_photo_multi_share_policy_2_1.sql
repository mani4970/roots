-- 95_storage_qt_photo_multi_share_policy_2_1.sql
-- Christian Roots 2.1 private photo-reflection multi-share policy fix
--
-- Exact scope:
--   - Keep qt-photos private and keep its existing upload/update/delete rules.
--   - Replace only the qt-photos SELECT policy.
--   - Reuse public.can_view_qt_record(...) so comma-separated visibility tokens
--     such as group_<uuid>,group_<uuid> are evaluated exactly like qt_records.
--   - Keep explicit per-companion access through qt_record_recipients.
--
-- This script does not change bucket size/MIME settings, existing objects,
-- qt_records data, share targets, completion/progress/streak logic, badges,
-- hearts, notifications, or popup order.


-- =========================================================
-- A. PRECHECK - private bucket and current SELECT policy
-- =========================================================

select
  bucket.id,
  bucket.public,
  bucket.file_size_limit,
  bucket.allowed_mime_types
from storage.buckets as bucket
where bucket.id = 'qt-photos';

select
  policy.policyname,
  policy.roles,
  policy.cmd,
  policy.qual
from pg_policies as policy
where policy.schemaname = 'storage'
  and policy.tablename = 'objects'
  and policy.policyname = 'qt_photos_select_visible';


-- =========================================================
-- B. EXECUTE - replace one SELECT policy only
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if not exists (
    select 1
    from storage.buckets as bucket
    where bucket.id = 'qt-photos'
      and bucket.public is false
  ) then
    raise exception 'Safety stop: expected private qt-photos bucket';
  end if;

  if to_regclass('public.qt_records') is null
     or to_regclass('public.qt_record_recipients') is null then
    raise exception 'Safety stop: expected QT sharing tables are missing';
  end if;

  if to_regprocedure('public.can_view_qt_record(text,uuid)') is null then
    raise exception 'Safety stop: can_view_qt_record(text, uuid) is missing';
  end if;

  if not exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'storage'
      and relation.relname = 'objects'
      and relation.relrowsecurity is true
  ) then
    raise exception 'Safety stop: storage.objects RLS is not enabled';
  end if;
end;
$$;

drop policy if exists "qt_photos_select_visible" on storage.objects;

create policy "qt_photos_select_visible"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'qt-photos'
  and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or exists (
      select 1
      from public.qt_records as qt_record
      where qt_record.photo_path = storage.objects.name
        and qt_record.is_draft is false
        and (
          public.can_view_qt_record(
            qt_record.visibility,
            qt_record.user_id
          )
          or exists (
            select 1
            from public.qt_record_recipients as recipient
            where recipient.qt_record_id = qt_record.id
              and recipient.recipient_id = (select auth.uid())
          )
        )
    )
  )
);

commit;


-- =========================================================
-- C. POSTCHECK - expected: one authenticated SELECT policy
-- =========================================================

select
  policy.policyname,
  policy.roles,
  policy.cmd,
  case
    when policy.policyname = 'qt_photos_select_visible'
      and policy.cmd = 'SELECT'
      and policy.roles = array['authenticated']::name[]
      and policy.qual ilike '%can_view_qt_record%'
      and policy.qual ilike '%qt_record_recipients%'
      then 'OK_QT_PHOTOS_MULTI_SHARE_SELECT'
    else 'STOP_UNEXPECTED_QT_PHOTOS_SELECT_POLICY'
  end as verification
from pg_policies as policy
where policy.schemaname = 'storage'
  and policy.tablename = 'objects'
  and policy.policyname = 'qt_photos_select_visible';

-- Manual rollback, only if explicitly needed:
-- Re-run the qt_photos_select_visible policy block from
-- supabase/22_qt_photo_reflections.sql.
