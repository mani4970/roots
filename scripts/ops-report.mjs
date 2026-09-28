// Run locally from the project root. Read-only; never sends alerts or changes DB data.
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) { console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY is required in your local server environment. Never share the key.'); process.exit(1); }
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
const since = new Date(Date.now() - 24 * 3600000).toISOString();
const [health, cases, completed] = await Promise.all([
  db.from('app_ops_health_report').select('*').single(),
  db.from('app_ops_cases').select('*', { count: 'exact' }).gte('received_at', since).order('received_at', { ascending: false }).limit(2000),
  db.from('qt_records').select('id', { count: 'exact', head: true }).eq('is_draft', false).gte('completed_at', since),
]);
if (health.error || cases.error || completed.error) {
  console.error('Report unavailable. Verify installation, views and server credentials. Missing telemetry is not a clean bill of health.');
  process.exit(1);
}
const flags = [];
if (!health.data.enabled) flags.push('COLLECTION_DISABLED');
if (health.data.coverage === 'no_recent_evidence') flags.push('NO_RECENT_EVIDENCE_CHECK_TRAFFIC_AND_INGESTION');
if (health.data.reported_lost_events_24h > 0) flags.push('DELIVERY_LOSS_REPORTED');
if (health.data.traffic_today >= health.data.daily_event_limit * 0.9) flags.push('DAILY_TRAFFIC_CAP_NEAR');
if (!health.data.last_cleanup_at || Date.now() - Date.parse(health.data.last_cleanup_at) > 2 * 3600000) flags.push('RETENTION_JOB_OVERDUE');
if (health.data.unknown_release_events_24h > 0) flags.push('RELEASE_ID_MISSING');
if ((cases.count ?? 0) > cases.data.length) flags.push('CASE_LIST_TRUNCATED_USE_SQL');
const recentGroups = new Map();
for (const c of cases.data) {
  if (c.category !== 'investigate' || c.recovery_state !== 'no_recovery_evidence' || !c.user_id || Date.parse(c.received_at) < Date.now() - 15 * 60000) continue;
  const key = JSON.stringify([c.scope, c.phase, c.error_code, c.error_kind]);
  if (!recentGroups.has(key)) recentGroups.set(key, new Set());
  recentGroups.get(key).add(c.user_id);
}
const urgentCandidates = Array.from(recentGroups, ([key, users]) => ({ signature: JSON.parse(key), observed_users: users.size })).filter(group => group.observed_users >= 3);
const report = {
  generated_at: new Date().toISOString(), window_start: since,
  coverage_note: 'Client observations are partial. No recovery evidence does not prove permanent failure. Anonymous attempts are not identified accounts. Notice visibility does not prove it was read.',
  health: health.data, flags, urgent_candidates: urgentCandidates,
  qt_completed_in_database_24h: completed.count,
  case_count: cases.count, cases: cases.data,
};
console.log(JSON.stringify(report, null, 2));
