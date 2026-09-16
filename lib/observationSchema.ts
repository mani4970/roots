// Shared telemetry contract. Do not add writing content, error messages, URLs,
// recipient identifiers, or arbitrary strings to this allowlist.
export const OBSERVATION_BUILD = "obs-20260916-v1";
export const OBSERVATION_CAMPAIGN = "roots-observation-20260916";
export const OBSERVATION_MAX_BATCH = 30;
export const OBSERVATION_MAX_BYTES = 32 * 1024;

export const OBSERVATION_SCOPES = ["qt_write", "qt_photo", "prayer", "home", "home_popup", "app"] as const;
export type ObservationScope = (typeof OBSERVATION_SCOPES)[number];
export const OBSERVATION_EVENTS = [
  "flow_started", "client_error", "app_ready", "app_backgrounded", "app_foregrounded", "telemetry_dropped",
  "draft_requested", "draft_saved", "draft_error", "draft_skipped", "draft_local_only",
  "complete_clicked", "save_requested", "save_error", "save_ok", "save_skipped", "body_saved",
  "progress_requested", "progress_ok", "progress_error", "progress_skipped",
  "recipients_requested", "recipients_ok", "recipients_error", "retry_shown", "retry_clicked",
  "completion_ready", "completion_visible", "completion_confirmed", "automatic_retry",
  "action_started", "stage_started", "stage_succeeded", "stage_failed", "action_completed", "action_failed",
  "popup_queued", "popup_visible", "popup_overlap", "popup_acknowledged", "popup_closed", "popup_unshown", "popup_eligibility_checked",
] as const;
export type ObservationEventName = (typeof OBSERVATION_EVENTS)[number];
export const OBSERVATION_CLIENT_KINDS = ["web-android", "web-ios", "web-ipad", "web-mac", "web-desktop", "native-ios", "native-ipad", "native-android", "unknown"] as const;
export type ObservationClientKind = (typeof OBSERVATION_CLIENT_KINDS)[number];
export type ObservationDetails = Record<string, string | number | boolean | null>;
export type ObservationEventInput = {
  event_id: string;
  flow_id: string;
  scope: ObservationScope;
  event_name: ObservationEventName;
  client_kind: ObservationClientKind;
  build_tag: typeof OBSERVATION_BUILD;
  record_id: string | null;
  client_at: string;
  elapsed_ms: number | null;
  details: ObservationDetails;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isObservationUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

const STRING_DETAILS: Record<string, ReadonlySet<string>> = {
  mode: new Set(["create", "quiet", "edit", "answer", "share", "6step", "sunday", "free", "photo"]),
  phase: new Set(["body", "recipients", "daily_completion", "rollback", "refresh", "auth", "badge", "notifications", "visibility", "share_options", "draft_load", "draft", "completion", "edit_record", "record_lookup", "record_update", "record_insert", "record", "progress", "upload", "upload_verify", "duplicate_check", "edit_load", "edit_recovery"]),
  source: new Set(["prayer_page", "prayer_popup", "home_prayer", "edit", "create", "toast", "button", "manual", "auto", "draft_conversion", "completion_screen", "app"]),
  reason: new Set(["validation_failed", "missing_saved_row", "missing_user", "shared_at_unavailable", "recipient_failure", "daily_completion_failure", "load_failed", "offline", "auth_missing", "newer_server_snapshot", "completed_exists", "past_date", "schema_fallback", "existing_record", "progress_pending", "duplicate_completed", "recovered_response", "unhandled_error", "unhandled_rejection", "react_boundary", "global_boundary", "network_or_type", "timeout", "unknown"]),
  reward_kind: new Set(["progress_badge", "garden_badge", "garden_stage", "map_start", "map_complete", "character_reward", "avatar_choice", "celebration", "monthly_badge", "challenge_reward", "welcome_back", "onboarding", "language_picker", "required_update", "spanish_announcement", "companion_announcement", "prayer_compose", "prayer_cards", "prayer_share", "qt_choice", "qt_draft_choice", "chapter", "notification_settings"]),
  action: new Set(["close", "confirm", "profile", "invite", "manage", "update", "select", "back"]),
  measurement: new Set(["dom_layout"]),
  outcome: new Set(["eligible", "ineligible", "already_seen", "empty", "error"]),
};
const BOOLEAN_DETAILS = new Set(["updated", "eligible", "foreground", "interrupted", "reduced_motion", "automatic", "recovery", "persisted", "past_date", "retry", "local_backup", "existing_record", "sharing_failed"]);
const NUMBER_DETAILS = new Set(["streak_days", "total_days", "count", "attempt", "upload_attempt", "progress_days"]);
const FIXED_ERROR_CODES = new Set(["unknown", "network", "network_or_type", "timeout", "aborted", "offline", "auth", "storage", "unexpected", "UNKNOWN", "NETWORK", "TIMEOUT", "ABORTED", "OFFLINE", "AUTH", "STORAGE", "UNEXPECTED", "AbortError", "TypeError", "NetworkError", "TimeoutError"]);
export function sanitizeObservationErrorCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // Technical status codes only; never accept a general message/string slug.
  return FIXED_ERROR_CODES.has(input) || /^(?:[0-9][0-9A-Z]{4}|PGRST[0-9]{3}|HTTP[1-5][0-9]{2})$/.test(input) ? input : null;
}
export function sanitizeObservationDetails(input: unknown): ObservationDetails {
  if (!isObject(input)) return {};
  const clean: ObservationDetails = {};
  for (const [key, value] of Object.entries(input)) {
    const allowedStrings = Object.prototype.hasOwnProperty.call(STRING_DETAILS, key) ? STRING_DETAILS[key] : undefined;
    if (key === "error_code") {
      const code = sanitizeObservationErrorCode(value);
      if (code) clean[key] = code;
    } else if (allowedStrings?.has(typeof value === "string" ? value : "")) {
      clean[key] = value as string;
    } else if (BOOLEAN_DETAILS.has(key) && typeof value === "boolean") {
      clean[key] = value;
    } else if (NUMBER_DETAILS.has(key) && typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1000000) {
      clean[key] = value;
    }
  }
  return clean;
}
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const EVENT_KEYS = new Set(["event_id", "flow_id", "scope", "event_name", "client_kind", "build_tag", "record_id", "client_at", "elapsed_ms", "details"]);
export function normalizeObservationEvent(input: unknown): ObservationEventInput | null {
  if (!isObject(input) || Object.keys(input).some((key) => !EVENT_KEYS.has(key))) return null;
  if (!isObservationUuid(input.event_id) || !isObservationUuid(input.flow_id)) return null;
  if (!(OBSERVATION_SCOPES as readonly unknown[]).includes(input.scope) || !(OBSERVATION_EVENTS as readonly unknown[]).includes(input.event_name)) return null;
  if (!(OBSERVATION_CLIENT_KINDS as readonly unknown[]).includes(input.client_kind) || input.build_tag !== OBSERVATION_BUILD) return null;
  if (input.record_id != null && !isObservationUuid(input.record_id)) return null;
  if (typeof input.client_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.client_at)) return null;
  const timestamp = Date.parse(input.client_at);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== input.client_at) return null;
  if (input.elapsed_ms != null && (typeof input.elapsed_ms !== "number" || !Number.isSafeInteger(input.elapsed_ms) || input.elapsed_ms < 0 || input.elapsed_ms > 86400000)) return null;
  if (input.details !== undefined && !isObject(input.details)) return null;
  return {
    event_id: input.event_id.toLowerCase(), flow_id: input.flow_id.toLowerCase(),
    scope: input.scope as ObservationScope, event_name: input.event_name as ObservationEventName,
    client_kind: input.client_kind as ObservationClientKind, build_tag: OBSERVATION_BUILD,
    record_id: typeof input.record_id === "string" ? input.record_id.toLowerCase() : null,
    client_at: input.client_at, elapsed_ms: typeof input.elapsed_ms === "number" ? input.elapsed_ms : null,
    details: sanitizeObservationDetails(input.details),
  };
}

export function normalizeObservationBatch(input: unknown): { user_id: string; events: ObservationEventInput[] } | null {
  if (!isObject(input) || Object.keys(input).some((key) => key !== "user_id" && key !== "events") || !isObservationUuid(input.user_id)) return null;
  if (!Array.isArray(input.events) || input.events.length === 0 || input.events.length > OBSERVATION_MAX_BATCH) return null;
  const normalized = input.events.map(normalizeObservationEvent);
  if (normalized.some((event) => event === null)) return null;
  return { user_id: input.user_id.toLowerCase(), events: normalized as ObservationEventInput[] };
}

export type ObservationCampaign = { enabled: boolean; starts_at: string | null; ends_at: string | null; build_tag: string };
export function isObservationCampaignActive(campaign: ObservationCampaign | null, now = Date.now()): boolean {
  if (!campaign?.enabled || campaign.build_tag !== OBSERVATION_BUILD || !campaign.starts_at || !campaign.ends_at) return false;
  const start = Date.parse(campaign.starts_at);
  const end = Date.parse(campaign.ends_at);
  return Number.isFinite(start) && Number.isFinite(end) && end > start && start <= now && now < end;
}
