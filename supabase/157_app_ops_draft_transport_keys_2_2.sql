-- 157: QT draft transport diagnostics allowlist, Roots 2.2.
-- For an existing diagnostics installation still missing these keys, run the complete file in Supabase SQL Editor.
-- An exact 60-key allowlist already marked validated needs no execution.
-- Run standalone; do not wrap the two phases in an outer BEGIN. Do not rerun the earlier temporary-table upgrade.
-- No temporary objects or temporary-relation references: each DO depends only on persistent catalog state.
-- Adds exactly eight technical keys; content, collection settings, RPCs, RLS and privileges are unchanged.
-- Phase 1 replaces the exact validated 52-key CHECK with the exact 60-key CHECK, NOT VALID.
-- COMMIT releases the replacement's ACCESS EXCLUSIVE lock before Phase 2 scans historic rows.
-- Phase 2 validates using SHARE UPDATE EXCLUSIVE. Ordinary event inserts remain allowed during that scan.
-- An already upgraded, validated installation makes both phases no-ops.
-- Each DO phase has a 2-second lock wait / 15-second statement limit.
-- If Phase 2 times out on an incomplete upgrade, rerun this file to finish validation.
-- Phase 1 stays committed after Phase 2 failure; new and updated rows are still checked immediately.

-- Phase 1: exact allowlist replacement, with no historical-row scan.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';
set local search_path = pg_catalog, pg_temp;

do $roots_draft_transport_157$
declare
  target regclass := pg_catalog.to_regclass('public.app_ops_events');
  old_keys text[] := array['browser_name','browser_major','native_version','native_build','action','attempt','auth_action','auth_stage','automatic','caller_column','caller_line','caller_script','cause_name','count','diagnostic_version','eligible','error_code','error_column','error_kind','error_line','error_name','error_present','error_script','existing_record','foreground','http_status','interrupted','local_backup','measurement','message_present','mode','notice_key','online','outcome','past_date','persisted','phase','progress_days','reason','recovery','reduced_motion','release','retry','reward_kind','route','sharing_failed','source','streak_days','total_days','updated','upload_attempt','wrapper_code']::text[];
  new_keys text[] := old_keys || array['draft_transport_version','draft_transport_state','draft_rpc_ms','draft_before_fetch_ms','draft_fetch_ms','draft_after_headers_ms','draft_http_status','draft_signal_aborted']::text[];
  expected_old text;
  expected_new text;
  expected_shape text := '((jsonb_typeof(details) = ''object''::text) AND (octet_length((details)::text) <= 2048))';
  actual_expression text;
  current_validated boolean;
