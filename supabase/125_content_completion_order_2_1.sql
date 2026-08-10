-- 125_content_completion_order_2_1.sql
-- Stores immutable completion timestamps for Bible Reflections and prayer
-- answers so community feeds can be ordered by when content was finished.
--
-- Scope:
-- - Adds qt_records.completed_at.
-- - Backfills existing completed reflections with the safest available legacy
--   timestamp (same-session shared_at when plausible, then updated_at/created_at).
-- - Sets completed_at exactly once when a draft first becomes completed, or
--   when a completed reflection/photo is inserted directly.
-- - Keeps completed_at unchanged when content, photos, recipients, or
--   visibility are edited later.
-- - Guarantees answered_at is set when a prayer first becomes answered and is
--   not moved by later visibility/content updates.
-- - Adds read-order indexes only.
-- - Does not change reflection progress, streaks, rewards, challenges,
--   reactions, recipients, visibility, or existing content text.

begin;

alter table public.qt_records
  add column if not exists completed_at timestamptz;

-- Migration 124 keeps updated_at close to the last draft snapshot for recent
-- rows. For legacy shared records, shared_at is also a useful completion proxy
-- when it occurred in the same normal writing window (within 24 hours of the
-- row/draft timestamp). A much later re-share must not move old content to the
-- top, so those outliers fall back to updated_at/created_at.
update public.qt_records
set completed_at = case
  when shared_at is not null
   and shared_at >= coalesce(updated_at, created_at, shared_at)
   and shared_at <= coalesce(updated_at, created_at, shared_at) + interval '24 hours'
    then shared_at
  else coalesce(updated_at, created_at, now())
end
where is_draft is false
  and completed_at is null;

-- Drafts have no completion timestamp by definition.
update public.qt_records
set completed_at = null
where is_draft is true
  and completed_at is not null;

create or replace function public.set_qt_record_completion_time()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if coalesce(new.is_draft, false) is true then
    new.completed_at := null;
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Use the database clock so ordering does not depend on a device clock.
    new.completed_at := now();
    return new;
  end if;

  if coalesce(old.is_draft, false) is true
     and coalesce(new.is_draft, false) is false then
    -- First and only transition from draft to completed.
    new.completed_at := now();
    return new;
  end if;

  -- Editing a completed record, changing its photo, or changing sharing must
  -- never make it look newly completed.
  new.completed_at := coalesce(
    old.completed_at,
    old.updated_at,
    old.created_at,
    new.completed_at,
    now()
  );
  return new;
end;
$function$;

revoke all on function public.set_qt_record_completion_time() from public;

drop trigger if exists trg_qt_record_completion_time on public.qt_records;
create trigger trg_qt_record_completion_time
before insert or update on public.qt_records
for each row
execute function public.set_qt_record_completion_time();

-- Every answered prayer in production currently has answered_at. Keep this
-- backfill for safe, repeatable deployment on other environments.
update public.prayer_items
set answered_at = coalesce(answered_at, created_at, now())
where is_answered is true
  and answered_at is null;

create or replace function public.set_prayer_answered_time()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if coalesce(new.is_answered, false) is false then
    new.answered_at := null;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.answered_at := now();
    return new;
  end if;

  if coalesce(old.is_answered, false) is false
     and coalesce(new.is_answered, false) is true then
    new.answered_at := now();
    return new;
  end if;

  -- Later edits or sharing changes keep the original answer-completion time.
  new.answered_at := coalesce(old.answered_at, new.answered_at, now());
  return new;
end;
$function$;

revoke all on function public.set_prayer_answered_time() from public;

drop trigger if exists trg_prayer_answered_time on public.prayer_items;
create trigger trg_prayer_answered_time
before insert or update on public.prayer_items
for each row
execute function public.set_prayer_answered_time();

create index if not exists idx_qt_records_completed_at
  on public.qt_records (completed_at desc, id)
  where is_draft is false;

create index if not exists idx_prayer_items_answered_at
  on public.prayer_items (answered_at desc, id)
  where is_answered is true;

commit;

-- Expected result: all four readiness checks are true and both missing counts
-- are zero.
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'qt_records'
      and column_name = 'completed_at'
  ) as completed_at_ready,
  to_regclass('public.idx_qt_records_completed_at') is not null
    as qt_completion_index_ready,
  to_regclass('public.idx_prayer_items_answered_at') is not null
    as prayer_answer_index_ready,
  exists (
    select 1
    from pg_trigger trigger_row
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'qt_records'
      and trigger_row.tgname = 'trg_qt_record_completion_time'
      and not trigger_row.tgisinternal
  ) and exists (
    select 1
    from pg_trigger trigger_row
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'prayer_items'
      and trigger_row.tgname = 'trg_prayer_answered_time'
      and not trigger_row.tgisinternal
  ) as completion_triggers_ready,
  (
    select count(*)
    from public.qt_records
    where is_draft is false
      and completed_at is null
  ) as completed_qt_missing_timestamp,
  (
    select count(*)
    from public.prayer_items
    where is_answered is true
      and answered_at is null
  ) as answered_prayer_missing_timestamp;
