"use client";

import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase";

export type QtDraftMode = "6step" | "sunday" | "free";

export type QtDraftServerPayload = {
  date: string;
  clientUpdatedAt: string;
  qtMode: QtDraftMode;
  currentStep: number;
  bibleVersion: string;
  bibleRef: string;
  keyVerse: string;
  openingPrayer: string;
  summary: string;
  meditation: string;
  application: string;
  decision: string;
  closingPrayer: string;
};

export type QtDraftSaveResult = {
  status: "saved" | "completed_exists";
  id: string;
  updatedAt: string;
  clientUpdatedAt: string;
};

type SupabaseClient = ReturnType<typeof createClient>;

export type QtDraftTransportDetails = {
  draft_transport_version: 1;
  draft_transport_state: "fetch_not_observed" | "fetch_pending" | "headers_received" | "fetch_rejected";
  draft_rpc_ms: number;
  draft_before_fetch_ms: number;
  draft_fetch_ms?: number;
  draft_after_headers_ms?: number;
  draft_http_status?: number;
  draft_signal_aborted: boolean;
};

type DraftTransportTrace = {
  startedAt: number;
  state: QtDraftTransportDetails["draft_transport_state"];
  fetchAt?: number;
  settledAt?: number;
  status?: number;
};

// Only a draft request's existing AbortSignal can opt into this trace. No
// request body, URL, headers, token, Response body or account data is retained.
const draftTransportTraces = new WeakMap<AbortSignal, DraftTransportTrace>();
function transportNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
function transportMs(start: number, end: number): number {
  return Math.min(1_000_000, Math.max(0, Math.round(end - start)));
}

/** Supabase calls this after its internal access-token lookup, before fetch. */
export const fetchWithQtDraftObservation: typeof fetch = (input, init) => {
  const trace = init?.signal ? draftTransportTraces.get(init.signal) : undefined;
  // Every other request passes through without tracing or a promise wrapper.
  if (!trace) return globalThis.fetch(input, init);
  try { trace.fetchAt = transportNow(); trace.state = "fetch_pending"; } catch { /* Best effort. */ }
  const failed = () => {
    try { trace.settledAt = transportNow(); trace.state = "fetch_rejected"; } catch { /* Best effort. */ }
  };
  try {
    return globalThis.fetch(input, init).then(response => {
      try {
        trace.settledAt = transportNow();
        trace.state = "headers_received";
        trace.status = response.status;
      } catch { /* Never affect the response. */ }
      return response;
    }, error => { failed(); throw error; });
  } catch (error) { failed(); throw error; }
};

function startDraftTransportTrace(signal: AbortSignal, report?: (details: QtDraftTransportDetails) => void): () => void {
  if (!report) return () => {};
  try {
    const trace: DraftTransportTrace = { startedAt: transportNow(), state: "fetch_not_observed" };
    draftTransportTraces.set(signal, trace);
    return () => {
      draftTransportTraces.delete(signal);
      try {
        const end = transportNow();
        report({
          draft_transport_version: 1,
          draft_transport_state: trace.state,
          draft_rpc_ms: transportMs(trace.startedAt, end),
          draft_before_fetch_ms: transportMs(trace.startedAt, trace.fetchAt ?? end),
          ...(trace.fetchAt !== undefined ? { draft_fetch_ms: transportMs(trace.fetchAt, trace.settledAt ?? end) } : {}),
          ...(trace.state === "headers_received" && trace.settledAt !== undefined ? { draft_after_headers_ms: transportMs(trace.settledAt, end), draft_http_status: trace.status } : {}),
          draft_signal_aborted: signal.aborted,
        });
      } catch { /* Diagnostic failure must not change the save result. */ }
    };
  } catch { return () => {}; }
}

type QtDraftRpcResponse = {
  status?: unknown;
  id?: unknown;
  updated_at?: unknown;
  draft_client_updated_at?: unknown;
};

export function withQtDraftTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      try { onTimeout?.(); } catch { /* Keep the original timeout result. */ }
      reject(new Error(`[qt draft timeout] ${label} (${ms}ms)`));
    }, ms);

    Promise.resolve(promise).then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Reads the locally cached Supabase session first so draft recovery and
 * autosave do not depend on a fresh /auth/v1/user request every time. RLS is
 * still enforced by the access token used by the following database request.
 */
