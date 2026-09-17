-- Reviewable, additive diagnostics-only update. Apply BEFORE the app patch.
-- No business data, RLS policy, grant, campaign window or reward changes.
-- Existing v1 events remain valid. Rollback of the app does not require SQL rollback.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';

alter table public.app_observation_events
  drop constraint app_observation_details_keys,
  add constraint app_observation_details_keys check (
    details - array[
      'mode','phase','source','reason','reward_kind','action','measurement','outcome','error_code',
      'updated','eligible','foreground','interrupted','reduced_motion','automatic','recovery','persisted',
      'past_date','retry','local_backup','existing_record','sharing_failed',
      'streak_days','total_days','count','attempt','upload_attempt','progress_days',
      'diagnostic_version','error_name','cause_name','error_kind','wrapper_code','route','auth_stage',
      'online','error_present','message_present','http_status',
      'error_script','error_line','error_column','caller_script','caller_line','caller_column'
    ]::text[] = '{}'::jsonb
  );

comment on table public.app_observation_events is
  'Append-only client-reported technical events. Server authenticates identity and allowlists fields. No writing content, raw messages, raw stacks, URLs or recipients. Diagnostics v2 adds fixed error labels, same-origin hashed bundle basenames and numeric code positions. Delete with auth user deletion.';
commit;

-- Confirm only the observation key constraint changed. Do not enable or extend
-- the campaign as part of this update.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.app_observation_events'::regclass
  and conname in ('app_observation_details_keys','app_observation_details_shape');
