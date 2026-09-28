-- Run after install.sql. Installs Supabase Cron if absent, adds ONE named job.
-- Never unschedules or changes other jobs. Detailed data is kept for 30 days,
-- with up to one hour scheduling lag (longer if the scheduler is unhealthy).
begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('roots-ops-retention-v3', '17 * * * *', 'select public.cleanup_app_ops();');
select public.cleanup_app_ops();
commit;
-- Verify cron.job_run_details after the first scheduled run.
select jobid, jobname, schedule, active from cron.job where jobname = 'roots-ops-retention-v3';
