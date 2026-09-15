"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

// Dismiss only a tap that both starts and ends on the popup's own backdrop.
// Card swipes, nested dialogs and cancelled touch gestures must not dismiss it.
export function usePrayerPopupBackdrop(onDismiss: () => void) {
  const tapStart = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      tapStart.current = event.isPrimary && event.button === 0 && event.target === event.currentTarget
        ? { x: event.clientX, y: event.clientY }
        : null;
    },
    onPointerCancel() {
      tapStart.current = null;
    },
    onClick(event: MouseEvent<HTMLButtonElement>) {
      const start = tapStart.current;
      tapStart.current = null;
      if (
        !start ||
        event.target !== event.currentTarget ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 ||
        document.elementFromPoint(event.clientX, event.clientY) !== event.currentTarget
      ) return;

      onDismiss();
    },
  };
}
