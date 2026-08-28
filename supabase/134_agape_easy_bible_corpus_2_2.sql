-- 134_agape_easy_bible_corpus_2_2.sql
-- Christian Roots 2.2 Agape Easy Bible server-only corpus foundation
--
-- Scope:
--   - Create a server-only table for the licensed Agape Easy Bible corpus.
--   - Keep RLS enabled and deny anon/authenticated direct access.
--   - Allow only service_role to read and perform duplicate-safe imports.
--   - Do NOT activate translation ID 88 in the app or profile preference RPC yet.
--   - Do NOT insert, update, or delete Bible Reflection, progress, streak, profile,
--     reward, badge, challenge, prayer, group, or companion data.
--
-- Apply this SQL before running the local corpus import script.


-- =========================================================
-- A. READ-ONLY PRECHECK
-- =========================================================

select
  to_regclass('public.agape_bible_verses') as existing_agape_table,
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regprocedure(
    'public.update_own_profile_preferences(text,text,integer,text,boolean)'
  ) is not null as preference_rpc_exists;


-- =========================================================
-- B. EXECUTE
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Stop rather than silently accepting an unexpected pre-existing table.
do $precheck$
declare
  v_existing_table regclass := to_regclass('public.agape_bible_verses');
  v_required_columns integer;
  v_primary_key_definition text;
begin
  if v_existing_table is null then
    return;
  end if;

  select count(*)::integer
  into v_required_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'agape_bible_verses'
    and (
      (column_name = 'translation_id' and data_type = 'smallint')
      or (column_name = 'translation_code' and data_type = 'text')
      or (column_name = 'book_number' and data_type = 'smallint')
      or (column_name = 'book_code' and data_type = 'text')
      or (column_name = 'chapter' and data_type = 'smallint')
      or (column_name = 'verse_start' and data_type = 'smallint')
      or (column_name = 'verse_end' and data_type = 'smallint')
      or (column_name = 'text' and data_type = 'text')
      or (column_name = 'imported_at' and data_type = 'timestamp with time zone')
    );

  if v_required_columns <> 9 then
    raise exception 'Safety stop: unexpected public.agape_bible_verses schema';
  end if;

  select pg_get_constraintdef(c.oid, true)
  into v_primary_key_definition
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'agape_bible_verses'
    and c.contype = 'p';

  if v_primary_key_definition is distinct from
    'PRIMARY KEY (translation_id, book_number, chapter, verse_start)' then
    raise exception 'Safety stop: unexpected Agape Easy Bible primary key: %',
      v_primary_key_definition;
  end if;
end;
$precheck$;

create table if not exists public.agape_bible_verses (
  translation_id smallint not null,
  translation_code text not null,
  book_number smallint not null,
  book_code text not null,
  chapter smallint not null,
  verse_start smallint not null,
  verse_end smallint not null,
  text text not null,
  imported_at timestamptz not null default now(),
  constraint agape_bible_verses_pkey
    primary key (translation_id, book_number, chapter, verse_start),
  constraint agape_bible_verses_translation_check
    check (translation_id = 88 and translation_code = 'EASY'),
  constraint agape_bible_verses_book_number_check
    check (book_number between 1 and 66),
  constraint agape_bible_verses_book_code_check
    check (book_code ~ '^[1-3]?[A-Z]{2,3}$'),
  constraint agape_bible_verses_chapter_check
    check (chapter between 1 and 150),
  constraint agape_bible_verses_verse_range_check
    check (
      verse_start between 1 and 176
      and verse_end between verse_start and 176
    ),
  constraint agape_bible_verses_text_check
    check (char_length(btrim(text)) > 0)
);

-- If an earlier draft of SQL 134 was already applied, upgrade only this
-- table-local check constraint so intentional publisher verse bridges can be
-- stored as verse_start..verse_end. No data is deleted.
alter table public.agape_bible_verses
  drop constraint if exists agape_bible_verses_verse_range_check;

alter table public.agape_bible_verses
  add constraint agape_bible_verses_verse_range_check
  check (
    verse_start between 1 and 176
    and verse_end between verse_start and 176
  );

