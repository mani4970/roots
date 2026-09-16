"use client";

import { Capacitor } from "@capacitor/core";
import { OBSERVATION_BUILD, normalizeObservationEvent, sanitizeObservationDetails } from "@/lib/observationSchema";
import type { ObservationScope, ObservationEventInput } from "@/lib/observationSchema";

export type ObservationFlow = {
  id: string;
  userId: string;
  scope: ObservationScope;
  startedAt: number;
  recordId?: string;
  interrupted?: boolean;
};
type Details = Record<string, string | number | boolean | null>;
type Pending = { userId: string; event: ObservationEventInput; attempts: number };
type Campaign = { enabled: boolean; ends_at: string | null; build_tag: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUEUE_KEY = "roots_observation_queue_v1";
const FLOW_KEY = "roots_observation_flow_v1_";
const MAX_QUEUE = 120;
const MAX_AGE = 60 * 60 * 1000;
let queue: Pending[] = [];
let initialized = false;
let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let config: Campaign | null = null;
let checkedAt = 0;
let activeUser: string | null = null;
let appFlow: ObservationFlow | null = null;
let dropped = 0;
const flows = new Map<string, ObservationFlow>();

function uuid() {
  if (typeof crypto === "undefined") return null;
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const value = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function platform() {
  const ua = navigator.userAgent.toLowerCase();
  const ipad = /ipad/.test(ua) || (/macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === "android") return "native-android";
    if (Capacitor.getPlatform() === "ios") return ipad ? "native-ipad" : "native-ios";
    return "unknown";
  }
  if (/android/.test(ua)) return "web-android";
  if (ipad) return "web-ipad";
  if (/iphone|ipod/.test(ua)) return "web-ios";
  if (/macintosh/.test(ua)) return "web-mac";
  return "web-desktop";
}

function persist() {
  try { sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { /* Memory delivery still works. */ }
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? "[]");
    if (Array.isArray(saved)) {
      queue = saved.slice(-MAX_QUEUE).flatMap((row: Pending) => {
        if (!row || !UUID.test(row.userId ?? "")) return [];
        const event = normalizeObservationEvent(row.event);
        if (!event || Date.now() - Date.parse(event.client_at) > MAX_AGE) return [];
        return [{ userId: row.userId, event, attempts: Math.max(0, Math.min(3, Number(row.attempts) || 0)) }];
      });
    }
  } catch { queue = []; }
}

function schedule(delay = 1200) {
  if (timer || typeof window === "undefined") return;
  timer = setTimeout(() => { timer = null; void flushObservations(); }, delay);
}

async function fetchWithDeadline(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try { return await fetch(url, { ...init, signal: controller.signal, credentials: "same-origin", cache: "no-store" }); }
  finally { clearTimeout(timeout); }
}

async function checkConfig() {
  if (config && Date.now() - checkedAt < 60_000) return config;
  const response = await fetchWithDeadline("/api/observations");
  if (!response.ok) throw new Error("observation_unavailable");
  const body = await response.json();
  config = { enabled: body.enabled === true && body.build_tag === OBSERVATION_BUILD, ends_at: typeof body.ends_at === "string" ? body.ends_at : null, build_tag: body.build_tag };
  checkedAt = Date.now();
  return config;
}

/** Isolated best-effort delivery. Business functions must never await this. */
export async function flushObservations(keepalive = false): Promise<void> {
  if (running || typeof window === "undefined") return;
  running = true;
  let retryDelay = 5000;
  let batch: Pending[] = [];
  const owner = activeUser;
  try {
    initialize();
    const before = queue.length;
    queue = queue.filter(row => Date.now() - Date.parse(row.event.client_at) <= MAX_AGE && row.attempts < 3);
    dropped += before - queue.length;
    if (!queue.length || !owner) return;
    // Never move an earlier account's events to a later signed-in account.
    queue = queue.filter(row => row.userId === owner);
    const campaign = await checkConfig();
    if (owner !== activeUser) return;
    queue = queue.filter(row => row.userId === owner);
    if (!campaign.enabled || !campaign.ends_at || Date.parse(campaign.ends_at) <= Date.now()) {
      queue = [];
      persist();
      return;
    }
    batch = queue.slice(0, 30);
    while (batch.length && new TextEncoder().encode(JSON.stringify({ user_id: owner, events: batch.map(row => row.event) })).byteLength > 28 * 1024) batch.pop();
    if (!batch.length) return;
    const sentIds = new Set(batch.map(row => row.event.event_id));
    const response = await fetchWithDeadline("/api/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: owner, events: batch.map(row => row.event) }),
      keepalive,
    });
    if (owner !== activeUser) return;
    if (response.ok) {
      const result = await response.json();
      if (owner !== activeUser) return;
      if (result.disabled === true) { queue = []; config = null; }
      else if (result.ok === true) {
        queue = queue.filter(row => !sentIds.has(row.event.event_id));
        reportDroppedObservations();
      }
      else throw new Error("observation_unavailable");
    } else if ([400, 401, 403, 413].includes(response.status)) {
      dropped += batch.length;
      queue = queue.filter(row => !sentIds.has(row.event.event_id));
    } else {
      batch.forEach(row => { row.attempts += 1; });
      retryDelay = response.status === 429 ? 60_000 : 10_000;
    }
    persist();
  } catch {
    if (owner === activeUser) (batch.length ? batch : queue.slice(0, 30)).forEach(row => { row.attempts += 1; });
    persist();
  } finally {
    running = false;
    if (queue.length && activeUser) schedule(retryDelay);
  }
}

