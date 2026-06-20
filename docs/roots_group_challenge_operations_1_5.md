# Roots 1.5 Group Challenge Request Operations

Status: operational notes for the group challenge request MVP.

This document describes the current 1.5 scope. It does not change app behavior by itself.

## Current scope

The 1.5 MVP now has two safe steps.

Request intake flow:

```text
Group detail
→ Group challenge card
→ Request form
→ Save request to Supabase group_challenge_requests
→ Show in-app confirmation
→ Roots operator reviews the request later
→ Operator contacts the requester by the supplied email
```

Approval/display flow:

```text
Operator finalizes title, dates, and badge copy by email
→ Operator creates a row in Supabase group_challenges
→ Group members can see the approved challenge in group detail
```

There is no automatic email in this MVP. The email address is collected so the operator can follow up manually about schedule, badge design, and wording.
Approved challenges are displayed only after the operator creates the `group_challenges` row.
Badge images are operator-managed and should be uploaded to the `group-challenge-badges` Storage bucket before the approved challenge row is finalized.

## User-facing rules

- Any group member can request a challenge.
- The requester does not upload badge images in the app.
- If the requester already has a badge image or idea, they should mention it in the badge idea or additional questions field.
- The app only confirms that the request was received.
- The operator reviews the request and contacts the requester by email.

## Operator review flow

1. Open Supabase SQL Editor.
2. Use `supabase/32_group_challenge_request_review_queries_1_5.sql` to view pending requests.
3. Contact the requester using `requester_email`.
4. Discuss:
   - final challenge title
   - start date
   - duration
   - badge design
   - badge name and copy
   - whether the challenge is approved or rejected
5. After contact, optionally mark the request as `contacted` using one of the commented UPDATE examples.
6. Upload the finalized badge image to Supabase Storage bucket `group-challenge-badges`.
7. Use the Storage object path, for example `approved-badges/2026-07-berlin-bible-reflection.webp`, as `group_challenges.badge_image_path`.
8. When the title, dates, badge copy, and badge image path are finalized, use `supabase/34_group_challenge_approval_queries_1_5.sql` to create a `group_challenges` row.
9. The approved challenge will then appear in the group detail screen for group members.

## Current limits

These are still not included in the app UI:

- approved challenge creation UI inside the app
- automatic email sending
- direct badge image upload by regular users
- admin dashboard

The MVP now includes request intake, operator-approved challenge display, challenge progress display, participant snapshots, award claiming, and profile display for earned group challenge badges.

## Non-negotiable rules

Group challenge logic must not change Roots core Bible Reflection completion behavior.

Do not change:

- progress/streak save logic
- `streak_days`, `total_days`, or `last_checkin` update logic
- Bible Reflection final save flow
- sharing/recipient save flow
- community whole/group/partner feed visibility logic
- reward map calculation
- existing badge award logic

Future challenge progress should read completed Bible Reflection records for judgment only. It must not create or modify progress.

## Completion and badge awarding flow

The group challenge completion flow is separate from the core Bible Reflection progress/streak flow.

After an operator-approved challenge is created in `group_challenges`, create the automatic participant snapshot for that challenge using:

```text
supabase/36_group_challenge_award_operations_1_5.sql
```

The snapshot represents the group members who are included in that challenge. In the MVP, members do not press a separate join button.

When a challenge has ended, the app may call `claim_group_challenge_award` from the group detail screen. The function:

```text
- checks that the challenge has ended
- checks that the user is in the participant snapshot
- counts distinct non-draft qt_records.date values in the challenge period
- inserts one row into group_challenge_awards if every date is complete
- prevents duplicate awards with a unique challenge_id + user_id constraint
```

This does not update `qt_records`, `profiles.streak_days`, `profiles.total_days`, or `profiles.last_checkin`.


## Badge image storage

Run `supabase/37_group_challenge_badge_storage_1_5.sql` once before using Storage-backed group challenge badge images.

Recommended operator flow:

```text
1. Create the final badge image as PNG or WebP.
2. Upload it to Supabase Storage bucket group-challenge-badges.
3. Use a tidy object path such as approved-badges/2026-07-berlin-bible-reflection.webp.
4. Put that object path in group_challenges.badge_image_path.
```

The app supports these badge image path formats:

```text
approved-badges/file.webp              -> group-challenge-badges Storage bucket
group-challenge-badges/file.webp       -> group-challenge-badges Storage bucket
storage://group-challenge-badges/file.webp -> group-challenge-badges Storage bucket
https://example.com/file.webp           -> direct URL
/public-image.webp or public/public-image.webp -> app public folder fallback
```
