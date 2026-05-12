# Roots Launch Moderation Playbook

This note is for App Store / Google Play review readiness and day-to-day UGC moderation before a dedicated admin page exists.

## Scope

Roots allows users to share QT reflections and prayer requests in the community. Users can:

- report a QT or prayer post;
- hide a specific post from their own view;
- hide posts from a specific user from their own view.

Reported content is immediately hidden from the reporter's view. The operator reviews incoming reports manually in Supabase.

## Review commitment

During launch and closed testing, reports should be checked at least once per day. Production moderation target:

- review new reports within 24–48 hours;
- remove or restrict clearly inappropriate content;
- consider account-level action for repeated abuse;
- preserve normal faith-sharing content when no policy issue is found.

## Where reports are stored

Reports are stored in:

```sql
public.content_reports
```

Per-user hidden items are stored in:

```sql
public.hidden_community_items
public.hidden_community_users
```

## Supabase review queue

After running `supabase/14_content_reports_moderation.sql`, use this view in Supabase SQL Editor:

```sql
select *
from public.content_reports_moderation_queue
where status = 'open'
order by created_at asc;
```

The view is intended for service-role/dashboard use only and should not be exposed to normal authenticated users.

## Common moderation actions

### Mark a report as reviewed, no action needed

```sql
update public.content_reports
set status = 'reviewed',
    reviewed_at = now(),
    moderation_action = 'kept',
    moderator_note = 'Reviewed: no policy issue found.'
where id = '<report_id>';
```

### Mark a report as actioned after restricting content

For QT content:

```sql
update public.qt_records
set visibility = 'private'
where id = '<content_id>';

update public.content_reports
set status = 'actioned',
    reviewed_at = now(),
    moderation_action = 'restricted_to_private',
    moderator_note = 'Content visibility restricted after review.'
where id = '<report_id>';
```

For prayer content:

```sql
update public.prayer_items
set visibility = 'private'
where id = '<content_id>';

update public.content_reports
set status = 'actioned',
    reviewed_at = now(),
    moderation_action = 'restricted_to_private',
    moderator_note = 'Content visibility restricted after review.'
where id = '<report_id>';
```

### Delete clearly inappropriate content

Use only when content clearly violates community safety expectations.

```sql
-- QT
update public.content_reports
set status = 'actioned',
    reviewed_at = now(),
    moderation_action = 'deleted',
    moderator_note = 'Content deleted after moderation review.'
where id = '<report_id>';

delete from public.qt_records
where id = '<content_id>';
```

```sql
-- Prayer
delete from public.prayer_items
where id = '<content_id>';

update public.content_reports
set status = 'actioned',
    reviewed_at = now(),
    moderation_action = 'deleted',
    moderator_note = 'Content deleted after moderation review.'
where id = '<report_id>';
```

## App review note

Use this in Google Play / Apple review notes if asked about user-generated content moderation:

> Users can report objectionable content and hide posts or users. Reported content is hidden from the reporter immediately. Reports are reviewed by the operator within 24–48 hours using the Supabase dashboard, and inappropriate content can be removed or restricted.

## Future improvement

When usage grows, add one of the following:

- database webhook on `content_reports` insert to email `support@christian-roots.com`;
- Slack/Discord notification;
- protected `/admin` moderation page with an operator allowlist.
