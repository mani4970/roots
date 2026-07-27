-- 104_qt_records_completed_unique_guard_2_1.sql
-- Christian Roots 2.1 completed Bible Reflection duplicate guard
--
-- Purpose:
--   - Enforce the existing app rule that one user can have at most one
--     completed (non-draft) Bible Reflection for a given date.
--   - Keep multiple drafts allowed.
--   - Prevent concurrent saves from two taps, browser events, or devices from
--     creating duplicate completed records after both requests pass the
--     client-side existence check.
--
-- This migration does NOT:
--   - Delete, merge, insert, or update any qt_records row.
--   - Change progress, streak, rewards, visibility, sharing, photos, or RLS.
--   - Change any table grant.
--
-- Operational safety:
--   - Execution stops before index creation if any completed duplicate exists.
--   - A five-second lock timeout avoids waiting behind a busy write.
--   - A failed check or index creation rolls the whole transaction back.
--   - The existing non-unique lookup index is preserved for compatibility
--     with earlier migration postchecks.


-- =========================================================
-- A. PRECHECK - schema and current duplicate count
-- =========================================================
-- Expected:
--   six rows below with the deployed types
--   duplicate_user_date_groups = 0
--   extra_rows                  = 0

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'qt_records'
  and column_name in (
    'id',
    'user_id',
    'date',
    'created_at',
    'is_draft',
    'photo_path'
  )
order by ordinal_position;

select
  count(*)::integer as duplicate_user_date_groups,
  coalesce(sum(row_count - 1), 0)::integer as extra_rows
from (
  select count(*)::integer as row_count
  from public.qt_records
  where is_draft is false
  group by user_id, date
  having count(*) > 1
) as duplicate_groups;


-- =========================================================
-- B. EXECUTE - guarded partial UNIQUE index
-- =========================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  required_column_count integer;
  duplicate_group_count integer;
begin
  if to_regclass('public.qt_records') is null then
    raise exception 'Safety stop: public.qt_records is missing';
  end if;

  select count(*)::integer
  into required_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'qt_records'
    and (
      (column_name = 'id' and data_type = 'uuid')
      or (column_name = 'user_id' and data_type = 'uuid')
      or (column_name = 'date' and data_type = 'date')
      or (
        column_name = 'created_at'
        and data_type = 'timestamp with time zone'
      )
      or (column_name = 'is_draft' and data_type = 'boolean')
      or (column_name = 'photo_path' and data_type = 'text')
    );

  if required_column_count <> 6 then
    raise exception 'Safety stop: unexpected public.qt_records schema';
  end if;

  if not coalesce((
    select relation.relrowsecurity
    from pg_class as relation
    where relation.oid = 'public.qt_records'::regclass
  ), false) then
    raise exception 'Safety stop: RLS is not enabled on public.qt_records';
  end if;

  select count(*)::integer
  into duplicate_group_count
  from (
    select 1
    from public.qt_records
    where is_draft is false
    group by user_id, date
    having count(*) > 1
  ) as duplicate_groups;

  if duplicate_group_count <> 0 then
    raise exception
      'Safety stop: % completed Reflection duplicate group(s) remain',
      duplicate_group_count;
  end if;

  if to_regclass(
    'public.uq_qt_records_one_completed_per_user_date'
  ) is not null and not exists (
    select 1
    from pg_index as index_meta
    where index_meta.indexrelid = to_regclass(
        'public.uq_qt_records_one_completed_per_user_date'
      )
      and index_meta.indrelid = 'public.qt_records'::regclass
      and index_meta.indisvalid
      and index_meta.indisready
      and index_meta.indisunique
      and index_meta.indnkeyatts = 2
      and index_meta.indnatts = 2
      and pg_get_indexdef(index_meta.indexrelid, 1, true) = 'user_id'
      and pg_get_indexdef(index_meta.indexrelid, 2, true) = 'date'
      and lower(
        regexp_replace(
          coalesce(
            pg_get_expr(index_meta.indpred, index_meta.indrelid),
            ''
          ),
          '[()[:space:]]',
          '',
          'g'
        )
      ) in ('is_draft=false', 'is_draftisfalse')
  ) then
    raise exception 'Safety stop: unexpected completed Reflection UNIQUE index';
  end if;
end;
$$;

create unique index if not exists
  uq_qt_records_one_completed_per_user_date
  on public.qt_records (user_id, date)
  where is_draft is false;

do $$
begin
  if not exists (
    select 1
    from pg_index as index_meta
    where index_meta.indexrelid = to_regclass(
        'public.uq_qt_records_one_completed_per_user_date'
      )
      and index_meta.indrelid = 'public.qt_records'::regclass
      and index_meta.indisvalid
      and index_meta.indisready
      and index_meta.indisunique
      and index_meta.indnkeyatts = 2
      and index_meta.indnatts = 2
      and pg_get_indexdef(index_meta.indexrelid, 1, true) = 'user_id'
      and pg_get_indexdef(index_meta.indexrelid, 2, true) = 'date'
      and lower(
        regexp_replace(
          coalesce(
            pg_get_expr(index_meta.indpred, index_meta.indrelid),
            ''
          ),
          '[()[:space:]]',
          '',
          'g'
        )
      ) in ('is_draft=false', 'is_draftisfalse')
  ) then
    raise exception 'Postcheck failed: completed Reflection UNIQUE index is invalid';
  end if;
end;
$$;

commit;


-- =========================================================
-- C. POSTCHECK - no duplicate rows and exact index definition
-- =========================================================
-- Expected:
--   duplicate_user_date_groups = 0
--   extra_rows                  = 0
--   is_unique                   = true
--   is_valid                    = true
--   is_ready                    = true

select
  count(*)::integer as duplicate_user_date_groups,
  coalesce(sum(row_count - 1), 0)::integer as extra_rows
from (
  select count(*)::integer as row_count
  from public.qt_records
  where is_draft is false
  group by user_id, date
  having count(*) > 1
) as duplicate_groups;

select
  index_meta.indisunique as is_unique,
  index_meta.indisvalid as is_valid,
  index_meta.indisready as is_ready,
  pg_get_indexdef(index_meta.indexrelid) as index_definition
from pg_index as index_meta
where index_meta.indexrelid = to_regclass(
  'public.uq_qt_records_one_completed_per_user_date'
);


-- =========================================================
-- D. EMERGENCY ROLLBACK ONLY - do not run normally
-- =========================================================
-- Dropping this index reopens the server-side race condition. Do this only
-- after sharing a concrete production error that proves the one-completion
-- rule itself must be changed.
--
-- drop index if exists public.uq_qt_records_one_completed_per_user_date;
