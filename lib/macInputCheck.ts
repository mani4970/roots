import type { MouseEvent } from "react";

export function startMacInputCheck(event: MouseEvent<HTMLElement>) {
  if (!event.altKey || !event.shiftKey || event.button !== 0) return;

  const { nativeApp, nativePlatform, nativeIosDevice } = document.documentElement.dataset;
  if (nativeApp !== "true" || nativePlatform !== "ios" || nativeIosDevice !== "mac") return;

  const field = event.target;
  const email = field instanceof HTMLInputElement && field.type === "email";
  const writer = field instanceof HTMLTextAreaElement && field.closest(".qt-writer-editor");
  if ((!email && !writer) || field.disabled || field.readOnly) return;

  void import("./macInputTimingProbe").then(({ toggleMacInputTimingProbe }) => {
    if (field.isConnected && document.activeElement === field) toggleMacInputTimingProbe(field);
  }).catch(() => { /* A missing diagnostic chunk must not interrupt typing. */ });
}
