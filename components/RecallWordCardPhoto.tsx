"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import type { RecallRecord } from "@/lib/wordCardRecord";
import { readRecallPhotoUrl } from "@/lib/wordCardQueries";
import { getWordCardText } from "@/lib/wordCardText";
import styles from "./WordCards.module.css";

type PhotoState = { scope: string; status: "loading" | "image" | "ready" | "error"; url: string | null };
type Props = { record: RecallRecord; userId: string; lang: Lang; onOpen: (url: string) => void };

/** A private photo is fetched only after opening this card. No OCR, caption
 * fallback, public URL conversion, persistent cache or storage write. */
export default function RecallWordCardPhoto({ record, userId, lang, onOpen }: Props) {
  const text = getWordCardText(lang);
  const [attempt, setAttempt] = useState(0);
  const scope = `${userId}:${record.id}:${record.photo_path ?? ""}:${attempt}`;
  const [state, setState] = useState<PhotoState>({ scope: "", status: "loading", url: null });
  const current = state.scope === scope ? state : { scope, status: "loading" as const, url: null };
  const path = record.photo_path?.trim();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ scope, status: "loading", url: null });
    if (!path) return () => { cancelled = true; controller.abort(); };
    const timeout = setTimeout(() => controller.abort(), 8_000);
    readRecallPhotoUrl(createClient(), record, userId, controller.signal).then(url => {
      if (!cancelled) setState({ scope, status: "image", url });
    }).catch(() => {
      if (!cancelled) setState({ scope, status: "error", url: null });
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [record, userId, scope, path, attempt]);

  // A signed URL alone is not a displayed photo. Handle image failures and
  // requests that hang instead of leaving a spinner indefinitely.
  useEffect(() => {
    if (current.status !== "image") return;
    const timer = setTimeout(() => setState(previous => previous.scope === scope && previous.status === "image"
      ? { ...previous, status: "error", url: null } : previous), 15_000);
    return () => clearTimeout(timer);
  }, [current.status, current.url, scope]);

  function markImage(status: "ready" | "error") {
    setState(previous => previous.scope === scope && previous.status === "image"
      ? { ...previous, status, url: status === "error" ? null : previous.url } : previous);
  }

  if (!path) return <p className={styles.sourceNote} role="status">{text.photoMissing}</p>;
  if (current.status === "error") return <div className={styles.photoState} role="alert">
    <p>{text.photoError}</p>
    <button type="button" className={styles.photoRetry} onClick={() => setAttempt(value => value + 1)}>{text.retry}</button>
  </div>;

  return <div className={styles.photoContent} data-recall-photo-state={current.status}>
    {current.status !== "ready" && <div className={styles.photoState} role="status">
      <Loader2 size={22} className="spin" aria-hidden="true" /><p>{text.photoLoading}</p>
    </div>}
    {current.url && <button type="button" className={styles.photoButton}
      disabled={current.status !== "ready"} aria-label={text.photoOpen} aria-haspopup="dialog"
      style={current.status !== "ready" ? { position: "absolute", visibility: "hidden", pointerEvents: "none" } : undefined}
      onClick={() => { if (current.status === "ready" && current.url) onOpen(current.url); }}>
      <img key={`${scope}:${attempt}:${current.url}`} src={current.url} alt={text.photoAlt}
        className={styles.photoImage} draggable={false} decoding="async"
        onLoad={() => markImage("ready")} onError={() => markImage("error")} />
    </button>}
  </div>;
}
