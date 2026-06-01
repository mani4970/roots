-- Roots hotfix: allow reactions on Bible Reflections shared directly with faith partners.
--
-- Direct partner sharing uses qt_record_recipients.
-- This migration adds narrow qt_reactions policies for selected partner recipients.
-- It does not change data and does not remove existing public/group policies.

begin;

drop policy if exists "qt_reactions_select_partner_recipient_qt" on public.qt_reactions;
drop policy if exists "qt_reactions_insert_partner_recipient_qt" on public.qt_reactions;
drop policy if exists "qt_reactions_update_partner_recipient_qt" on public.qt_reactions;
drop policy if exists "qt_reactions_delete_partner_recipient_qt" on public.qt_reactions;

create policy "qt_reactions_select_partner_recipient_qt"
on public.qt_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.qt_record_recipients r
    where r.qt_record_id = qt_reactions.qt_id
      and (
        r.recipient_id = auth.uid()
        or r.owner_id = auth.uid()
      )
  )
);

create policy "qt_reactions_insert_partner_recipient_qt"
on public.qt_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.qt_record_recipients r
    where r.qt_record_id = qt_reactions.qt_id
      and r.recipient_id = auth.uid()
  )
);

create policy "qt_reactions_update_partner_recipient_qt"
on public.qt_reactions
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.qt_record_recipients r
    where r.qt_record_id = qt_reactions.qt_id
      and r.recipient_id = auth.uid()
  )
);

create policy "qt_reactions_delete_partner_recipient_qt"
on public.qt_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.qt_record_recipients r
    where r.qt_record_id = qt_reactions.qt_id
      and r.recipient_id = auth.uid()
  )
);

commit;
