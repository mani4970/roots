"use client";

import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { usePrayerModalViewport } from "@/lib/usePrayerModalViewport";
import { usePrayerPopupBackdrop } from "@/lib/usePrayerPopupBackdrop";
import styles from "./HomeHubDialog.module.css";

type HomeHubDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  compact?: boolean;
  anchorRef?: RefObject<HTMLElement>;
};

const FOCUSABLE = "button:not(:disabled), a[href], input:not(:disabled):not([type='hidden']), select:not(:disabled), textarea:not(:disabled), [contenteditable='true'], [tabindex]:not([tabindex='-1'])";

// The body lock is shared with the existing prayer dialogs, including native
// iPad/Mac zoom and keyboard handling. Home keeps these dialogs mutually exclusive.
export default function HomeHubDialog({
  open, title, description, closeLabel, onClose, children, busy = false, compact = false, anchorRef,
}: HomeHubDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const callbacks = useRef({ open, onClose, busy });
  callbacks.current = { open, onClose, busy };
  const id = useId();
  const titleId = `home-hub-title-${id}`;
  const descriptionId = `home-hub-description-${id}`;
  const dismiss = () => { if (!callbacks.current.busy) callbacks.current.onClose(); };
  const backdrop = usePrayerPopupBackdrop(dismiss);

  usePrayerModalViewport(rootRef, open);
  useAndroidBackHandler(() => {
    if (!callbacks.current.open) return false;
    // Consume Back while saving too, so it cannot navigate behind this dialog.
    if (!callbacks.current.busy) callbacks.current.onClose();
    return true;
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const popover = popoverRef.current;
    const anchor = anchorRef?.current;
    if (!open || !root || !popover || !anchor) return;
    const boundary = anchor.closest<HTMLElement>("[data-home-dashboard]") ?? document.body;

    let frame = 0;
    const viewport = window.visualViewport;
    const clamp = (value: number, minimum: number, maximum: number) =>
      Math.max(minimum, Math.min(value, Math.max(minimum, maximum)));

    function position() {
      frame = 0;
      if (!root || !popover || !anchor) return;
      const rootBounds = root.getBoundingClientRect();
      // DOM rects are visual pixels; absolute offsets are local CSS pixels.
      // Measuring this ratio keeps the pointer attached under native body zoom.
      const scale = root.clientWidth ? rootBounds.width / root.clientWidth : 1;
      if (!scale || !rootBounds.width || !rootBounds.height) return;
      const rootStyle = getComputedStyle(root);
      const left = Math.max(rootBounds.left, viewport?.offsetLeft ?? 0);
      const right = Math.min(rootBounds.right, (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth));
      const top = Math.max(rootBounds.top, viewport?.offsetTop ?? 0);
      const bottom = Math.min(rootBounds.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight));
      const insetTop = Math.max(14, Number.parseFloat(rootStyle.paddingTop) || 0) * scale;
      const insetBottom = Math.max(14, Number.parseFloat(rootStyle.paddingBottom) || 0) * scale;
      const insetX = 14 * scale;
      // The overlay fills the window, but the home cards can be a narrower,
      // centered column. Keep the popup and its pointer inside that column too.
      const boundaryBounds = boundary.getBoundingClientRect();
      const boundaryScale = boundary.offsetWidth ? boundaryBounds.width / boundary.offsetWidth : scale;
      const boundaryStyle = getComputedStyle(boundary);
      const contentLeft = boundaryBounds.left + (Number.parseFloat(boundaryStyle.paddingLeft) || 0) * boundaryScale;
      const contentRight = boundaryBounds.right - (Number.parseFloat(boundaryStyle.paddingRight) || 0) * boundaryScale;
      const minimumX = Math.max(left + insetX, contentLeft) + 8 * scale;
      const maximumRight = Math.min(right - insetX, contentRight);
      const availableHeight = Math.max(0, (bottom - top - insetTop - insetBottom) / scale);
      const availableWidth = Math.max(0, (maximumRight - minimumX) / scale);
      popover.style.width = `${Math.min(220, availableWidth)}px`;
      popover.style.setProperty("--popover-max-height", `${availableHeight}px`);

      const bounds = popover.getBoundingClientRect();
      const anchorBounds = anchor.getBoundingClientRect();
      const anchorCenterY = (anchorBounds.top + anchorBounds.bottom) / 2;
      // Begin halfway across the routine card, keeping the menu beside its
      // visible left half even when there is room beyond the app column.
      const x = clamp((anchorBounds.left + anchorBounds.right) / 2, minimumX, maximumRight - bounds.width);
      const y = clamp(anchorCenterY - bounds.height / 2, top + insetTop, bottom - insetBottom - bounds.height);
      popover.style.left = `${(x - rootBounds.left) / scale}px`;
      popover.style.top = `${(y - rootBounds.top) / scale}px`;
      popover.style.setProperty("--popover-pointer-top", `${clamp((anchorCenterY - y) / scale, 20, bounds.height / scale - 20)}px`);
      popover.dataset.positioned = "true";
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(position);
    }
    position();
    // Re-measure after the shared viewport hook fixes the body in place.
    schedule();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(root);
    observer?.observe(popover);
    observer?.observe(anchor);
    observer?.observe(boundary);
    window.addEventListener("resize", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    const root = rootRef.current;
    const dialog = dialogRef.current;
    if (!open || !root || !dialog) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter(element => element.getClientRects().length > 0 && !element.closest("[hidden], [inert]"));
    const focusFirst = () => (closeRef.current && !closeRef.current.disabled ? closeRef.current : dialog)
      .focus({ preventScroll: true });
    const frame = requestAnimationFrame(focusFirst);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!callbacks.current.busy) callbacks.current.onClose();
      } else if (event.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) { event.preventDefault(); dialog!.focus({ preventScroll: true }); return; }
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && (active === first || !items.includes(active!))) {
          event.preventDefault(); last.focus({ preventScroll: true });
        } else if (!event.shiftKey && (active === last || !items.includes(active!))) {
          event.preventDefault(); first.focus({ preventScroll: true });
        }
      }
    }
    function onFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && !dialog!.contains(event.target)) focusFirst();
    }

    // Fixed-body locking prevents the home page from moving. These local guards
    // additionally stop iOS rubber-banding/trackpad chaining at dialog edges and
    // keep horizontal gestures away from the home beneath the portal.
    let previousTouch: { x: number; y: number } | null = null;
    function canScroll(target: EventTarget | null, direction: number) {
      if (!direction || !(target instanceof Element)) return false;
      let element: Element | null = target;
      while (element && dialog!.contains(element)) {
        if (element instanceof HTMLElement) {
          const overflowY = getComputedStyle(element).overflowY;
          if ((overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight + 1) {
            if (direction < 0 && element.scrollTop > 0) return true;
            if (direction > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
          }
        }
        if (element === dialog) break;
        element = element.parentElement;
      }
      return false;
    }
    function onTouchStart(event: TouchEvent) {
      event.stopPropagation();
      previousTouch = event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null;
    }
    function onTouchMove(event: TouchEvent) {
      event.stopPropagation();
      const inside = event.target instanceof Node && dialog!.contains(event.target);
      if (!inside) { if (event.cancelable) event.preventDefault(); return; }
      // Keep pinch zoom and native text-selection behavior available inside.
      if (event.touches.length !== 1 || !previousTouch) return;
      const touch = event.touches[0];
      const dx = previousTouch.x - touch.clientX;
      const dy = previousTouch.y - touch.clientY;
      previousTouch = { x: touch.clientX, y: touch.clientY };
      const editable = event.target instanceof Element && !!event.target.closest("input, textarea, [contenteditable='true']");
      if (editable && Math.abs(dx) > Math.abs(dy)) return;
      if (Math.abs(dx) > Math.abs(dy) || !canScroll(event.target, dy)) {
        if (event.cancelable) event.preventDefault();
      }
    }
    function onTouchEnd(event: TouchEvent) { event.stopPropagation(); previousTouch = null; }
    function onWheel(event: WheelEvent) {
      event.stopPropagation();
      if (event.ctrlKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || !canScroll(event.target, event.deltaY)) {
        if (event.cancelable) event.preventDefault();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    root.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      root.removeEventListener("wheel", onWheel);
      // Do not steal focus from a replacement dialog during a popup handoff.
      const active = document.activeElement;
      if (previous?.isConnected && (active === document.body || (active instanceof Node && dialog.contains(active)))) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const dialog = (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined} aria-busy={busy}
      className={`${styles.dialog}${compact ? ` ${styles.compact}` : ""}${anchorRef ? ` ${styles.anchoredDialog}` : ""}`}
    >
      <button ref={closeRef} type="button" className={styles.close} aria-label={closeLabel}
        disabled={busy} onClick={dismiss}><X size={anchorRef ? 17 : 21} strokeWidth={1.8} aria-hidden="true" /></button>
      <h2 id={titleId} className={styles.title}>{title}</h2>
      {description && <p id={descriptionId} className={styles.description}>{description}</p>}
      <div className={styles.content}>{children}</div>
    </div>
  );

  return createPortal(
    <div ref={rootRef} className={`${styles.overlay}${anchorRef ? ` ${styles.anchoredOverlay}` : ""}`}
      onPointerDown={event => event.stopPropagation()}
      onPointerMove={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
    >
      <button type="button" tabIndex={-1} aria-hidden="true" className={styles.backdrop} {...backdrop} />
      {anchorRef ? <div ref={popoverRef} className={styles.popover}>{dialog}</div> : dialog}
    </div>, document.body,
  );
}
