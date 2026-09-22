"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import { getLocalDateString } from "@/lib/date";
import { usePrayerModalViewport } from "@/lib/usePrayerModalViewport";
import { usePrayerPopupBackdrop } from "@/lib/usePrayerPopupBackdrop";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { getWordCardText } from "@/lib/wordCardText";
import { readDailyWordRecord, resolveDailyWordContent, type DailyWordRecord, type DailyWordContent } from "@/lib/dailyWordCardRecord";
import DailyWordCard from "./DailyWordCard";
import { WordCardHeader } from "./WordCard";
import styles from "./WordCards.module.css";

type Props = { userId: string; date: string; lang: Lang; onClose: () => void;
  onRecordRead: (row: DailyWordRecord | null) => void; onMissing: () => void };

/** Read-only reopening. No emotion selection, awards, POST /api/verse or upsert. */
export default function DailyWordCardModal({ userId, date, lang, onClose, onRecordRead, onMissing }: Props) {
  const text = getWordCardText(lang);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onClose, onRecordRead, onMissing });
  callbacks.current = { onClose, onRecordRead, onMissing };
  const [content, setContent] = useState<DailyWordContent | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  usePrayerModalViewport(rootRef, true);
  useAndroidBackHandler(() => { callbacks.current.onClose(); return true; });
  const backdrop = usePrayerPopupBackdrop(() => callbacks.current.onClose());

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); callbacks.current.onClose(); return; }
      const card = cardRef.current; // Read live: loading and ready use different DOM roots.
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
  }, [content]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    setFailed(false); setContent(null);
    void (async () => {
      try {
        const row = await readDailyWordRecord(createClient(), userId, date, controller.signal);
        if (cancelled) return;
        if (getLocalDateString() !== date) { callbacks.current.onClose(); return; }
        callbacks.current.onRecordRead(row);
        if (!row) { callbacks.current.onMissing(); return; }
        const value = await resolveDailyWordContent(row, controller.signal);
        if (cancelled) return;
        if (getLocalDateString() !== date) { callbacks.current.onClose(); return; }
        setContent(value);
      } catch {
        if (!cancelled) setFailed(true);
      } finally { clearTimeout(timeout); }
    })();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [userId, date, retryNonce]);

  if (typeof document === "undefined") return null;
  return createPortal(<div ref={rootRef} className={styles.overlay} lang={lang} data-word-card-overlay>
    <button type="button" className={styles.backdrop} tabIndex={-1} aria-hidden="true" {...backdrop} />
    {content ? <DailyWordCard lang={lang} {...content} variant="popup" cardRef={cardRef} onClose={onClose} /> :
      <div ref={cardRef} lang={lang} className={`${styles.card} ${styles.modalCard}`} tabIndex={-1}
        role="dialog" aria-modal="true" aria-labelledby="roots-today-word-title">
        <WordCardHeader lang={lang} kind="today" closeButton={<button type="button" className={styles.close}
          onClick={onClose} aria-label={text.close}><X size={20} /></button>} />
        <div className={styles.scrollBody}>
          <div className={styles.bodyContent}>
            <div className={styles.state} role={failed ? "alert" : "status"}>
              {!failed && <Loader2 size={24} className="spin" aria-hidden="true" />}
              <p>{failed ? text.todayLoadError : text.todayLoading}</p>
              {failed && <button type="button" className={styles.action} onClick={() => setRetryNonce(n => n + 1)}>{text.retry}</button>}
            </div>
          </div>
        </div>
      </div>}
  </div>, document.body);
}
