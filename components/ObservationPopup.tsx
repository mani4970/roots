"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { beginObservation, observe, type ObservationFlow } from "@/lib/appObservation";

export type ObservedPopupKind =
  | "progress_badge" | "garden_badge" | "garden_stage" | "map_start" | "map_complete"
  | "character_reward" | "avatar_choice" | "celebration" | "monthly_badge"
  | "challenge_reward" | "welcome_back" | "onboarding" | "language_picker"
  | "required_update" | "spanish_announcement" | "companion_announcement"
  | "prayer_compose" | "prayer_cards" | "prayer_share" | "qt_choice" | "qt_draft_choice"
  | "chapter" | "notification_settings";

type PopupEntry = {
  flow: ObservationFlow;
  kind: ObservedPopupKind;
  instanceKey: string | object | null;
  marker: HTMLDivElement;
  progressDays?: number;
  visible: boolean;
  everVisible: boolean;
  acknowledged: boolean;
  active: boolean;
  finished: boolean;
  overlapSignature: string;
};

// This measures layouted popup layers, including a layer covered by another
// popup. It does not assert that a person read a popup or saw every pixel.
const entries = new Set<PopupEntry>();
let scanFrame = 0;
let listening = false;

function details(entry: PopupEntry) {
  return {
    reward_kind: entry.kind,
    measurement: "dom_layout",
    ...(entry.progressDays === undefined ? {} : { progress_days: entry.progressDays }),
  };
}

function hasVisibleLayout(marker: HTMLDivElement): boolean {
  if (!marker.isConnected || document.visibilityState !== "visible") return false;
  for (let parent: HTMLElement | null = marker; parent; parent = parent.parentElement) {
    const style = window.getComputedStyle(parent);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0) return false;
  }
  return Array.from(marker.children).some(child => {
    if (!(child instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(child);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0) return false;
    const rect = child.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0
      && rect.left < window.innerWidth && rect.top < window.innerHeight;
  });
}

function scanEntries() {
  scanFrame = 0;
  try {
    for (const entry of entries) {
      entry.visible = entry.active && hasVisibleLayout(entry.marker);
      if (entry.visible && !entry.everVisible) {
        entry.everVisible = true;
        observe(entry.flow, "popup_visible", details(entry));
      }
    }
    for (const entry of entries) {
      const visible = Array.from(entries).filter(candidate => candidate.visible && candidate.flow.userId === entry.flow.userId);
      const signature = visible.map(candidate => candidate.flow.id).sort().join(":");
      if (entry.visible && visible.length > 1 && entry.overlapSignature !== signature) {
        observe(entry.flow, "popup_overlap", { ...details(entry), count: visible.length });
      }
      entry.overlapSignature = entry.visible && visible.length > 1 ? signature : "";
    }
  } catch {
    // Diagnostics must never interrupt rendering, navigation or rewards.
  }
}

function scheduleScan() {
  try {
    if (!scanFrame) scanFrame = window.requestAnimationFrame(scanEntries);
  } catch { /* Observation is optional. */ }
}

function updateListeners() {
  try {
    if (entries.size > 0 && !listening) {
      document.addEventListener("visibilitychange", scheduleScan);
      window.addEventListener("resize", scheduleScan);
      listening = true;
    } else if (entries.size === 0 && listening) {
      document.removeEventListener("visibilitychange", scheduleScan);
      window.removeEventListener("resize", scheduleScan);
      if (scanFrame) window.cancelAnimationFrame(scanFrame);
      scanFrame = 0;
      listening = false;
    }
  } catch { /* Observation is optional. */ }
}

export function acknowledgeObservedPopup(
  userId: string | null | undefined,
  kind: ObservedPopupKind,
  action: "close" | "confirm" | "profile" | "invite" | "manage" | "update" | "select" | "back" = "close",
) {
  try {
    // A fast click may precede the scheduled animation frame.
    scanEntries();
    for (const entry of entries) {
      if (entry.flow.userId !== userId || entry.kind !== kind || !entry.active || entry.acknowledged) continue;
      entry.acknowledged = true;
      observe(entry.flow, "popup_acknowledged", { ...details(entry), action });
    }
  } catch { /* Observation must not affect the original callback. */ }
}

export default function ObservationPopup({
  userId, kind, queued, instanceKey = kind, progressDays, children,
}: {
  userId: string | null | undefined;
  kind: ObservedPopupKind;
  queued: boolean;
  // Used only locally to distinguish consecutive rewards. Never transmitted.
  instanceKey?: string | object | null;
  progressDays?: number;
  children: ReactNode;
}) {
  const markerRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<PopupEntry | null>(null);
  const progressDaysRef = useRef(progressDays);
  progressDaysRef.current = progressDays;

  useEffect(() => {
    if (!queued || !userId || !markerRef.current) return;
    let entry: PopupEntry | null = null;
    let observer: MutationObserver | null = null;
    let animationTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const previous = entryRef.current;
      if (previous && !previous.finished && previous.flow.userId === userId && previous.kind === kind && previous.instanceKey === instanceKey) {
        // React development StrictMode replays effects; retain the same flow.
        entry = previous;
      } else {
        const flow = beginObservation("home_popup", userId);
        if (!flow) return;
        entry = {
          flow, kind, instanceKey, marker: markerRef.current,
          progressDays: progressDaysRef.current,
          visible: false, everVisible: false, acknowledged: false,
          active: false, finished: false, overlapSignature: "",
        };
        entryRef.current = entry;
        observe(flow, "popup_queued", details(entry));
      }
      entry.active = true;
      entries.add(entry);
      updateListeners();
      observer = new MutationObserver(scheduleScan);
      observer.observe(entry.marker, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
      scheduleScan();
      // Catch opacity transitions without running a continuous polling loop.
      animationTimer = setTimeout(scheduleScan, 500);
    } catch { /* Telemetry setup cannot block this popup. */ }

    return () => {
      try {
        observer?.disconnect();
        if (animationTimer) clearTimeout(animationTimer);
        if (!entry) return;
        const ending = entry;
        ending.active = false;
        entries.delete(ending);
        updateListeners();
        scheduleScan();
        queueMicrotask(() => {
          try {
            if (ending.active || ending.finished) return;
            ending.finished = true;
            observe(ending.flow, ending.everVisible ? "popup_closed" : "popup_unshown", details(ending));
          } catch { /* Cleanup cannot affect the app. */ }
        });
      } catch { /* Cleanup cannot affect the app. */ }
    };
  }, [userId, kind, queued, instanceKey]);

  return <div ref={markerRef} style={{ display: "contents" }}>{children}</div>;
}
