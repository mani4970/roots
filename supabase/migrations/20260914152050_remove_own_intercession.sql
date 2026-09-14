-- Roots: remove only your own intercession membership and synchronize its count.
-- Reviewed against the current Roots database metadata on 2026-09-14.
-- This migration does not delete existing records when installed.
-- Existing content, testimony, earned hearts/badges, and table RLS are preserved.
-- Apply both functions together: separate parent locks serialize their count snapshots.
begin;

create or replace function public.remove_own_intercession(p_prayer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_deleted_rows integer := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_prayer_id is null then
    raise exception 'prayer_id required' using errcode = '22004';
  end if;

  -- An absent own log is an idempotent no-op. Do not expose source details
  -- or provide arbitrary callers a counter-repair endpoint.
  if not exists (
    select 1
    from public.user_prayer_logs upl
    where upl.user_id = v_user_id
      and upl.prayer_id = p_prayer_id
  ) then
    return jsonb_build_object('removed', false, 'already_absent', true);
  end if;

  -- Acquire the same parent lock as increment_prayer_count, in its own
  -- statement, so the later count reads a snapshot after any lock wait.
  perform 1
  from public.prayer_items pi
  where pi.id = p_prayer_id
  for update;

  if not found then
    -- A source deletion may have cascaded the log while this call waited.
    return jsonb_build_object('removed', false, 'already_absent', true);
  end if;

  delete from public.user_prayer_logs upl
  where upl.user_id = v_user_id
    and upl.prayer_id = p_prayer_id;

  get diagnostics v_deleted_rows = row_count;

  if v_deleted_rows = 0 then
    return jsonb_build_object('removed', false, 'already_absent', true);
  end if;

  update public.prayer_items pi
  set prayer_count = (
    select count(*)::integer
    from public.user_prayer_logs upl
    where upl.prayer_id = p_prayer_id
  )
  where pi.id = p_prayer_id;

  return jsonb_build_object('removed', true, 'already_absent', false);
end;
$function$;

revoke all on function public.remove_own_intercession(uuid) from public, anon;
grant execute on function public.remove_own_intercession(uuid) to authenticated;

-- Preserve the existing signature, return type, search_path, ownership,
-- ACLs, auth guard, caller-log guard, and aggregate count behavior.
-- CREATE OR REPLACE retains the existing ownership and function ACLs.
create or replace function public.increment_prayer_count(prayer_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- The client inserts user_prayer_logs first. Only a user who actually has a log row
  -- for this prayer may trigger the counter sync.
  if not exists (
    select 1
    from public.user_prayer_logs upl
    where upl.prayer_id = increment_prayer_count.prayer_id
      and upl.user_id = current_user_id
  ) then
    raise exception 'prayer log required' using errcode = '42501';
  end if;

  -- This separate statement is necessary: an UPDATE that starts before
  -- another removal commits can otherwise retain its pre-wait snapshot.
  perform 1
  from public.prayer_items pi
  where pi.id = increment_prayer_count.prayer_id
  for update;

  -- A removal may have committed while this call waited for the lock.
  if not exists (
    select 1
    from public.user_prayer_logs upl
    where upl.prayer_id = increment_prayer_count.prayer_id
      and upl.user_id = current_user_id
  ) then
    raise exception 'prayer log required' using errcode = '42501';
  end if;

  update public.prayer_items pi
  set prayer_count = (
    select count(*)::int
    from public.user_prayer_logs upl
    where upl.prayer_id = increment_prayer_count.prayer_id
  )
  where pi.id = increment_prayer_count.prayer_id;
end;
$function$;

-- Make the new RPC visible to the Data API after this transaction commits.
notify pgrst, 'reload schema';

commit;
