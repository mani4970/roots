"use client";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

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
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
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
): Promise<User | null> {
  try {
    const { data, error } = await withQtDraftTimeout(
      supabase.auth.getSession(),
      4_000,
      "auth.getSession",
    );
    if (!error && data.session?.user) return data.session.user;
  } catch {
    // Fall through to a server-backed user check below.
  }

  try {
    const { data, error } = await withQtDraftTimeout(
      supabase.auth.getUser(),
      6_000,
      "auth.getUser",
    );
    if (!error && data.user) return data.user;
  } catch {
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
): Promise<QtDraftSaveResult> {
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
    }),
    10_000,
    "save_own_qt_draft",
  );

  if (!error) return normalizeResult(data);
  if (isMissingDraftRpc(error)) {
    throw new Error("QT draft save RPC is not ready. Apply migration 124 before deployment.");
  }
  throw error;
}
