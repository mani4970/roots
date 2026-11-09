"use client";

import { useEffect, useRef } from "react";

type Direction = "left" | "right";
type Options = {
  viewKey: string;
  blocked: boolean;
  onSwipe: (direction: Direction) => boolean;
};
type Gesture = {
  id: number;
  x: number;
  y: number;
  scrollX: number;
  scrollY: number;
  startedAt: number;
  viewKey: string;
  horizontal: boolean;
};

const EDGE_GUTTER = 24;
const INTENT_DISTANCE = 12;
const SWIPE_DISTANCE = 64;
const MAX_VERTICAL_DRIFT = 48;
const MAX_DURATION = 900;
const DIRECTION_RATIO = 1.5;
const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const EXCLUDED = `${EDITABLE}, a, label, summary, nav, [role="dialog"], [role="menu"], [data-community-swipe-ignore]`;

function isIPhoneApp() {
  const data = document.documentElement.dataset;
  const { userAgent, platform } = window.navigator;
  return data.nativeApp === "true" && data.nativePlatform === "ios" && data.nativeFormFactor === "phone"
    && /iPhone/i.test(userAgent) && !/iPad|Macintosh/i.test(userAgent) && !/iPad|Mac/i.test(platform);
}

function isEditingOrSelecting() {
  return Boolean(document.activeElement?.matches(EDITABLE))
    || window.getSelection()?.isCollapsed === false
    || (window.visualViewport?.scale ?? 1) > 1.05;
}

function excludesTarget(root: HTMLElement, target: EventTarget | null) {
  if (!(target instanceof Element) || !root.contains(target) || target.closest(EXCLUDED)) return true;
  const button = target.closest("button");
  if (button && !button.hasAttribute("data-community-swipe-tab")) return true;
  // Let existing horizontal carousels keep ownership of their gestures.
  for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 2 && /^(auto|scroll)$/.test(getComputedStyle(node).overflowX)) return true;
  }
  return false;
}

