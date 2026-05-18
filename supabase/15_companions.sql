-- 15_companions.sql
-- Roots companion (동행) foundation: request, accept/decline, list, remove.
-- Keep this separate from companion sharing. Sharing/RLS for Bible Reflections and prayer requests comes later.

create table if not exists public.companions (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint companions_no_self_request check (requester_id <> receiver_id)
);

create index if not exists companions_requester_idx on public.companions(requester_id);
create index if not exists companions_receiver_idx on public.companions(receiver_id);
create index if not exists companions_status_idx on public.companions(status);

-- Prevent duplicate active/pending relationships in either direction.
create unique index if not exists companions_unique_active_pair
on public.companions (
  least(requester_id, receiver_id),
  greatest(requester_id, receiver_id)
)
where status in ('pending', 'accepted');

create or replace function public.touch_companions_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  if old.status = 'pending' and new.status in ('accepted', 'declined') and old.status <> new.status then
    new.responded_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists companions_touch_updated_at on public.companions;
create trigger companions_touch_updated_at
before update on public.companions
for each row execute function public.touch_companions_updated_at();

-- Guard updates so clients cannot rewrite participants or arbitrarily change statuses.
create or replace function public.guard_companion_updates()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new.requester_id <> old.requester_id or new.receiver_id <> old.receiver_id then
    raise exception 'Companion participants cannot be changed';
  end if;

  -- Only the receiver can answer a pending request.
  if old.status = 'pending' and auth.uid() = old.receiver_id and new.status in ('accepted', 'declined') then
    return new;
  end if;

  -- Keep accepted relationships stable; removal should use DELETE.
  if old.status = new.status then
    return new;
  end if;

  raise exception 'Invalid companion status change';
end;
$$;

drop trigger if exists companions_guard_updates on public.companions;
create trigger companions_guard_updates
before update on public.companions
for each row execute function public.guard_companion_updates();

alter table public.companions enable row level security;

grant select, insert, update, delete on public.companions to authenticated;
grant select, insert, update, delete on public.companions to service_role;

-- Users can see companion records where they are one of the participants.
drop policy if exists companions_select_own on public.companions;
create policy companions_select_own
on public.companions
for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Users can create companion relationships in two ways:
-- 1) request flow: the requester creates a pending request.
-- 2) invite-link flow: the invite receiver accepts an inviter's link and creates an accepted relationship.
drop policy if exists companions_insert_own_request on public.companions;
create policy companions_insert_own_request
on public.companions
for insert
to authenticated
with check (
  requester_id <> receiver_id
  and (
    (auth.uid() = requester_id and status = 'pending')
    or
    (auth.uid() = receiver_id and status = 'accepted')
  )
);

-- Receivers can accept/decline pending requests. Trigger enforces allowed transitions.
drop policy if exists companions_update_received_request on public.companions;
create policy companions_update_received_request
on public.companions
for update
to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

-- Either participant can delete a pending/accepted relationship.
drop policy if exists companions_delete_own on public.companions;
create policy companions_delete_own
on public.companions
for delete
to authenticated
using (auth.uid() = requester_id or auth.uid() = receiver_id);
