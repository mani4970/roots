"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { getPrayerCardText } from "@/lib/prayerCardText";
import styles from "./PrayerCardDeck.module.css";

export type PrayerCardEntry = {
  id: string;
  kind: "mine" | "intercession";
  content: string;
  authorName?: string;
  header?: ReactNode;
  actions?: ReactNode;
  domId?: string;
};

type PrayerCardDeckProps = {
  items: PrayerCardEntry[];
  lang: Lang;
  activeId?: string | null;
  onActiveChange?: (id: string) => void;
  countByKind?: boolean;
  ariaLabel?: string;
  className?: string;
};

type Drag = {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  scale: number;
  moved: boolean;
};

const INTERACTIVE = "button, a, input, textarea, select, summary, [role='button'], [role='menu'], [contenteditable='true'], [data-prayer-no-drag]";
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function isInteractive(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE));
}

function PrayerCardBody({ content, isActive, label }: { content: string; isActive: boolean; label: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useBrowserLayoutEffect(() => {
    const body = bodyRef.current;
    const paragraph = contentRef.current;
    if (!body || !paragraph) return;
    let disposed = false;
    const measure = () => {
      if (disposed || body.clientHeight === 0) return;
      // CSS pixels work under the native app's zoom. Ignore subpixel rounding.
      const overflowing = body.scrollHeight > body.clientHeight + 1;
      setCanScroll(previous => previous === overflowing ? previous : overflowing);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    // Observe both available height and text height: headers, viewport, fonts,
    // and edited content can change whether this particular card needs a scroll.
    observer?.observe(body);
    observer?.observe(paragraph);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [content]);

  return (
    <div
      ref={bodyRef}
      className={`${styles.body}${canScroll ? ` ${styles.scrollableBody}` : ""}`}
      data-prayer-card-body
      data-prayer-card-scrollable={canScroll ? "true" : "false"}
      role="region"
      aria-label={label}
      tabIndex={isActive ? 0 : -1}
    >
      <p ref={contentRef}>{content}</p>
    </div>
  );
}

/** Presentation only: prayer mutations and permissions belong to the owning screen. */
export default function PrayerCardDeck({
  items,
  lang,
  activeId,
  onActiveChange,
  countByKind = false,
  ariaLabel,
  className,
}: PrayerCardDeckProps) {
  const text = getPrayerCardText(lang);
  const railRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const itemsRef = useRef(items);
  const changeRef = useRef(onActiveChange);
  const initialId = items.find(item => item.id === activeId)?.id ?? items[0]?.id ?? null;
  const currentRef = useRef<string | null>(initialId);
  const currentIndexRef = useRef(0);
  const [currentId, setCurrentId] = useState<string | null>(initialId);
  const pendingExternalRef = useRef(activeId ?? null);
  const lastExternalRef = useRef(activeId);
  const lastItemsKeyRef = useRef("");
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const itemsKey = JSON.stringify(items.map(item => item.id));
  itemsRef.current = items;
  changeRef.current = onActiveChange;

  const notifyCurrent = useCallback((id: string) => {
    const index = itemsRef.current.findIndex(item => item.id === id);
    if (index < 0) return;
    currentIndexRef.current = index;
    const changed = currentRef.current !== id;
    currentRef.current = id;
    setCurrentId(id);
    if (changed) changeRef.current?.(id);
  }, []);

  // offsetLeft and scrollLeft are both unscaled CSS pixels, including in the native
  // tablet shell. Bounding-client coordinates alone would drift under its CSS zoom.
  const positionFor = useCallback((id: string) => {
    const first = cardRefs.current.get(itemsRef.current[0]?.id);
    const card = cardRefs.current.get(id);
    return first && card ? card.offsetLeft - first.offsetLeft : 0;
  }, []);

  const scrollToId = useCallback((id: string, smooth = false) => {
    const rail = railRef.current;
    if (!rail || !cardRefs.current.has(id)) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left: positionFor(id), behavior: smooth && !reduced ? "smooth" : "auto" });
  }, [positionFor]);

  const nearestId = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return null;
    let nearest: string | null = null;
    let distance = Infinity;
    for (const item of itemsRef.current) {
      const difference = Math.abs(positionFor(item.id) - rail.scrollLeft);
      if (difference < distance) {
        nearest = item.id;
        distance = difference;
      }
    }
    return nearest;
  }, [positionFor]);

  useBrowserLayoutEffect(() => {
    const list = itemsRef.current;
    const structureChanged = lastItemsKeyRef.current !== itemsKey;
    lastItemsKeyRef.current = itemsKey;
    if (lastExternalRef.current !== activeId) {
      lastExternalRef.current = activeId;
      pendingExternalRef.current = activeId ?? null;
    }
    if (!list.length) {
      currentRef.current = null;
      setCurrentId(null);
      return;
    }
    const requested = list.find(item => item.id === pendingExternalRef.current)?.id;
    if (requested) {
      pendingExternalRef.current = null;
      const changed = requested !== currentRef.current;
      notifyCurrent(requested);
      // A controlled parent's echo of a manual swipe must not stop its momentum.
      if (changed || structureChanged) scrollToId(requested);
      return;
    }
    const preserved = list.find(item => item.id === currentRef.current)?.id;
    const fallback = list[Math.min(currentIndexRef.current, list.length - 1)].id;
    const next = preserved ?? fallback;
    notifyCurrent(next);
    if (structureChanged) scrollToId(next);
  }, [activeId, itemsKey, notifyCurrent, scrollToId]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;
    let frame: number | null = null;
    let previousWidth = rail.clientWidth;
    const observer = new ResizeObserver(() => {
      if (rail.clientWidth === previousWidth) return;
      previousWidth = rail.clientWidth;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (currentRef.current && !dragRef.current) scrollToId(currentRef.current);
      });
    });
    observer.observe(rail);
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [scrollToId]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
  }, []);

  const handleScroll = () => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const id = nearestId();
      if (id) notifyCurrent(id);
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || isInteractive(event.target)) return;
    const rail = railRef.current;
    if (!rail) return;
    const body = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-prayer-card-body]") : null;
    // Leave the body's native vertical scrollbar available to mouse users.
    if (body && body.scrollHeight > body.clientHeight && event.clientX > body.getBoundingClientRect().right - 18) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rail.scrollLeft,
      scale: rail.getBoundingClientRect().width / rail.clientWidth || 1,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || !rail || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null;
        return;
      }
      drag.moved = true;
      suppressClickRef.current = true;
      rail.classList.add(styles.dragging);
      rail.setPointerCapture(event.pointerId);
      window.getSelection()?.removeAllRanges();
    }
    event.preventDefault();
    rail.scrollLeft = drag.startLeft - dx / drag.scale;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || !rail || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    rail.classList.remove(styles.dragging);
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    if (drag.moved) {
      const id = nearestId();
      if (id) {
        notifyCurrent(id);
        scrollToId(id, event.type !== "pointercancel");
      }
      clickTimerRef.current = setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    let index = currentIndexRef.current;
    if (event.key === "ArrowRight") index += 1;
    else if (event.key === "ArrowLeft") index -= 1;
    else if (event.key === "Home" && event.target === event.currentTarget) index = 0;
    else if (event.key === "End" && event.target === event.currentTarget) index = itemsRef.current.length - 1;
    else return;
    event.preventDefault();
    const item = itemsRef.current[Math.max(0, Math.min(index, itemsRef.current.length - 1))];
    if (item) {
      notifyCurrent(item.id);
      scrollToId(item.id, true);
    }
  };

  const activeIndex = Math.max(0, items.findIndex(item => item.id === currentId));
  const kindTotals = { mine: 0, intercession: 0 };
  const kindPositions = { mine: 0, intercession: 0 };
  for (const item of items) kindTotals[item.kind] += 1;
  const positions = items.map((item, index) => {
    kindPositions[item.kind] += 1;
    return countByKind
      ? { current: kindPositions[item.kind], total: kindTotals[item.kind] }
      : { current: index + 1, total: items.length };
  });
  const activePosition = positions[activeIndex];

  return (
    <section className={`${styles.deck}${className ? ` ${className}` : ""}`} aria-label={ariaLabel ?? text.carouselLabel}>
      <div
        ref={railRef}
        className={styles.rail}
        role="region"
        aria-label={ariaLabel ?? text.carouselLabel}
        tabIndex={items.length ? 0 : -1}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onClickCapture={event => {
          if (suppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {items.map((item, index) => {
          const isActive = item.id === currentId;
          const kind = item.kind === "mine" ? text.mine : text.intercession;
          const position = positions[index];
          return (
            <article
              key={item.id}
              id={item.domId}
              ref={node => {
                if (node) cardRefs.current.set(item.id, node);
                else cardRefs.current.delete(item.id);
              }}
              className={styles.card}
              data-prayer-card-id={item.id}
              data-prayer-kind={item.kind}
              aria-label={`${kind}${item.authorName ? ` · ${item.authorName}` : ""} · ${text.cardLabel(position.current, position.total)}`}
              aria-hidden={!isActive}
            >
              <div
                className={styles.head}
                ref={node => {
                  if (isActive) node?.removeAttribute("inert");
                  else node?.setAttribute("inert", "");
                }}
              >
                {item.header ? (
                  <div className={styles.headerSlot}>{item.header}</div>
                ) : (
                  <div className={styles.meta}>
                    <span>{kind}</span>
                    {item.authorName && <span className={styles.author}>{item.authorName}</span>}
                  </div>
                )}
              </div>
              <PrayerCardBody content={item.content} isActive={isActive} label={text.bodyLabel} />
              {item.actions && (
                <div
                  className={styles.actions}
                  data-prayer-no-drag
                  ref={node => {
                    if (isActive) node?.removeAttribute("inert");
                    else node?.setAttribute("inert", "");
                  }}
                >
                  {item.actions}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {activePosition && (
        <p className={styles.position} role="status" aria-live="polite" aria-atomic="true" aria-label={text.cardLabel(activePosition.current, activePosition.total)}>
          {activePosition.current} / {activePosition.total}
        </p>
      )}
    </section>
  );
}
