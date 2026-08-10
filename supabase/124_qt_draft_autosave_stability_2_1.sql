-- 124_qt_draft_autosave_stability_2_1.sql
-- Stabilizes same-day Bible Reflection drafts and autosave.
--
-- Scope:
-- - Adds server and client snapshot timestamps to qt_records.
-- - Guarantees at most one draft per user and local date.
-- - Adds one authenticated, atomic draft-save RPC.
-- - Does not delete or rewrite existing draft content.
-- - Does not change completed-reflection progress, streaks, rewards,
--   challenges, sharing, photo reflections, or existing completed records.

begin;

alter table public.qt_records
  add column if not exists updated_at timestamptz;

update public.qt_records
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.qt_records
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- This timestamp belongs to the actual client snapshot, rather than the time a
-- request happened to finish. It remains nullable for legacy rows so a newer
-- verified device backup can safely win during the first post-migration load.
alter table public.qt_records
  add column if not exists draft_client_updated_at timestamptz;

create or replace function public.set_qt_records_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.set_qt_records_updated_at() from public;

drop trigger if exists trg_qt_records_updated_at on public.qt_records;
create trigger trg_qt_records_updated_at
before update on public.qt_records
for each row
when (new.is_draft is true)
execute function public.set_qt_records_updated_at();

-- Production was verified to have no duplicate draft rows. Keep draft writes
-- blocked briefly while the guard is created so a new duplicate cannot appear
-- between the read-only verification and index creation.
lock table public.qt_records in share row exclusive mode;

do $draft_guard$
declare
  v_duplicate_groups integer;
begin
  select count(*)
  into v_duplicate_groups
  from (
    select record.user_id, record.date
    from public.qt_records as record
    where record.is_draft is true
    group by record.user_id, record.date
    having count(*) > 1
  ) as duplicate_group;

  if v_duplicate_groups > 0 then
    raise exception
      'migration 124 stopped: % duplicate draft user/date group(s) require review',
      v_duplicate_groups
      using errcode = '23505';
  end if;
end;
$draft_guard$;

create unique index if not exists uq_qt_records_one_draft_per_user_date
  on public.qt_records (user_id, date)
  where is_draft is true;

-- Remove the pre-client-timestamp signature if an earlier draft of this
-- migration was tested before the final version.
drop function if exists public.save_own_qt_draft(
  date,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
);

create or replace function public.save_own_qt_draft(
  p_date date,
  p_client_updated_at timestamptz,
  p_qt_mode text,
  p_current_step integer,
  p_bible_version text,
  p_bible_ref text,
  p_key_verse text,
  p_opening_prayer text,
  p_summary text,
  p_meditation text,
  p_application text,
  p_decision text,
  p_closing_prayer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_record_id uuid;
  v_updated_at timestamptz;
  v_client_updated_at timestamptz := coalesce(p_client_updated_at, now());
  v_completed_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_date is null then
    raise exception 'draft date is required' using errcode = '22004';
  end if;

  -- Supabase current_date is UTC. This one-day window covers every legitimate
  -- device-local "today" while rejecting arbitrary historical draft writes.
  if p_date < current_date - 1 or p_date > current_date + 1 then
    raise exception 'draft date is outside the current date window'
      using errcode = '22007';
  end if;

  if p_qt_mode is null or p_qt_mode not in ('6step', 'free', 'sunday') then
    raise exception 'invalid draft mode' using errcode = '22023';
  end if;

  select record.id
  into v_completed_id
  from public.qt_records as record
  where record.user_id = v_user_id
    and record.date = p_date
    and record.is_draft is false
  order by record.created_at desc
  limit 1;

  if v_completed_id is not null then
    return jsonb_build_object(
      'status', 'completed_exists',
      'id', v_completed_id,
      'updated_at', now(),
      'draft_client_updated_at', v_client_updated_at
    );
  end if;

  insert into public.qt_records as current_draft (
    user_id,
    date,
    qt_mode,
    reflection_type,
    visibility,
    is_draft,
    current_step,
    bible_version,
    bible_ref,
    key_verse,
    opening_prayer,
    summary,
    meditation,
    application,
    decision,
    closing_prayer,
    draft_client_updated_at,
    updated_at
  )
  values (
    v_user_id,
    p_date,
    p_qt_mode,
    'written',
    'private',
    true,
    greatest(coalesce(p_current_step, 0), 0),
    coalesce(p_bible_version, ''),
    coalesce(p_bible_ref, ''),
    coalesce(p_key_verse, ''),
    coalesce(p_opening_prayer, ''),
    coalesce(p_summary, ''),
    coalesce(p_meditation, ''),
    coalesce(p_application, ''),
    coalesce(p_decision, ''),
    coalesce(p_closing_prayer, ''),
    v_client_updated_at,
    now()
  )
  on conflict (user_id, date) where is_draft is true
  do update set
    qt_mode = excluded.qt_mode,
    reflection_type = 'written',
    visibility = 'private',
    current_step = excluded.current_step,
    bible_version = excluded.bible_version,
    bible_ref = excluded.bible_ref,
    key_verse = excluded.key_verse,
    opening_prayer = excluded.opening_prayer,
    summary = excluded.summary,
    meditation = excluded.meditation,
    application = excluded.application,
    decision = excluded.decision,
    closing_prayer = excluded.closing_prayer,
    draft_client_updated_at = excluded.draft_client_updated_at,
    updated_at = now()
  -- A request that started earlier may finish after a newer autosave. Compare
  -- timestamps attached to the snapshots so a late older request cannot
  -- replace newer text, even if its HTTP response was delayed.
  where current_draft.draft_client_updated_at is null
     or excluded.draft_client_updated_at >= current_draft.draft_client_updated_at
  returning id, updated_at
  into v_record_id, v_updated_at;

  -- A stale request is intentionally ignored by the WHERE clause above. Return
  -- the currently stored newer draft so the client treats the operation as a
  -- successful no-op rather than retrying the stale snapshot.
  if v_record_id is null then
    select record.id, record.updated_at, record.draft_client_updated_at
    into v_record_id, v_updated_at, v_client_updated_at
    from public.qt_records as record
    where record.user_id = v_user_id
      and record.date = p_date
      and record.is_draft is true
    order by record.updated_at desc
    limit 1;
  end if;

  if v_record_id is null then
    raise exception 'draft save produced no record' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'status', 'saved',
    'id', v_record_id,
    'updated_at', v_updated_at,
    'draft_client_updated_at', v_client_updated_at
  );
end;
$function$;

revoke all on function public.save_own_qt_draft(
  date,
  timestamptz,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.save_own_qt_draft(
  date,
  timestamptz,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;

commit;

-- Read-only verification. All four values should be true.
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'qt_records'
      and column_name = 'updated_at'
      and is_nullable = 'NO'
  ) as updated_at_ready,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'qt_records'
      and column_name = 'draft_client_updated_at'
  ) as client_timestamp_ready,
  to_regclass('public.uq_qt_records_one_draft_per_user_date') is not null as unique_draft_guard_ready,
  to_regprocedure('public.save_own_qt_draft(date,timestamp with time zone,text,integer,text,text,text,text,text,text,text,text,text)') is not null as draft_rpc_ready;
