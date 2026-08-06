-- 120_duranno_bible_verses_2_1.sql
-- Server-only licensed Duranno Woorimal Bible fifth-edition corpus.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table if not exists public.duranno_bible_verses (
  translation_id smallint not null,
  translation_code text not null,
  book_number smallint not null,
  book_code text not null,
  chapter smallint not null,
  verse_start smallint not null,
  verse_end smallint not null,
  text text not null,
  imported_at timestamptz not null default now(),
  constraint duranno_bible_verses_pkey
    primary key (translation_id, book_number, chapter, verse_start),
  constraint duranno_bible_verses_translation_check
    check (translation_id = 89 and translation_code = 'WKB'),
  constraint duranno_bible_verses_book_number_check
    check (book_number between 1 and 66),
  constraint duranno_bible_verses_book_code_check
    check (book_code ~ '^[1-3]?[A-Z]{2,3}$'),
  constraint duranno_bible_verses_chapter_check
    check (chapter between 1 and 150),
  constraint duranno_bible_verses_verse_range_check
    check (
      verse_start between 1 and 176
      and verse_end between verse_start and 176
    ),
  constraint duranno_bible_verses_text_check
    check (char_length(btrim(text)) > 0)
);

comment on table public.duranno_bible_verses is
  'Licensed Duranno Woorimal Bible fifth-edition corpus. Direct client access is denied; Roots server routes query it with the server secret key.';

alter table public.duranno_bible_verses enable row level security;

revoke all
  on table public.duranno_bible_verses
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.duranno_bible_verses
  to service_role;

commit;

select
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', 'public.duranno_bible_verses', 'SELECT') as anon_can_select,
  has_table_privilege('authenticated', 'public.duranno_bible_verses', 'SELECT') as authenticated_can_select,
  has_table_privilege('service_role', 'public.duranno_bible_verses', 'SELECT') as service_role_can_select,
  has_table_privilege('service_role', 'public.duranno_bible_verses', 'INSERT') as service_role_can_insert,
  has_table_privilege('service_role', 'public.duranno_bible_verses', 'UPDATE') as service_role_can_update,
  has_table_privilege('service_role', 'public.duranno_bible_verses', 'DELETE') as service_role_can_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'duranno_bible_verses';