/** Touch-only navigation for the installed iPhone app. No document scroll/zoom mutations. */
export function useCommunitySwipeNavigation(options: Options) {
  const rootRef = useRef<HTMLDivElement>(null);
  const latest = useRef(options);
  latest.current = options;
  const gesture = useRef<Gesture | null>(null);
  const suppressClickUntil = useRef(0);
  const navigationLock = useRef<{ viewKey: string; until: number } | null>(null);

  useEffect(() => {
    if (options.blocked) gesture.current = null;
  }, [options.blocked]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gesture.current = null;
    navigationLock.current = null;
    let attached = false;
    const cancel = () => { gesture.current = null; };
    const canContinue = (start: Gesture) => isIPhoneApp() && !latest.current.blocked
      && start.viewKey === latest.current.viewKey && !isEditingOrSelecting()
      && Math.abs(window.scrollX - start.scrollX) < 2
      && Math.abs(window.scrollY - start.scrollY) < 2;

    function start(event: TouchEvent) {
      cancel();
      // A fresh tap, including a button tap, must never inherit click suppression.
      suppressClickUntil.current = 0;
      if (!isIPhoneApp() || latest.current.blocked || event.touches.length !== 1
        || isEditingOrSelecting() || excludesTarget(root!, event.target)) return;
      const lock = navigationLock.current;
      if (lock?.viewKey === latest.current.viewKey && performance.now() < lock.until) return;
      const touch = event.touches[0];
      // Reserve OS edge navigation. Back from the first detail tab works in the rest of the content.
      if (touch.clientX <= EDGE_GUTTER || touch.clientX >= window.innerWidth - EDGE_GUTTER) return;
      gesture.current = {
        id: touch.identifier, x: touch.clientX, y: touch.clientY,
        scrollX: window.scrollX, scrollY: window.scrollY,
        startedAt: performance.now(), viewKey: latest.current.viewKey, horizontal: false,
      };
    }

    function move(event: TouchEvent) {
      const current = gesture.current;
      if (!current) return;
      const touch = Array.from(event.touches).find(item => item.identifier === current.id);
      if (!touch || event.touches.length !== 1 || !canContinue(current)
        || performance.now() - current.startedAt > MAX_DURATION) { cancel(); return; }
      const dx = Math.abs(touch.clientX - current.x);
      const dy = Math.abs(touch.clientY - current.y);
      if (dy > MAX_VERTICAL_DRIFT || (!current.horizontal && dy >= INTENT_DISTANCE && dy >= dx)) {
        cancel(); return;
      }
      if (dx >= INTENT_DISTANCE && dx >= dy * DIRECTION_RATIO) current.horizontal = true;
      if (current.horizontal) {
        // Only claim a clearly horizontal gesture. Vertical scroll/pinch and the prayer deck stay native.
        if (!event.cancelable) { cancel(); return; }
        event.preventDefault();
        suppressClickUntil.current = performance.now() + 800;
      }
    }

    function end(event: TouchEvent) {
      const current = gesture.current;
      cancel();
      if (!current || event.touches.length !== 0 || !canContinue(current)) return;
      const touch = Array.from(event.changedTouches).find(item => item.identifier === current.id);
      if (!touch) return;
      const dx = touch.clientX - current.x;
      const dy = Math.abs(touch.clientY - current.y);
      if (!current.horizontal) return;
      suppressClickUntil.current = performance.now() + 800;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      if (performance.now() - current.startedAt > MAX_DURATION || Math.abs(dx) < SWIPE_DISTANCE
        || dy > MAX_VERTICAL_DRIFT || Math.abs(dx) < dy * DIRECTION_RATIO) return;
      navigationLock.current = { viewKey: current.viewKey, until: performance.now() + 800 };
      if (!latest.current.onSwipe(dx < 0 ? "left" : "right")) navigationLock.current = null;
    }

    function suppressClick(event: MouseEvent) {
      // Keyboard/VoiceOver activation and later deliberate taps keep their normal behavior.
      if (event.detail === 0 || performance.now() >= suppressClickUntil.current
        || !(event.target instanceof Node) || !root!.contains(event.target)) return;
      suppressClickUntil.current = 0;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function keydown() { cancel(); suppressClickUntil.current = 0; }
    function guardMultiTouch(event: TouchEvent) { if (event.touches.length > 1) cancel(); }
    function attach() {
      if (attached) return;
      attached = true;
      root!.addEventListener("touchstart", start, { capture: true, passive: true });
      root!.addEventListener("touchmove", move, { capture: true, passive: false });
      root!.addEventListener("touchend", end, { capture: true, passive: false });
      root!.addEventListener("touchcancel", cancel, { capture: true, passive: true });
      root!.addEventListener("contextmenu", cancel, true);
      document.addEventListener("touchstart", guardMultiTouch, { capture: true, passive: true });
      document.addEventListener("click", suppressClick, true);
      document.addEventListener("keydown", keydown, true);
      document.addEventListener("selectionchange", cancel);
      window.addEventListener("scroll", cancel, { capture: true, passive: true });
      window.addEventListener("popstate", cancel);
      window.addEventListener("blur", cancel);
      window.addEventListener("pagehide", cancel);
    }
    function detach() {
      cancel();
      if (!attached) return;
      attached = false;
      root!.removeEventListener("touchstart", start, true);
      root!.removeEventListener("touchmove", move, true);
      root!.removeEventListener("touchend", end, true);
      root!.removeEventListener("touchcancel", cancel, true);
      root!.removeEventListener("contextmenu", cancel, true);
      document.removeEventListener("touchstart", guardMultiTouch, true);
      document.removeEventListener("click", suppressClick, true);
      document.removeEventListener("keydown", keydown, true);
      document.removeEventListener("selectionchange", cancel);
      window.removeEventListener("scroll", cancel, true);
      window.removeEventListener("popstate", cancel);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("pagehide", cancel);
    }
    const syncPlatform = () => { if (isIPhoneApp()) attach(); else detach(); };
    // NativeStatusBar publishes these attributes after hydration, including cold starts.
    const observer = new MutationObserver(syncPlatform);
    observer.observe(document.documentElement, {
      attributes: true, attributeFilter: ["data-native-app", "data-native-platform", "data-native-form-factor"],
    });
    syncPlatform();
    return () => { observer.disconnect(); detach(); };
  }, [options.viewKey]);

  return rootRef;
}
