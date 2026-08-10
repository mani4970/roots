-- 123_qt_photo_save_diagnostics_2_1.sql
-- Internal, content-free diagnostics for photo-reflection create/edit attempts.
--
-- Stored: technical stage, client kind, online state, image MIME/size/dimensions,
-- Storage path, record id, and a short sanitized technical error.
-- Not stored: image bytes, caption, reflection text, Bible text, email address,
-- group names, or recipient ids.

begin;

create table if not exists public.qt_photo_save_attempts (
  attempt_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  operation text not null check (operation in ('create', 'edit')),
  stage text not null,
  status text not null check (status in ('started', 'ok', 'warning', 'failed')),
  client_kind text not null,
  photo_source text null,
  online boolean null,
  mime_type text null,
  file_size bigint null check (file_size is null or file_size >= 0),
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  was_transformed boolean null,
  storage_path text null,
  qt_record_id uuid null,
  error_code text null,
  error_message text null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 );

alter table public.qt_photo_save_attempts
  add column if not exists metadata jsonb null;

alter table public.qt_photo_save_attempts
  drop constraint if exists qt_photo_save_attempts_status_check;
alter table public.qt_photo_save_attempts
  add constraint qt_photo_save_attempts_status_check
  check (status in ('started', 'ok', 'warning', 'failed'));

create index if not exists idx_qt_photo_save_attempts_user_updated
  on public.qt_photo_save_attempts (user_id, updated_at desc);

create index if not exists idx_qt_photo_save_attempts_failed_updated
  on public.qt_photo_save_attempts (updated_at desc)
  where status = 'failed';

alter table public.qt_photo_save_attempts enable row level security;

revoke all on table public.qt_photo_save_attempts from anon;
revoke all on table public.qt_photo_save_attempts from authenticated;
grant select, insert, update on table public.qt_photo_save_attempts to authenticated;
grant select, insert, update, delete on table public.qt_photo_save_attempts to service_role;

drop policy if exists qt_photo_save_attempts_select_own on public.qt_photo_save_attempts;
create policy qt_photo_save_attempts_select_own
  on public.qt_photo_save_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists qt_photo_save_attempts_insert_own on public.qt_photo_save_attempts;
create policy qt_photo_save_attempts_insert_own
  on public.qt_photo_save_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists qt_photo_save_attempts_update_own on public.qt_photo_save_attempts;
create policy qt_photo_save_attempts_update_own
  on public.qt_photo_save_attempts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.qt_photo_save_attempts is
  'Content-free technical diagnostics for photo reflection create/edit attempts.';

commit;

-- Read-only verification after execution.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as row_level_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'qt_photo_save_attempts';

select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'qt_photo_save_attempts'
order by policyname;
