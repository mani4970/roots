import { isObservationUuid, normalizeObservationEvent, OBSERVATION_MAX_BATCH, type ObservationEventInput } from "./observationSchema";

export const OPS_PROTOCOL = 3;
export const OPS_GUEST_EVENTS = new Set(["flow_started", "auth_requested", "auth_succeeded", "auth_failed", "auth_redirect_started", "notice_rendered"]);
export function normalizeOpsBatch(input: unknown): { user_id: string | null; events: ObservationEventInput[] } | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => key !== "user_id" && key !== "events")) return null;
  if (body.user_id !== null && !isObservationUuid(body.user_id)) return null;
  if (!Array.isArray(body.events) || !body.events.length || body.events.length > OBSERVATION_MAX_BATCH) return null;
  const events = body.events.map(normalizeObservationEvent);
  if (events.some(event => !event || (body.user_id === null && (event.scope !== "auth" || !OPS_GUEST_EVENTS.has(event.event_name) || event.record_id !== null)))) return null;
  return { user_id: typeof body.user_id === "string" ? body.user_id.toLowerCase() : null, events: events as ObservationEventInput[] };
}

/** Detailed investigation expires independently of the permanent basic feed. */
export function basicOpsEvent(event: ObservationEventInput, detailEnabled: boolean): ObservationEventInput {
  if (detailEnabled) return event;
  const details = { ...event.details };
  for (const key of ["error_script", "error_line", "error_column", "caller_script", "caller_line", "caller_column"]) delete details[key];
  return { ...event, details };
}