begin
  perform pg_catalog.set_config('lock_timeout', '2s', true);
  perform pg_catalog.set_config('search_path', 'pg_catalog, pg_temp', true);
  if target is null or not exists (
    select 1 from pg_catalog.pg_class where oid = target and relkind = 'r'
  ) then
    raise exception 'STOP: expected diagnostics table public.app_ops_events is missing or not an ordinary table';
  end if;
  if exists (select 1 from pg_catalog.pg_inherits where inhrelid = target or inhparent = target)
    or not exists (
      select 1 from pg_catalog.pg_attribute where attrelid = target and attname = 'details'
        and not attisdropped and atttypid = 'jsonb'::regtype and attnotnull
    ) then
    raise exception 'STOP: diagnostics table structure differs from the supported installation';
  end if;
  select pg_catalog.format('((details - ARRAY[%s]) = ''{}''::jsonb)',
    pg_catalog.string_agg(pg_catalog.format('%L::text', k), ', ' order by n))
    into expected_old from pg_catalog.unnest(old_keys) with ordinality as keys(k,n);
  select pg_catalog.format('((details - ARRAY[%s]) = ''{}''::jsonb)',
    pg_catalog.string_agg(pg_catalog.format('%L::text', k), ', ' order by n))
    into expected_new from pg_catalog.unnest(new_keys) with ordinality as keys(k,n);
  if not exists (
    select 1 from pg_catalog.pg_constraint where conrelid = target and contype = 'c'
      and convalidated and pg_catalog.pg_get_expr(conbin, conrelid, false) = expected_shape
  ) then
    raise exception 'STOP: validated diagnostics JSON-object/2048-byte guard missing or changed';
  end if;
  select pg_catalog.pg_get_expr(conbin, conrelid, false), convalidated
    into actual_expression, current_validated
  from pg_catalog.pg_constraint where conrelid = target and conname = 'app_ops_events_details_check1'
    and contype = 'c' and conislocal and coninhcount = 0 and not connoinherit;
  if not found then
    raise exception 'STOP: expected diagnostics allowlist CHECK is missing or has unexpected metadata';
  end if;
  if actual_expression is distinct from expected_old and actual_expression is distinct from expected_new then
    raise exception 'STOP: diagnostics details allowlist has unexpected structure or keys; no change applied';
  end if;
  if actual_expression = expected_new then
    raise notice '157 phase 1: exact 60-key allowlist already installed; no replacement';
    return;
  end if;
  if not current_validated then
    raise exception 'STOP: original 52-key allowlist must be validated before upgrade';
  end if;

  -- Recheck after taking a schema-maintenance lock before any ALTER.
  lock table public.app_ops_events in share update exclusive mode;
  if pg_catalog.to_regclass('public.app_ops_events') is distinct from target
    or not exists (select 1 from pg_catalog.pg_class where oid = target and relkind = 'r')
    or exists (select 1 from pg_catalog.pg_inherits where inhrelid = target or inhparent = target)
    or not exists (
      select 1 from pg_catalog.pg_attribute where attrelid = target and attname = 'details'
        and not attisdropped and atttypid = 'jsonb'::regtype and attnotnull
    ) then
    raise exception 'STOP: diagnostics table structure changed concurrently; no change applied';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint where conrelid = target and contype = 'c'
      and convalidated and pg_catalog.pg_get_expr(conbin, conrelid, false) = expected_shape
  ) then
    raise exception 'STOP: diagnostics object/size guard changed concurrently; no change applied';
  end if;
  select pg_catalog.pg_get_expr(conbin, conrelid, false), convalidated
    into actual_expression, current_validated
  from pg_catalog.pg_constraint where conrelid = target and conname = 'app_ops_events_details_check1'
    and contype = 'c' and conislocal and coninhcount = 0 and not connoinherit;
  if not found then
    raise exception 'STOP: diagnostics allowlist changed concurrently; no change applied';
  end if;
  if actual_expression = expected_new then
    raise notice '157 phase 1: exact 60-key allowlist installed concurrently; no replacement';
    return;
  end if;
  if actual_expression is distinct from expected_old or not current_validated then
    raise exception 'STOP: original allowlist changed concurrently or is not validated; no change applied';
  end if;
  execute pg_catalog.format(
    'alter table public.app_ops_events drop constraint app_ops_events_details_check1, add constraint app_ops_events_details_check1 check %s not valid',
    expected_new
  );
  raise notice '157 phase 1: exact 60-key allowlist installed; historic validation follows separately';
end;
$roots_draft_transport_157$;
commit;

-- Phase 2: historical-row validation after the replacement lock has been released.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';
set local search_path = pg_catalog, pg_temp;

do $roots_draft_transport_157_validate$
declare
  target regclass := pg_catalog.to_regclass('public.app_ops_events');
  old_keys text[] := array['browser_name','browser_major','native_version','native_build','action','attempt','auth_action','auth_stage','automatic','caller_column','caller_line','caller_script','cause_name','count','diagnostic_version','eligible','error_code','error_column','error_kind','error_line','error_name','error_present','error_script','existing_record','foreground','http_status','interrupted','local_backup','measurement','message_present','mode','notice_key','online','outcome','past_date','persisted','phase','progress_days','reason','recovery','reduced_motion','release','retry','reward_kind','route','sharing_failed','source','streak_days','total_days','updated','upload_attempt','wrapper_code']::text[];
  new_keys text[] := old_keys || array['draft_transport_version','draft_transport_state','draft_rpc_ms','draft_before_fetch_ms','draft_fetch_ms','draft_after_headers_ms','draft_http_status','draft_signal_aborted']::text[];
  expected_old text;
  expected_new text;
  expected_shape text := '((jsonb_typeof(details) = ''object''::text) AND (octet_length((details)::text) <= 2048))';
  actual_expression text;
  current_validated boolean;