comment on table public.agape_bible_verses is
  'Licensed Agape Easy Bible corpus for Christian Roots QT/Bible Reflection only. Direct client access is denied; the Roots server Bible route queries selected passages with the server secret key.';
comment on column public.agape_bible_verses.translation_id is
  'Stable Roots translation ID 88 for Agape Easy Bible.';
comment on column public.agape_bible_verses.text is
  'Publisher Bible text. Do not expose as a bulk export, public API, or direct Data API table.';

alter table public.agape_bible_verses enable row level security;

-- No SELECT policy is intentionally created. Clients must never query this table.
revoke all
  on table public.agape_bible_verses
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.agape_bible_verses
  to service_role;

-- Fail the transaction if any intended security property differs.
do $postcheck$
declare
  v_rls_enabled boolean;
  v_policy_count integer;
  v_translation_constraint text;
  v_range_constraint text;
begin
  select c.relrowsecurity
  into v_rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'agape_bible_verses'
    and c.relkind = 'r';

  if v_rls_enabled is distinct from true then
    raise exception 'Postcheck failed: RLS is not enabled on agape_bible_verses';
  end if;

  select count(*)::integer
  into v_policy_count
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'agape_bible_verses';

  if v_policy_count <> 0 then
    raise exception 'Postcheck failed: agape_bible_verses must have no client RLS policies';
  end if;

  if has_table_privilege('anon', 'public.agape_bible_verses', 'SELECT')
     or has_table_privilege('authenticated', 'public.agape_bible_verses', 'SELECT') then
    raise exception 'Postcheck failed: a client role can SELECT agape_bible_verses';
  end if;

  if not has_table_privilege('service_role', 'public.agape_bible_verses', 'SELECT')
     or not has_table_privilege('service_role', 'public.agape_bible_verses', 'INSERT')
     or not has_table_privilege('service_role', 'public.agape_bible_verses', 'UPDATE')
     or has_table_privilege('service_role', 'public.agape_bible_verses', 'DELETE') then
    raise exception 'Postcheck failed: unexpected service_role privileges on agape_bible_verses';
  end if;

  select pg_get_constraintdef(c.oid, true)
  into v_translation_constraint
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'agape_bible_verses'
    and c.conname = 'agape_bible_verses_translation_check';

  if v_translation_constraint is null
     or position('translation_id = 88' in v_translation_constraint) = 0
     or position('translation_code = ''EASY''' in v_translation_constraint) = 0 then
    raise exception 'Postcheck failed: Easy Bible translation constraint is missing';
  end if;

  select pg_get_constraintdef(c.oid, true)
  into v_range_constraint
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'agape_bible_verses'
    and c.conname = 'agape_bible_verses_verse_range_check';

  if v_range_constraint is null
     or position('verse_end >= verse_start' in v_range_constraint) = 0 then
    raise exception 'Postcheck failed: bridge-aware Easy Bible verse range constraint is missing';
  end if;
end;
$postcheck$;

commit;


-- =========================================================
-- C. READ-ONLY POSTCHECK
-- =========================================================

select
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', 'public.agape_bible_verses', 'SELECT')
    as anon_can_select,
  has_table_privilege('authenticated', 'public.agape_bible_verses', 'SELECT')
    as authenticated_can_select,
  has_table_privilege('service_role', 'public.agape_bible_verses', 'SELECT')
    as service_role_can_select,
  has_table_privilege('service_role', 'public.agape_bible_verses', 'INSERT')
    as service_role_can_insert,
  has_table_privilege('service_role', 'public.agape_bible_verses', 'UPDATE')
    as service_role_can_update,
  has_table_privilege('service_role', 'public.agape_bible_verses', 'DELETE')
    as service_role_can_delete,
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'agape_bible_verses') as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'agape_bible_verses'
  and c.relkind = 'r';

select
  count(*)::integer as translation_88_rows,
  count(distinct book_number)::integer as book_count,
  count(distinct (book_number, chapter))::integer as chapter_count
from public.agape_bible_verses
where translation_id = 88;
