# Roots temporary observation, 2026-09-16

Build: `obs-20260916-v1`. Campaign: `roots-observation-20260916`.

This change adds technical observation around existing actions. It does not repair or alter saving, rewards, popup ordering, permissions on business tables, or input behavior. Telemetry is synchronous best-effort enqueue and is never awaited by a business mutation.

## What to measure

| Flow | Attempt and error evidence | Recovery or display evidence |
| --- | --- | --- |
| Written reflection | `draft_requested/saved/error/local_only`, `save_requested/error`, `body_saved`, recipients/progress stages | `retry_shown`, `retry_clicked`, `automatic_retry`, `completion_ready/visible/confirmed` |
| Photo reflection | Save/upload attempts, existing-record recovery, recipient/progress errors | Manual/automatic retry separated; completion warning retained |
| Prayer page and popup | `action_started`, `stage_started/succeeded/failed`, `action_failed` for create/edit/answer/share | `retry_clicked`, `action_completed`; refresh and rollback failures kept separate |
| Home prayer | Accepted save/quiet-prayer actions, body/recipients/daily-completion outcomes | Separate persisted body from ignored completion errors in the existing UI |
| Home badges and popups | `popup_queued`, fixed reward kind and progress days; existing monthly/challenge eligibility results | `popup_visible`, `popup_overlap`, `popup_acknowledged`, `popup_closed/unshown` |
| App errors | Global browser error/rejection and React boundary where observation identity is initialized | Foreground/background interruption; delivery-drop counts |

## Report interpretation

- Aggregate by `(user_id, flow_id)` internally; never return individual UUIDs or writing content. Join business records using both record and user identity before claiming persistence.
- Count `retry_clicked` events as observed manual retries and `automatic_retry` separately. Draft timer attempts and telemetry transport retries are not manual retries. Prayer attempts use `action_started`, not `flow_started`.
- A retry remains correlated only while its tracked form/flow survives. Reopened forms, another tab/device, app termination, old versions, and dropped events can remain uncorrelated. Do not infer zero retries from missing events.
- Use server `received_at` for the ingestion window. Client time and `elapsed_ms` are advisory. Save latency starts at `save_requested`, not the earlier completion button/share-choice flow start. Separate interrupted/background samples.
- `completion_ready` means the existing handler reached its success branch; `completion_visible` records two foreground animation frames; `completion_confirmed` records the existing button click. These do not independently prove backend correctness.
- Popup `measurement=dom_layout` means a layer had visible layout in the viewport. Overlap counts concurrent layouted layers, including covered layers. It does not prove that a person saw or read a popup. Do not turn multiple layer events into distinct incidents without grouping.
- A missing final event is unconfirmed, not automatically a failed operation. Keep the most recent 20 minutes separate before investigating incomplete flows.
- A body save can succeed while recipients, daily completion, refresh, badge or notifications fail. Report each stage separately. Original update/delete API acknowledgements may not include matched-row counts.
- Home `app_ready` is observation initialization, not page content/image load readiness. Mac/iPad labels are device heuristics, not native keyboard/input verification.
- Report sample size and build/platform coverage. The daily database totals describe persisted outcomes, not a denominator of all attempts or a success rate.

## Privacy and delivery

The allowlist accepts only fixed categories, booleans, bounded counts and technical error codes. It excludes writing/prayer content, photos, recipient IDs, raw error messages/stacks, URLs and storage paths. Identity and record UUIDs are correlation columns only.

The authenticated same-origin API validates the cookie user, bounds bodies to 32 KiB/30 events, and stores immutable event IDs. Replays cannot overwrite earlier errors. The 240 events/user/minute receive limit is approximate across concurrent workers. Browser memory/session storage is bounded at 120 events/one hour; delivery retries at most three times. Failed telemetry never blocks saving. Loss itself is best-effort and may be unobservable after app termination.

Both new tables use RLS with no browser policies or grants. Events grant only server-role SELECT/INSERT; configuration grants server-role SELECT/UPDATE. `RLS Enabled No Policy` INFO is intentional for these two server-only tables and must be distinguished from business-table warnings. Existing warnings remain open.

## Activation and stopping

Apply `supabase/migrations/20260916065003_roots_observation_20260916.sql` once. It creates a disabled campaign and never resets existing dates. After the reviewed app deployment is ready, explicitly activate the campaign for seven days. Server and client stop accepting events at `ends_at`; do not extend automatically. Daily read-only operational checks continue indefinitely.

An operator can stop only this observation campaign with:

```sql
update public.app_observation_campaigns
set enabled = false
where campaign_key = 'roots-observation-20260916';
```

This does not delete evidence or change writing/rewards. Revert the observation app commit through normal deployment if needed; leave disabled tables for review. Do not modify business RLS as part of this rollback.

## Verification

`node scripts/test-observation-client.cjs` tests client privacy, transport failure, stable replay IDs, three account-switch races, bounds, loss reporting, platform values, interruption, long sessions, and auth bridge isolation.

`node scripts/test-observation-ingestion.cjs` tests strict validation, origin/body limits, user spoofing, disabled/expired campaigns, duplicate immutability, rate and database failures.

Additional offline handler comparisons against the supplied baseline inject reflection, photo and prayer failures and compare existing database calls/state effects. Popup checks compare original visibility expressions and test queue/layout/overlap/StrictMode cleanup. These are local tests, not evidence of production-user outcomes. Production checks must separately verify the deployed build, active campaign, API response, actual received samples and existing business rows.