begin
  perform pg_catalog.set_config('lock_timeout', '2s', true);
  perform pg_catalog.set_config('search_path', 'pg_catalog, pg_temp', true);
  if target is null or not exists (
    select 1 from pg_catalog.pg_class where oid = target and relkind = 'r'
  ) then
    raise exception 'STOP: expected diagnostics table public.app_ops_events is missing or not an ordinary table';
  end if;
  if exists (select 1 from pg_catalog.pg_inherits where inhrelid = target or inhparent = target)
    or not exists (
      select 1 from pg_catalog.pg_attribute where attrelid = target and attname = 'details'
        and not attisdropped and atttypid = 'jsonb'::regtype and attnotnull
    ) then
    raise exception 'STOP: diagnostics table structure differs from the supported installation';
  end if;
  select pg_catalog.format('((details - ARRAY[%s]) = ''{}''::jsonb)',
    pg_catalog.string_agg(pg_catalog.format('%L::text', k), ', ' order by n))
    into expected_old from pg_catalog.unnest(old_keys) with ordinality as keys(k,n);
  select pg_catalog.format('((details - ARRAY[%s]) = ''{}''::jsonb)',
    pg_catalog.string_agg(pg_catalog.format('%L::text', k), ', ' order by n))
    into expected_new from pg_catalog.unnest(new_keys) with ordinality as keys(k,n);
  if not exists (
    select 1 from pg_catalog.pg_constraint where conrelid = target and contype = 'c'
      and convalidated and pg_catalog.pg_get_expr(conbin, conrelid, false) = expected_shape
  ) then
    raise exception 'STOP: validated diagnostics JSON-object/2048-byte guard missing or changed';
  end if;
  select pg_catalog.pg_get_expr(conbin, conrelid, false), convalidated
    into actual_expression, current_validated
  from pg_catalog.pg_constraint where conrelid = target and conname = 'app_ops_events_details_check1'
    and contype = 'c' and conislocal and coninhcount = 0 and not connoinherit;
  if not found then
    raise exception 'STOP: expected diagnostics allowlist CHECK is missing or has unexpected metadata';
  end if;
  if actual_expression is distinct from expected_old and actual_expression is distinct from expected_new then
    raise exception 'STOP: diagnostics details allowlist has unexpected structure or keys; no change applied';
  end if;
  if actual_expression is distinct from expected_new then
    raise exception 'STOP: exact upgraded 60-key allowlist required before validation';
  end if;
  if current_validated then
    raise notice '157 phase 2: exact 60-key allowlist already validated; no change';
    return;
  end if;

  -- Recheck after taking a schema-maintenance lock before any ALTER.
  lock table public.app_ops_events in share update exclusive mode;
  if pg_catalog.to_regclass('public.app_ops_events') is distinct from target
    or not exists (select 1 from pg_catalog.pg_class where oid = target and relkind = 'r')
    or exists (select 1 from pg_catalog.pg_inherits where inhrelid = target or inhparent = target)
    or not exists (
      select 1 from pg_catalog.pg_attribute where attrelid = target and attname = 'details'
        and not attisdropped and atttypid = 'jsonb'::regtype and attnotnull
    ) then
    raise exception 'STOP: diagnostics table structure changed concurrently; no change applied';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint where conrelid = target and contype = 'c'
      and convalidated and pg_catalog.pg_get_expr(conbin, conrelid, false) = expected_shape
  ) then
    raise exception 'STOP: diagnostics object/size guard changed concurrently; no change applied';
  end if;
  select pg_catalog.pg_get_expr(conbin, conrelid, false), convalidated
    into actual_expression, current_validated
  from pg_catalog.pg_constraint where conrelid = target and conname = 'app_ops_events_details_check1'
    and contype = 'c' and conislocal and coninhcount = 0 and not connoinherit;
  if not found then
    raise exception 'STOP: diagnostics allowlist changed concurrently; no change applied';
  end if;
  if actual_expression is distinct from expected_new then
    raise exception 'STOP: upgraded allowlist changed concurrently; validation not attempted';
  end if;
  if not current_validated then
    alter table public.app_ops_events validate constraint app_ops_events_details_check1;
  end if;
  raise notice '157 phase 2: exact 60-key allowlist validated; collection setting unchanged';
end;
$roots_draft_transport_157_validate$;
commit;

-- Read-only status only; no account identifiers, writing or individual event content.
select c.convalidated as validated, s.enabled, s.protocol,
  (select count(*) from public.app_ops_events
    where received_at >= now() - interval '15 minutes') as diagnostic_events_last_15_minutes,
  (select count(*) from public.app_ops_events
    where received_at >= now() - interval '15 minutes'
      and details ? 'draft_transport_version') as transport_events_last_15_minutes
from pg_catalog.pg_constraint c
cross join public.app_ops_settings s
where c.conrelid = 'public.app_ops_events'::regclass
  and c.conname = 'app_ops_events_details_check1' and c.contype = 'c' and s.id;
