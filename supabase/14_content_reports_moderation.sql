-- Moderation helpers for Roots UGC reports.
-- Run after supabase/10_reports_hidden_content.sql.
-- Safe to re-run.
--
-- Purpose:
-- - Keep an operator review trail for content_reports.
-- - Provide a dashboard-only review queue view.
-- - Do not change user-facing report/hide behavior.

begin;

alter table if exists public.content_reports
  add column if not exists reviewed_at timestamptz,
  add column if not exists moderation_action text,
  add column if not exists moderator_note text;

create index if not exists content_reports_open_queue_idx
  on public.content_reports(created_at asc)
  where status = 'open';

create index if not exists content_reports_reviewed_at_idx
  on public.content_reports(reviewed_at desc)
  where reviewed_at is not null;

create or replace view public.content_reports_moderation_queue as
select
  cr.id as report_id,
  cr.status,
  cr.reason,
  cr.content_type,
  cr.content_id,
  cr.reporter_id,
  reporter.name as reporter_name,
  cr.reported_user_id,
  reported.name as reported_user_name,
  coalesce(qr.user_id, pi.user_id) as content_owner_id,
  coalesce(qr.visibility, pi.visibility) as content_visibility,
  case
    when cr.content_type = 'qt' then left(coalesce(qr.key_verse, qr.summary, ''), 500)
    when cr.content_type = 'prayer' then left(coalesce(pi.content, ''), 500)
    else null
  end as content_preview,
  cr.created_at,
  cr.reviewed_at,
  cr.moderation_action,
  cr.moderator_note
from public.content_reports cr
left join public.profiles reporter on reporter.id = cr.reporter_id
left join public.profiles reported on reported.id = cr.reported_user_id
left join public.qt_records qr
  on cr.content_type = 'qt'
 and qr.id = cr.content_id
left join public.prayer_items pi
  on cr.content_type = 'prayer'
 and pi.id = cr.content_id;

revoke all on public.content_reports_moderation_queue from anon;
revoke all on public.content_reports_moderation_queue from authenticated;
grant select on public.content_reports_moderation_queue to service_role;

commit;