export function beginObservation(scope: ObservationScope, userId: string | null | undefined, details: Details = {}): ObservationFlow | null {
  try {
    if (typeof window === "undefined" || !userId || !UUID.test(userId)) return null;
    const id = uuid();
    if (!id) return null;
    const flow: ObservationFlow = { id, userId, scope, startedAt: Date.now(), interrupted: document.visibilityState !== "visible" };
    flows.set(id, flow);
    if (flows.size > 32) flows.delete(flows.keys().next().value!);
    observe(flow, "flow_started", details);
    return flow;
  } catch { return null; }
}

/** Records only allowlisted technical values and always returns synchronously. */
export function observe(flow: ObservationFlow | null | undefined, eventName: string, details: Details = {}, recordId?: string | null): void {
  try {
    if (!flow || typeof window === "undefined" || !UUID.test(flow.userId)) return;
    if (activeUser && flow.userId !== activeUser) return;
    initialize();
    const eventId = uuid();
    if (!eventId) return;
    if (recordId && UUID.test(recordId)) flow.recordId = recordId;
    const elapsed = Date.now() - flow.startedAt;
    if (elapsed < 0 || elapsed > MAX_AGE) return;
    const event = normalizeObservationEvent({
      event_id: eventId, flow_id: flow.id, scope: flow.scope, event_name: eventName,
      client_kind: platform(), build_tag: OBSERVATION_BUILD,
      record_id: flow.recordId ?? null, client_at: new Date().toISOString(), elapsed_ms: elapsed,
      details: sanitizeObservationDetails({ ...details, foreground: document.visibilityState === "visible", interrupted: flow.interrupted === true }),
    });
    if (!event) return;
    if (["popup_closed", "popup_unshown", "popup_eligibility_checked"].includes(eventName)) flows.delete(flow.id);
    if (queue.length >= MAX_QUEUE) { queue.shift(); dropped += 1; }
    queue.push({ userId: flow.userId, event, attempts: 0 });
    persist();
    schedule();
  } catch { /* Telemetry must not interfere with writing, rewards, or UI. */ }
}

export function observationError(error: unknown): { error_code: string } {
  try {
    if (error && typeof error === "object") {
      const value = error as { code?: unknown; name?: unknown };
      if (typeof value.code === "string" && /^(?:[0-9][0-9A-Z]{4}|PGRST[0-9]{3})$/.test(value.code)) return { error_code: value.code };
      if (value.name === "AbortError" || value.name === "TimeoutError") return { error_code: "timeout" };
      if (value.name === "TypeError") return { error_code: "network_or_type" };
    }
  } catch {}
  return { error_code: "unknown" };
}

export function rememberObservationFlow(flow: ObservationFlow | null | undefined, key: string): void {
  try { if (flow && /^[a-z_]{1,40}$/.test(key)) sessionStorage.setItem(FLOW_KEY + key, JSON.stringify(flow)); } catch {}
}

export function resumeObservationFlow(key: string, userId: string): ObservationFlow | null {
  try {
    if (!/^[a-z_]{1,40}$/.test(key) || !UUID.test(userId)) return null;
    const flow = JSON.parse(sessionStorage.getItem(FLOW_KEY + key) ?? "null") as ObservationFlow | null;
    if (!flow || flow.userId !== userId || !UUID.test(flow.id) || !Number.isFinite(flow.startedAt) || Date.now() < flow.startedAt || Date.now() - flow.startedAt > MAX_AGE) return null;
    if (!["qt_write", "qt_photo", "prayer", "home", "home_popup", "app"].includes(flow.scope)) return null;
    const restored = { id: flow.id, userId, scope: flow.scope, startedAt: flow.startedAt, ...(flow.recordId && UUID.test(flow.recordId) ? { recordId: flow.recordId } : {}), interrupted: flow.interrupted === true };
    flows.set(restored.id, restored);
    if (flows.size > 32) flows.delete(flows.keys().next().value!);
    return restored;
  } catch { return null; }
}

export function setObservationUser(userId: string | null): void {
  try {
    initialize();
    const next = userId && UUID.test(userId) ? userId : null;
    if (activeUser === next) { if (next) schedule(); return; }
    activeUser = next;
    flows.clear();
    queue = next ? queue.filter(row => row.userId === next) : [];
    persist();
    appFlow = next ? beginObservation("app", next, { source: "app" }) : null;
    if (appFlow) {
      observe(appFlow, "app_ready");
      if (dropped) { observe(appFlow, "telemetry_dropped", { count: dropped }); dropped = 0; }
    }
  } catch {}
}

function currentAppFlow(): ObservationFlow | null {
  try {
    if (!activeUser) return null;
    if (!appFlow || appFlow.userId !== activeUser || Date.now() - appFlow.startedAt > MAX_AGE) {
      if (appFlow) flows.delete(appFlow.id);
      appFlow = beginObservation("app", activeUser, { source: "app" });
    }
    return appFlow;
  } catch { return null; }
}

function reportDroppedObservations(): void {
  try {
    if (!dropped) return;
    const flow = currentAppFlow();
    if (!flow) return;
    const count = dropped;
    // Reset before enqueueing; recording this event may itself hit the cap.
    dropped = 0;
    observe(flow, "telemetry_dropped", { count: Math.min(count, 1000000) });
  } catch { /* Reporting delivery loss is itself best-effort. */ }
}

export function reportObservationClientError(reason: "unhandled_error" | "unhandled_rejection" | "react_boundary" | "global_boundary", error?: unknown): void {
  observe(currentAppFlow(), "client_error", { reason, ...observationError(error) });
}

export function observationVisibilityChanged(): void {
  try {
    const flow = currentAppFlow();
    const hidden = document.visibilityState !== "visible";
    if (hidden) flows.forEach(flow => { flow.interrupted = true; });
    observe(flow, hidden ? "app_backgrounded" : "app_foregrounded");
    void flushObservations(hidden);
  } catch {}
}
