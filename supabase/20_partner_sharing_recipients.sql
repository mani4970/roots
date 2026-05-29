-- Roots 1.2: faith partner sharing recipients
-- Purpose:
-- - Store which faith partners can view a shared Bible Reflection or prayer item.
-- - Keep "companions" as the relationship table.
-- - Keep these recipient tables as per-item sharing permissions.
--
-- Important:
-- - This migration is additive.
-- - It does not remove or change existing public/group/private visibility behavior.
-- - Do not grant anon access.
-- - Run on production only during a planned 1.2 test/deployment window.

begin;

-- ---------------------------------------------------------------------------
-- Bible Reflection partner recipients
-- ---------------------------------------------------------------------------

create table if not exists public.qt_record_recipients (
  id uuid primary key default gen_random_uuid(),
  qt_record_id uuid not null references public.qt_records(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint qt_record_recipients_no_self check (owner_id <> recipient_id),
  constraint qt_record_recipients_unique unique (qt_record_id, recipient_id)
);

create index if not exists qt_record_recipients_owner_idx
  on public.qt_record_recipients(owner_id);

create index if not exists qt_record_recipients_recipient_idx
  on public.qt_record_recipients(recipient_id);

create index if not exists qt_record_recipients_record_idx
  on public.qt_record_recipients(qt_record_id);

alter table public.qt_record_recipients enable row level security;

drop policy if exists "qt_record_recipients_select_participants" on public.qt_record_recipients;
create policy "qt_record_recipients_select_participants"
on public.qt_record_recipients
for select
to authenticated
using (
  auth.uid() = owner_id
  or auth.uid() = recipient_id
);

drop policy if exists "qt_record_recipients_insert_owner_to_partner" on public.qt_record_recipients;
create policy "qt_record_recipients_insert_owner_to_partner"
on public.qt_record_recipients
for insert
to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.qt_records q
    where q.id = qt_record_recipients.qt_record_id
      and q.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.companions c
    where c.status = 'accepted'
      and (
        (c.requester_id = qt_record_recipients.owner_id and c.receiver_id = qt_record_recipients.recipient_id)
        or
        (c.receiver_id = qt_record_recipients.owner_id and c.requester_id = qt_record_recipients.recipient_id)
      )
  )
);

drop policy if exists "qt_record_recipients_delete_owner" on public.qt_record_recipients;
create policy "qt_record_recipients_delete_owner"
on public.qt_record_recipients
for delete
to authenticated
using (auth.uid() = owner_id);

-- Let selected faith partners read the shared Bible Reflection.
-- Existing private/all/group visibility policies remain in place.
drop policy if exists "qt_records_select_partner_recipients" on public.qt_records;
create policy "qt_records_select_partner_recipients"
on public.qt_records
for select
to authenticated
using (
  exists (
    select 1
    from public.qt_record_recipients r
    where r.qt_record_id = qt_records.id
      and r.recipient_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Prayer partner recipients
-- ---------------------------------------------------------------------------

create table if not exists public.prayer_item_recipients (
  id uuid primary key default gen_random_uuid(),
  prayer_item_id uuid not null references public.prayer_items(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint prayer_item_recipients_no_self check (owner_id <> recipient_id),
  constraint prayer_item_recipients_unique unique (prayer_item_id, recipient_id)
);

create index if not exists prayer_item_recipients_owner_idx
  on public.prayer_item_recipients(owner_id);

create index if not exists prayer_item_recipients_recipient_idx
  on public.prayer_item_recipients(recipient_id);

create index if not exists prayer_item_recipients_item_idx
  on public.prayer_item_recipients(prayer_item_id);

alter table public.prayer_item_recipients enable row level security;

drop policy if exists "prayer_item_recipients_select_participants" on public.prayer_item_recipients;
create policy "prayer_item_recipients_select_participants"
on public.prayer_item_recipients
for select
to authenticated
using (
  auth.uid() = owner_id
  or auth.uid() = recipient_id
);

drop policy if exists "prayer_item_recipients_insert_owner_to_partner" on public.prayer_item_recipients;
create policy "prayer_item_recipients_insert_owner_to_partner"
on public.prayer_item_recipients
for insert
to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.prayer_items p
    where p.id = prayer_item_recipients.prayer_item_id
      and p.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.companions c
    where c.status = 'accepted'
      and (
        (c.requester_id = prayer_item_recipients.owner_id and c.receiver_id = prayer_item_recipients.recipient_id)
        or
        (c.receiver_id = prayer_item_recipients.owner_id and c.requester_id = prayer_item_recipients.recipient_id)
      )
  )
);

drop policy if exists "prayer_item_recipients_delete_owner" on public.prayer_item_recipients;
create policy "prayer_item_recipients_delete_owner"
on public.prayer_item_recipients
for delete
to authenticated
using (auth.uid() = owner_id);

-- Let selected faith partners read the shared prayer item.
-- Existing private/all/group visibility policies remain in place.
drop policy if exists "prayer_items_select_partner_recipients" on public.prayer_items;
create policy "prayer_items_select_partner_recipients"
on public.prayer_items
for select
to authenticated
using (
  exists (
    select 1
    from public.prayer_item_recipients r
    where r.prayer_item_id = prayer_items.id
      and r.recipient_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Explicit Data API grants
-- ---------------------------------------------------------------------------

revoke all privileges on public.qt_record_recipients from anon;
revoke all privileges on public.prayer_item_recipients from anon;

grant select, insert, delete on public.qt_record_recipients to authenticated;
grant select, insert, delete on public.prayer_item_recipients to authenticated;

grant select, insert, update, delete on public.qt_record_recipients to service_role;
grant select, insert, update, delete on public.prayer_item_recipients to service_role;

commit;
