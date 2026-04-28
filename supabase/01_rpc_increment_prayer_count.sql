-- Roots RPC hardening
-- Compatible with the existing client call:
--   supabase.rpc("increment_prayer_count", { prayer_id: id })
--
-- This function does NOT blindly increment. It synchronizes prayer_items.prayer_count
-- to the real number of rows in user_prayer_logs, so repeated RPC calls cannot inflate it.

create or replace function public.increment_prayer_count(prayer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  update public.prayer_items pi
  set prayer_count = (
    select count(*)::int
    from public.user_prayer_logs upl
    where upl.prayer_id = increment_prayer_count.prayer_id
  )
  where pi.id = increment_prayer_count.prayer_id;
end;
$$;

revoke all on function public.increment_prayer_count(uuid) from public;
revoke all on function public.increment_prayer_count(uuid) from anon;
grant execute on function public.increment_prayer_count(uuid) to authenticated;
