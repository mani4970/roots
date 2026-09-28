-- Optional investigation. Includes sanitized bundle filenames / line / column.
-- NO message text, writing, email, password, tokens, or full URLs are collected.
update public.app_ops_settings
set detail_started_at = now(), detail_until = now() + interval '7 days'
where id;
-- Basic collection continues after this window expires. No automatic extension.
