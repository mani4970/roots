-- Run ONLY after installing retention.sql and deploying the diagnostic module.
-- This enables continuing basic collection. The old seven-day campaign stays unchanged.
begin;
do $$ begin
  if not exists(select 1 from cron.job where jobname = 'roots-ops-retention-v3' and active) then
    raise exception 'Install and verify the retention job first';
  end if;
end $$;
update public.app_ops_settings set enabled = true where id;
commit;
select enabled, protocol, daily_event_limit, detail_until from public.app_ops_settings;
