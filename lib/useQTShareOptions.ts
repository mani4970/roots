"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { observe, observationError, type ObservationFlow } from "@/lib/appObservation";
import { loadRecoverableSharePromptOptions, type SharePromptOptions } from "@/lib/sharePromptOptions";

export const QT_SHARE_OPTIONS_TIMEOUT_MS = 10_000;

type ShareOptionsState = SharePromptOptions & {
  loading: boolean;
  failed: boolean;
};

/** Read-only list recovery; never saves a reflection or changes selected targets. */
export function useQTShareOptions(
  open: boolean,
  lang: Lang,
  getFlow: () => ObservationFlow | null,
) {
  const [state, setState] = useState<ShareOptionsState>({ groups: [], partners: [], loading: false, failed: false });
  const generationRef = useRef(0);
  const attemptRef = useRef(0);
  const activeRef = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null);
  const getFlowRef = useRef(getFlow);
  getFlowRef.current = getFlow;
  const errorRef = useRef<{ generation: number; attempt: number; flow: ObservationFlow | null; reported: boolean } | null>(null);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    if (activeRef.current) {
      clearTimeout(activeRef.current.timer);
      activeRef.current.controller.abort();
      activeRef.current = null;
    }
  }, []);

  const load = useCallback(async (force = false) => {
    cancel();
    const generation = generationRef.current;
    const attempt = ++attemptRef.current;
    const controller = new AbortController();
    let flow: ObservationFlow | null = null;
    try { flow = getFlowRef.current(); } catch { /* Observations never block the list. */ }
    if (force) observe(flow, "retry_clicked", { phase: "share_options", source: "manual", attempt });
    observe(flow, "recipients_requested", { phase: "share_options", source: "button", attempt });
    errorRef.current = null;
    setState({ groups: [], partners: [], loading: true, failed: false });

    const timer = setTimeout(() => {
      const timeout = new Error("QT share options deadline exceeded");
      timeout.name = "TimeoutError";
      controller.abort(timeout);
    }, QT_SHARE_OPTIONS_TIMEOUT_MS);
    activeRef.current = { controller, timer };

    try {
      const options = await loadRecoverableSharePromptOptions(t("profile_default_name", lang), {
        signal: controller.signal,
        force,
      });
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setState({ ...options, loading: false, failed: false });
      observe(flow, "recipients_ok", { phase: "share_options", source: "button", attempt, recovery: force });
    } catch (error) {
      if (generation !== generationRef.current) return;
      // Also stop parallel reads if one failed before the overall deadline.
      controller.abort();
      errorRef.current = { generation, attempt, flow, reported: false };
      setState({ groups: [], partners: [], loading: false, failed: true });
      observe(flow, "recipients_error", { phase: "share_options", source: "button", attempt, ...observationError(error) });
    } finally {
      clearTimeout(timer);
      if (generation === generationRef.current) activeRef.current = null;
    }
  }, [cancel, lang]);

  // Closing/completing/unmounting cannot let an old request refill the next modal.
  useEffect(() => { if (!open) cancel(); }, [open, cancel]);
  useEffect(() => () => cancel(), [cancel]);

  useEffect(() => {
    if (!open || !state.failed) return;
    const pending = errorRef.current;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!pending || pending.reported || errorRef.current !== pending
          || pending.generation !== generationRef.current || document.visibilityState !== "visible") return;
        pending.reported = true;
        observe(pending.flow, "retry_shown", { phase: "share_options", source: "button", attempt: pending.attempt });
      });
    });
    return () => { cancelAnimationFrame(firstFrame); if (secondFrame) cancelAnimationFrame(secondFrame); };
  }, [open, state.failed]);

  return { ...state, load, cancel };
}
