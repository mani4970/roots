-- Roots 1.2: per-user faith partner preferences
-- Purpose:
-- - Store user-specific preferences for accepted faith partners.
-- - First use: favorite partners so they appear at the top of the partner list.
--
-- Important:
-- - This table stores preferences, not the companion relationship itself.
-- - A and B may favorite each other independently.
-- - Keep anon grants absent.

create table if not exists public.companion_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  companion_user_id uuid not null references public.profiles(id) on delete cascade,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companion_preferences_no_self check (user_id <> companion_user_id),
  constraint companion_preferences_unique unique (user_id, companion_user_id)
);

alter table public.companion_preferences enable row level security;

grant select, insert, update, delete on public.companion_preferences to authenticated;
grant select, insert, update, delete on public.companion_preferences to service_role;

drop policy if exists companion_preferences_select_own on public.companion_preferences;
create policy companion_preferences_select_own
on public.companion_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists companion_preferences_insert_own_partner on public.companion_preferences;
create policy companion_preferences_insert_own_partner
on public.companion_preferences
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.companions c
    where c.status = 'accepted'
      and (
        (c.requester_id = auth.uid() and c.receiver_id = companion_user_id)
        or
        (c.receiver_id = auth.uid() and c.requester_id = companion_user_id)
      )
  )
);

drop policy if exists companion_preferences_update_own_partner on public.companion_preferences;
create policy companion_preferences_update_own_partner
on public.companion_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.companions c
    where c.status = 'accepted'
      and (
        (c.requester_id = auth.uid() and c.receiver_id = companion_user_id)
        or
        (c.receiver_id = auth.uid() and c.requester_id = companion_user_id)
      )
  )
);

drop policy if exists companion_preferences_delete_own on public.companion_preferences;
create policy companion_preferences_delete_own
on public.companion_preferences
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists companion_preferences_user_id_idx
on public.companion_preferences(user_id);

create index if not exists companion_preferences_user_favorite_idx
on public.companion_preferences(user_id, is_favorite desc, updated_at desc);
