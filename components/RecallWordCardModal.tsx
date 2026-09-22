"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import { translateBibleRef } from "@/lib/bibleBooks";
import { usePrayerModalViewport } from "@/lib/usePrayerModalViewport";
import { usePrayerPopupBackdrop } from "@/lib/usePrayerPopupBackdrop";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { getWordCardText } from "@/lib/wordCardText";
import { canShowRecallWord, getRecallMode, isDisplayableRecall, type RecallRecord } from "@/lib/wordCardRecord";
import { readRecallRecord, resolveHeldWord, type ResolvedHeldWord } from "@/lib/wordCardQueries";
import { RecallWordCardView } from "./WordCard";
import RecallWordCardPhoto from "./RecallWordCardPhoto";
import PhotoViewerModal from "./PhotoViewerModal";
import styles from "./WordCards.module.css";

type Props = { userId: string; date: string; today: string; lang: Lang; onClose: () => void; onRecordRead: (record: RecallRecord | null) => void };

export default function RecallWordCardModal({ userId, date, today, lang, onClose, onRecordRead }: Props) {
  const router = useRouter();
  const text = getWordCardText(lang);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const readCallbackRef = useRef(onRecordRead);
  closeRef.current = onClose;
  readCallbackRef.current = onRecordRead;
  const [record, setRecord] = useState<RecallRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [retryNonce, setRetryNonce] = useState(0);
  const [resolved, setResolved] = useState<ResolvedHeldWord | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const viewerOpenRef = useRef(false);
  viewerOpenRef.current = Boolean(photoViewerUrl);
  const closeTopRef = useRef(() => {});
  closeTopRef.current = () => {
    if (viewerOpenRef.current) setPhotoViewerUrl(null);
    else closeRef.current();
  };
  const viewStatus = status === "ready" && canShowRecallWord(record) && resolved === null ? "loading" : status;

  usePrayerModalViewport(rootRef, true);
  useAndroidBackHandler(() => { closeTopRef.current(); return true; });
  const backdrop = usePrayerPopupBackdrop(() => closeTopRef.current());

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeTopRef.current(); return; }
      const card = viewerOpenRef.current ? viewerRef.current : cardRef.current; // Read live after a compact notice/full card swap.
      if (event.key !== "Tab" || !card) return;
      const items = Array.from(card.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex='0']"))
        .filter(element => element.getClientRects().length > 0);
      if (!items.length) { event.preventDefault(); card.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [viewStatus]);

  // Reuse the existing zoom/pan viewer. Trap focus in the TOP dialog only,
  // leave the recall card mounted (including its scroll position), and restore
  // focus to the photo when the viewer is closed by X, Escape or Android back.
  useEffect(() => {
    if (!photoViewerUrl) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const layer = layerRef.current;
    const wasInert = layer?.inert ?? false;
    if (layer) layer.inert = true;
    const frame = requestAnimationFrame(() => {
      const dialog = viewerRef.current?.querySelector<HTMLElement>('[role="dialog"]');
      dialog?.setAttribute("aria-label", text.photoAlt);
      viewerRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (layer) layer.inert = wasInert;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [photoViewerUrl, text.photoAlt]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    setStatus("loading"); setRecord(null); setResolved(null); setPhotoViewerUrl(null);
    readRecallRecord(createClient(), userId, date, controller.signal).then(value => {
      if (cancelled) return;
      setRecord(value); setStatus(isDisplayableRecall(value) ? "ready" : "missing");
      readCallbackRef.current(value);
    }).catch(() => {
      if (!cancelled) setStatus("error");
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [userId, date, retryNonce]);

  useEffect(() => {
    if (!record || !canShowRecallWord(record)) { setResolved(null); return; }
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    setResolved(null);
    resolveHeldWord(record, lang, controller.signal).then(value => {
      if (!cancelled) setResolved(value);
    }).catch(() => {
      if (!cancelled) setResolved({ blocks: record.key_verse?.trim() ? [{ text: record.key_verse }] : [], sourceFailed: true, hasUnverifiedCandidates: true });
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [record, lang]);

  useEffect(() => {
    if (viewStatus !== "ready") {
      setShowScrollHint(false);
      return;
    }
    const node = scrollRef.current;
    if (!node) return;
    const update = () => {
      const overflows = node.scrollHeight > node.clientHeight + 4;
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 6;
      setShowScrollHint(overflows && !atBottom);
    };
    const frame = requestAnimationFrame(update);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(node);
    Array.from(node.children).forEach(child => observer?.observe(child));
    node.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      node.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [viewStatus, record?.id, resolved, photoViewerUrl]);

  const sourceContext = canShowRecallWord(record) && resolved?.hasUnverifiedCandidates && record?.bible_ref
    ? translateBibleRef(record.bible_ref, lang) : undefined;
  const sourceNote = resolved?.sourceFailed ? text.sourceUnavailable : undefined;

  if (typeof document === "undefined") return null;
  return createPortal(<div ref={rootRef} className={styles.overlay} lang={lang} data-word-card-overlay>
    <div ref={layerRef} className={styles.recallLayer} aria-hidden={photoViewerUrl ? true : undefined}>
    <button type="button" className={styles.backdrop} tabIndex={-1} aria-hidden="true" {...backdrop} />
    <RecallWordCardView lang={lang} date={date} today={today} record={record} status={viewStatus} cardRef={cardRef}
      scrollRef={scrollRef} showScrollHint={showScrollHint}
      blocks={canShowRecallWord(record) ? resolved?.blocks ?? [] : []}
      sourceNote={sourceNote} sourceContext={sourceContext} onClose={onClose}
      photo={record && getRecallMode(record) === "photo" && <RecallWordCardPhoto key={`${userId}:${record.id}:${record.photo_path ?? ""}`}
        record={record} userId={userId} lang={lang} onOpen={setPhotoViewerUrl} />}
      onRetry={() => setRetryNonce(value => value + 1)} onView={() => {
        if (!record) return;
        const href = `/qt/record?id=${encodeURIComponent(record.id)}`;
        onClose(); router.push(href);
      }} />
    </div>
    {photoViewerUrl && <div ref={viewerRef} tabIndex={-1} data-recall-photo-viewer>
      <PhotoViewerModal src={photoViewerUrl} alt={text.photoAlt} lang={lang} onClose={() => setPhotoViewerUrl(null)} />
    </div>}
  </div>, document.body);
}
