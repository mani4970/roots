-- 161_companion_acceptance_notices_2_2.sql
-- One-time Home notice for the requester when a companion request is accepted.
-- Safety:
-- - No existing accepted relationships are backfilled.
-- - The acceptance flow remains successful even if notice recording fails.
-- - Only the original requester can read or mark their notice rows as seen.

begin;

create table if not exists public.companion_acceptance_notices (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.companions(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  accepter_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint companion_acceptance_notices_participants_check check (requester_id <> accepter_id),
  constraint companion_acceptance_notices_companion_unique unique (companion_id)
);

create index if not exists companion_acceptance_notices_requester_unseen_idx
  on public.companion_acceptance_notices (requester_id, accepted_at desc)
  where seen_at is null;

alter table public.companion_acceptance_notices enable row level security;

revoke all on table public.companion_acceptance_notices from public, anon, authenticated;
grant select on table public.companion_acceptance_notices to authenticated;
grant update (seen_at) on table public.companion_acceptance_notices to authenticated;
grant all on table public.companion_acceptance_notices to service_role;

drop policy if exists companion_acceptance_notices_select_own on public.companion_acceptance_notices;
create policy companion_acceptance_notices_select_own
on public.companion_acceptance_notices
for select
to authenticated
using (requester_id = (select auth.uid()));

drop policy if exists companion_acceptance_notices_mark_seen_own on public.companion_acceptance_notices;
create policy companion_acceptance_notices_mark_seen_own
on public.companion_acceptance_notices
for update
to authenticated
using (requester_id = (select auth.uid()))
with check (requester_id = (select auth.uid()));

create or replace function public.record_companion_acceptance_notice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    (tg_op = 'INSERT' and new.status = 'accepted')
    or
    (tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted')
  ) then
    begin
      insert into public.companion_acceptance_notices (
        companion_id,
        requester_id,
        accepter_id,
        accepted_at
      ) values (
        new.id,
        new.requester_id,
        new.receiver_id,
        coalesce(new.responded_at, new.updated_at, new.created_at, now())
      )
      on conflict (companion_id) do nothing;
    exception when others then
      -- A non-critical notice must never make accepting a companion request fail.
      raise warning 'companion acceptance notice skipped for companion %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

revoke all on function public.record_companion_acceptance_notice() from public, anon, authenticated;

drop trigger if exists companions_record_acceptance_notice on public.companions;
create trigger companions_record_acceptance_notice
after insert or update of status on public.companions
for each row execute function public.record_companion_acceptance_notice();

commit;
