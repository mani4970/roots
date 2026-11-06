"use client";

import { useRef, type HTMLAttributes } from "react";

const blockedPointers = new WeakSet<Event>();

/** A tap that dismisses a child menu must not also dismiss its reader. */
export function blockQtDetailOutsideDismiss(event: Event) {
  blockedPointers.add(event);
}

type OutsideTap = {
  root: HTMLDivElement;
  surface: EventTarget;
  pointerId: number;
  x: number;
  y: number;
  startedAt: number;
  scrollTop: number;
  ready: boolean;
};

function isNativeIosReader() {
  const { nativeApp, nativePlatform, nativeFormFactor, nativeIosDevice } = document.documentElement.dataset;
  return nativeApp === "true" && nativePlatform === "ios" && (
    nativeFormFactor === "phone" || (nativeFormFactor === "tablet" && nativeIosDevice === "ipad")
  );
}

function isOutsideSurface(root: HTMLDivElement, target: EventTarget | null) {
  return target === root || (
    target instanceof HTMLElement && target.parentElement === root
    && target.hasAttribute("data-qt-detail-outside")
  );
}

function isBlocked(root: HTMLDivElement) {
  // Read committed local state, including drafts whose reply input is now hidden.
  // Reading at pointerdown also preserves the guard before focus/menu dismissal.
  if (root.dataset.qtDismissBlocked === "true"
    || root.querySelector('[data-qt-dismiss-blocked="true"]')) return true;
  const active = document.activeElement;
  if (active instanceof HTMLElement && root.contains(active)
    && (active.matches("input, textarea") || active.isContentEditable)) return true;
  return window.getSelection()?.isCollapsed === false;
}

/** Supplemental native iPhone/iPad dismissal. The explicit X remains unchanged. */
export function useQtDetailOutsideDismiss(onClose: () => void): HTMLAttributes<HTMLDivElement> {
  const tap = useRef<OutsideTap | null>(null);
  const closingRoot = useRef<HTMLDivElement | null>(null);
  const cancel = () => { tap.current = null; };

  return {
    onPointerDownCapture(event) {
      cancel();
      const root = event.currentTarget;
      if (closingRoot.current === root || !isNativeIosReader() || !event.isPrimary || event.button !== 0
        || blockedPointers.has(event.nativeEvent)
        || !isOutsideSurface(root, event.target) || isBlocked(root)) return;
      tap.current = {
        root, surface: event.target, pointerId: event.pointerId,
        x: event.clientX, y: event.clientY, startedAt: event.timeStamp,
        scrollTop: root.scrollTop, ready: false,
      };
    },
    onPointerMoveCapture(event) {
      const start = tap.current;
      if (start && (event.pointerId !== start.pointerId
        || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8)) cancel();
    },
    onPointerUpCapture(event) {
      const start = tap.current;
      if (!start) return;
      // Touch implicitly captures the pointer. Hit-test its actual final position
      // as well, so a gesture ending on the card cannot dismiss the reader.
      if (event.currentTarget !== start.root || event.pointerId !== start.pointerId
        || event.target !== start.surface
        || document.elementFromPoint(event.clientX, event.clientY) !== start.surface
        || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
        || event.timeStamp - start.startedAt > 500
        || start.root.scrollTop !== start.scrollTop || isBlocked(start.root)) {
        cancel();
        return;
      }
      start.ready = true;
    },
    onPointerCancelCapture: cancel,
    onScrollCapture: cancel,
    onWheelCapture: cancel,
    onContextMenuCapture: cancel,
    onKeyDownCapture: cancel,
    onClick(event) {
      const start = tap.current;
      cancel();
      const root = event.currentTarget;
      if (!isNativeIosReader()) {
        // Preserve the existing root-only behavior on Android, Mac and web.
        if (event.target === root) onClose();
        return;
      }
      if (!event.defaultPrevented && start?.ready && start.root === root
        && closingRoot.current !== root
        && event.target === start.surface && isOutsideSurface(root, event.target)
        && event.timeStamp - start.startedAt <= 1000
        && root.scrollTop === start.scrollTop && !isBlocked(root)) {
        // Close on click, not pointerup: never expose a control under this gesture.
        closingRoot.current = root;
        onClose();
      }
    },
  };
}
