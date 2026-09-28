-- READ ONLY. Run in SQL Editor. All timestamps are UTC unless your SQL client converts them.
-- UUIDs are access-controlled technical identifiers. No writing, email, password or token is selected.
select * from public.app_ops_health_report;

-- Errors plus recovery evidence and the CURRENT DB state of the linked QT record.
-- A completed body does NOT prove recipients, progress/rewards, or UI succeeded.
select c.*,
  case when c.scope not in ('qt_write','qt_photo') then 'not_checked'
    when q.id is null then 'not_found_or_unlinked'
    when q.is_draft then 'draft_exists_now' else 'completed_record_exists_now' end as qt_db_state,
  q.completed_at as qt_completed_at,
  case when c.scope <> 'prayer' then 'not_checked'
    when pr.id is null then 'not_found_or_unlinked' else 'prayer_exists_now' end as prayer_db_state,
  pr.is_answered as prayer_answered_now, pr.answered_at as prayer_answered_at,
  case when q.id is null then null else exists(
    select 1 from public.qt_record_recipients qr where qr.qt_record_id=q.id and qr.owner_id=c.user_id
  ) end as has_any_recipient_now,
  case when pr.id is null then null else exists(
    select 1 from public.prayer_item_recipients rr where rr.prayer_item_id=pr.id and rr.owner_id=c.user_id
  ) end as prayer_has_any_recipient_now
from public.app_ops_cases c
left join public.qt_records q on q.id=c.record_id and q.user_id=c.user_id
left join public.prayer_items pr on pr.id=c.record_id and pr.user_id=c.user_id
where c.received_at >= now()-interval '24 hours'
order by c.received_at desc limit 200;

-- Release / device / stage counts. Denominators cover instrumented clients only.
select * from public.app_ops_daily_totals where day_utc >= (now() at time zone 'UTC')::date-1 order by day_utc,scope,event_name;

-- Urgent candidates: repeated operational failures across >=3 authenticated users in 15 minutes.
-- Investigation required; client absence of recovery is not proof of permanent data loss.
select scope,phase,error_code,error_kind,count(*) as error_events,count(distinct user_id) as affected_users
from public.app_ops_cases
where received_at >= now()-interval '15 minutes' and category='investigate' and recovery_state='no_recovery_evidence'
group by scope,phase,error_code,error_kind having count(distinct user_id)>=3;

-- Retention health (the worker may be paused/unavailable despite an active job).
select j.jobid,j.jobname,j.active,d.status,d.start_time,d.end_time
from cron.job j left join lateral(
  select status,start_time,end_time from cron.job_run_details where jobid=j.jobid order by start_time desc limit 1
) d on true where j.jobname='roots-ops-retention-v3';
