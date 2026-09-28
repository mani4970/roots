-- Kill switch. Retention remains active, and existing diagnostic evidence is retained.
update public.app_ops_settings set enabled = false, detail_started_at = null, detail_until = null where id;