export async function getQtDraftSessionUser(
  supabase: SupabaseClient,
  onFailure?: (stage: "cached_session" | "user_check", error: unknown) => void,
  onStage?: (stage: "cached_session" | "user_check") => void,
): Promise<User | null> {
  const reportFailure = (stage: "cached_session" | "user_check", error: unknown) => {
    try { onFailure?.(stage, error); } catch { /* Diagnostics cannot affect auth fallback. */ }
  };
  const reportStage = (stage: "cached_session" | "user_check") => {
    try { onStage?.(stage); } catch { /* Diagnostics cannot affect auth or saving. */ }
  };
  try {
    reportStage("cached_session");
    const { data, error } = await withQtDraftTimeout(
      supabase.auth.getSession(),
      4_000,
      "auth.getSession",
    );
    if (!error && data.session?.user) return data.session.user;
    if (error) reportFailure("cached_session", error);
  } catch (error) {
    reportFailure("cached_session", error);
    // Fall through to a server-backed user check below.
  }

  try {
    reportStage("user_check");
    const { data, error } = await withQtDraftTimeout(
      supabase.auth.getUser(),
      6_000,
      "auth.getUser",
    );
    if (!error && data.user) return data.user;
    reportFailure("user_check", error ?? { name: "AuthSessionMissingError" });
  } catch (error) {
    reportFailure("user_check", error);
    // The caller decides whether it can continue from a local backup.
  }

  return null;
}

function isMissingDraftRpc(error: { code?: string | null; message?: string | null }) {
  const code = String(error.code ?? "");
  const message = String(error.message ?? "");
  return code === "PGRST202"
    || code === "42883"
    || /could not find the function[^\n]*save_own_qt_draft/i.test(message)
    || /function[^\n]*save_own_qt_draft[^\n]*does not exist/i.test(message);
}

function normalizeResult(value: unknown): QtDraftSaveResult {
  const raw = (value && typeof value === "object" ? value : {}) as QtDraftRpcResponse;
  const status = raw.status === "completed_exists" ? "completed_exists" : "saved";
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) throw new Error("Draft save returned no record id");

  const now = new Date().toISOString();
  return {
    status,
    id,
    updatedAt: typeof raw.updated_at === "string" && raw.updated_at
      ? raw.updated_at
      : now,
    clientUpdatedAt:
      typeof raw.draft_client_updated_at === "string" && raw.draft_client_updated_at
        ? raw.draft_client_updated_at
        : now,
  };
}

/**
 * Saves one complete client snapshot through an atomic authenticated RPC.
 *
 * There is intentionally no direct table-write fallback. A SELECT followed by
 * UPDATE/INSERT can race with another autosave, and a request that timed out in
 * JavaScript may still finish later and replace newer text. Migration 124 must
 * therefore be applied before deployment. Until the RPC is available, the
 * caller keeps the verified latest snapshot on the device and retries later.
 */
export async function saveQtDraftAtomically(
  supabase: SupabaseClient,
  payload: QtDraftServerPayload,
  onTransport?: (details: QtDraftTransportDetails) => void,
): Promise<QtDraftSaveResult> {
  const controller = new AbortController();
  const finishTrace = startDraftTransportTrace(controller.signal, onTransport);
  try {
    const { data, error } = await withQtDraftTimeout(
      supabase.rpc("save_own_qt_draft", {
        p_date: payload.date,
        p_client_updated_at: payload.clientUpdatedAt,
        p_qt_mode: payload.qtMode,
        p_current_step: payload.currentStep,
        p_bible_version: payload.bibleVersion,
        p_bible_ref: payload.bibleRef,
        p_key_verse: payload.keyVerse,
        p_opening_prayer: payload.openingPrayer,
        p_summary: payload.summary,
        p_meditation: payload.meditation,
        p_application: payload.application,
        p_decision: payload.decision,
        p_closing_prayer: payload.closingPrayer,
      }).abortSignal(controller.signal),
      10_000,
      "save_own_qt_draft",
      () => controller.abort(),
    );

    if (!error) return normalizeResult(data);
    if (isMissingDraftRpc(error)) {
      throw new Error("QT draft save RPC is not ready. Apply migration 124 before deployment.");
    }
    throw error;
  } finally {
    finishTrace();
  }
}
