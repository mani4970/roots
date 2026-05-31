-- Roots 1.3: photo Bible Reflection support
-- Purpose:
-- - Store photo-based Bible Reflection records in existing qt_records.
-- - Keep existing reflection/progress/share flows by extending qt_records rather than adding a new table.
-- - Store uploaded photos in a private Supabase Storage bucket.
--
-- Safe impact:
-- - Adds nullable columns to public.qt_records.
-- - Creates/updates private storage bucket qt-photos.
-- - Adds Storage RLS policies for owners and users who are allowed to view shared qt_records.
-- - Does not remove existing data or change existing text reflection records.

alter table if exists public.qt_records
  add column if not exists reflection_type text not null default 'written',
  add column if not exists photo_path text,
  add column if not exists photo_url text,
  add column if not exists photo_caption text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'qt_records_reflection_type_check'
      and conrelid = 'public.qt_records'::regclass
  ) then
    alter table public.qt_records
      add constraint qt_records_reflection_type_check
      check (reflection_type in ('written', 'photo'));
  end if;
end $$;

create index if not exists idx_qt_records_reflection_type
  on public.qt_records(reflection_type);

create index if not exists idx_qt_records_photo_path
  on public.qt_records(photo_path)
  where photo_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qt-photos',
  'qt-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Owners can upload photos only under their own user-id folder.
drop policy if exists "qt_photos_insert_own_folder" on storage.objects;
create policy "qt_photos_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'qt-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Owners can update/delete their own uploaded photos.
drop policy if exists "qt_photos_update_own_folder" on storage.objects;
create policy "qt_photos_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'qt-photos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'qt-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "qt_photos_delete_own_folder" on storage.objects;
create policy "qt_photos_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'qt-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- View policy: owners can view their photos; shared viewers can view photos through existing qt_records visibility rules.
drop policy if exists "qt_photos_select_visible" on storage.objects;
create policy "qt_photos_select_visible"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'qt-photos'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or exists (
      select 1
      from public.qt_records q
      where q.photo_path = storage.objects.name
        and q.is_draft = false
        and (
          q.user_id = auth.uid()
          or q.visibility = 'all'
          or (
            q.visibility like 'group_%'
            and exists (
              select 1
              from public.group_members gm
              where gm.group_id::text = replace(q.visibility, 'group_', '')
                and gm.user_id = auth.uid()
            )
          )
          or exists (
            select 1
            from public.qt_record_recipients r
            where r.qt_record_id = q.id
              and r.recipient_id = auth.uid()
          )
        )
    )
  )
);

grant select, insert, update, delete on public.qt_records to authenticated;
grant usage on schema storage to authenticated;
