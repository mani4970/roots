-- Christian Roots 2.2: private, date-based gratitude notes.
-- Run this file in the SQL Editor before deploying the matching web patch.
-- Additive only: no changes to qt_records, daily_checkins, profiles, streak,
-- reflection completion, rewards, notification settings, or existing records.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create schema if not exists roots_gratitude_private;
revoke all on schema roots_gratitude_private from public, anon, authenticated, service_role;

create table if not exists public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  items text[] not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gratitude_entries_user_date_key unique (user_id, entry_date),
  constraint gratitude_entries_date_range check (entry_date >= date '0001-01-01' and entry_date <= date '9999-12-31')
);

-- Do not commit alongside an unexpected permissive policy from another setup.
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gratitude_entries'
    and policyname not in ('roots_gratitude_select_own', 'roots_gratitude_insert_own',
      'roots_gratitude_update_own', 'roots_gratitude_delete_own')) then
    raise exception 'Safety stop: unexpected gratitude access policy';
  end if;
end $$;

-- The unique (user_id, entry_date) index also supports owner/date history scans.
alter table public.gratitude_entries enable row level security;

create or replace function roots_gratitude_private.validate_entry()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_item text;
begin
  if new.items is null or coalesce(pg_catalog.array_ndims(new.items), 0) <> 1
    or pg_catalog.array_lower(new.items, 1) <> 1
    or pg_catalog.cardinality(new.items) not between 1 and 50 then
    raise exception using errcode = '23514', message = 'Invalid gratitude item count';
  end if;
  foreach v_item in array new.items loop
    if v_item is null or pg_catalog.char_length(v_item) > 2000
      or pg_catalog.char_length(pg_catalog.regexp_replace(v_item, '[[:space:]]', '', 'g')) = 0 then
      raise exception using errcode = '23514', message = 'Invalid gratitude item';
    end if;
  end loop;
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.user_id is distinct from old.user_id
      or new.entry_date is distinct from old.entry_date then
      raise exception using errcode = '23514', message = 'Gratitude identity cannot change';
    end if;
    new.created_at := old.created_at;
    new.revision := old.revision + 1;
  else
    new.created_at := pg_catalog.clock_timestamp();
    new.revision := 1;
  end if;
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;
revoke all on function roots_gratitude_private.validate_entry() from public, anon, authenticated, service_role;

drop trigger if exists roots_validate_gratitude_entry on public.gratitude_entries;
create trigger roots_validate_gratitude_entry
before insert or update on public.gratitude_entries
for each row execute function roots_gratitude_private.validate_entry();

drop policy if exists roots_gratitude_select_own on public.gratitude_entries;
drop policy if exists roots_gratitude_insert_own on public.gratitude_entries;
drop policy if exists roots_gratitude_update_own on public.gratitude_entries;
drop policy if exists roots_gratitude_delete_own on public.gratitude_entries;
create policy roots_gratitude_select_own on public.gratitude_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy roots_gratitude_insert_own on public.gratitude_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy roots_gratitude_update_own on public.gratitude_entries
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy roots_gratitude_delete_own on public.gratitude_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Explicit privileges are necessary for newly created Data API tables.
-- Clear table AND column grants so repeated execution cannot retain broad writes.
revoke all on table public.gratitude_entries from public, anon, authenticated, service_role;
revoke all (id, user_id, entry_date, items, revision, created_at, updated_at)
  on public.gratitude_entries from public, anon, authenticated, service_role;
grant select, delete on public.gratitude_entries to authenticated;
grant insert (user_id, entry_date, items) on public.gratitude_entries to authenticated;
grant update (items) on public.gratitude_entries to authenticated;

comment on table public.gratitude_entries is
  'Private daily gratitude notes. Dates follow the device local day; independent of reflection progress and rewards.';

commit;

-- SQL Editor: every result below should be true. No user data is returned.
select
  (select relrowsecurity from pg_class where oid = 'public.gratitude_entries'::regclass) as gratitude_rls_enabled,
  (select count(*) = 4 from pg_policies where schemaname = 'public' and tablename = 'gratitude_entries') as owner_policies_ready,
  not has_table_privilege('anon', 'public.gratitude_entries', 'select,insert,update,delete')
    and not has_any_column_privilege('anon', 'public.gratitude_entries', 'select,insert,update') as no_anon_access,
  has_table_privilege('authenticated', 'public.gratitude_entries', 'select')
    and has_column_privilege('authenticated', 'public.gratitude_entries', 'items', 'insert')
    and has_column_privilege('authenticated', 'public.gratitude_entries', 'items', 'update')
    and has_table_privilege('authenticated', 'public.gratitude_entries', 'delete') as owner_access_ready,
  not has_column_privilege('authenticated', 'public.gratitude_entries', 'user_id', 'update')
    and not has_column_privilege('authenticated', 'public.gratitude_entries', 'entry_date', 'update')
    and not has_column_privilege('authenticated', 'public.gratitude_entries', 'revision', 'update') as identity_writes_blocked,
  exists (select 1 from pg_constraint where conrelid = 'public.gratitude_entries'::regclass
    and conname = 'gratitude_entries_user_date_key' and contype = 'u') as one_entry_per_day,
  exists (select 1 from pg_constraint where conrelid = 'public.gratitude_entries'::regclass
    and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c') as account_deletion_cascades,
  exists (select 1 from pg_trigger where tgrelid = 'public.gratitude_entries'::regclass
    and tgname = 'roots_validate_gratitude_entry' and tgenabled <> 'D'
    and tgfoid = 'roots_gratitude_private.validate_entry()'::regprocedure) as validation_trigger_ready,
  not has_function_privilege('authenticated', 'roots_gratitude_private.validate_entry()', 'execute')
    and not has_function_privilege('anon', 'roots_gratitude_private.validate_entry()', 'execute') as helper_not_callable;
