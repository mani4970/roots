"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import { getDateLocale } from "@/lib/date";
import {
  acknowledgeQtCommentNotice, loadQtCommentSafetyHistory, setQtCommentHidden, setQtCommentUserBlock,
  type CommentSafetyAction, type CommentSafetyItem, type CommentSafetyKind,
} from "@/lib/qtCommentSafety";
import { getQtCommentSafetyText } from "@/lib/qtCommentSafetyText";
import styles from "./CommentSafety.module.css";

export default function CommentSafetyHistory({ userId, lang, onChange, onBusyChange }: {
  userId: string; lang: Lang; onChange?: (action: CommentSafetyAction) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const text = getQtCommentSafetyText(lang);
  const [kind, setKind] = useState<CommentSafetyKind>("reports");
  const [items, setItems] = useState<CommentSafetyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const busy = useRef(false);
  const cursor = useRef<CommentSafetyItem | undefined>();
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true); setError(false); setItems([]); setHasMore(false); cursor.current = undefined;
    inFlight.current = true;
    void loadQtCommentSafetyHistory(createClient(), userId, kind, { signal: controller.signal })
      .then(page => {
        if (generation.current !== version) return;
        setItems(page.items); setHasMore(page.hasMore); cursor.current = page.items.at(-1);
      }).catch(() => { if (generation.current === version && !controller.signal.aborted) setError(true); })
      .finally(() => { if (generation.current === version) { inFlight.current = false; setLoading(false); } });
    return () => { generation.current++; controller.abort(); requestRef.current?.abort(); };
  }, [userId, kind, revision]);

  async function more() {
    if (inFlight.current || !hasMore || !cursor.current) return;
    const version = generation.current;
    const controller = new AbortController(); requestRef.current = controller;
    inFlight.current = true; setLoading(true); setError(false);
    try {
      const page = await loadQtCommentSafetyHistory(createClient(), userId, kind, { before: cursor.current, signal: controller.signal });
      if (generation.current !== version) return;
      setItems(current => [...current, ...page.items.filter(item => !current.some(old => old.id === item.id))]);
      setHasMore(page.hasMore); cursor.current = page.items.at(-1);
    } catch { if (generation.current === version && !controller.signal.aborted) setError(true); }
    finally { if (generation.current === version) { inFlight.current = false; setLoading(false); } }
  }

  async function act(item: CommentSafetyItem) {
    if (busy.current) return;
    busy.current = true; onBusyChange?.(true); setPending(item.id); setError(false);
    const version = generation.current;
    try {
      if (kind === "hidden" && item.comment_id) await setQtCommentHidden(createClient(), item.comment_id, false);
      else if (kind === "blocked" && item.hidden_user_id) await setQtCommentUserBlock(createClient(), item.hidden_user_id, false);
      else if (kind === "notices") await acknowledgeQtCommentNotice(createClient(), item.id);
      else return;
      if (generation.current !== version) return;
      if (kind === "notices") {
        setItems(current => current.map(row => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
        onChange?.({ kind: "acknowledge" });
      }
      else {
        setItems(current => current.filter(row => row.id !== item.id));
        onChange?.({ kind: "restore", commentId: item.comment_id, authorId: item.hidden_user_id });
      }
    } catch { if (generation.current === version) setError(true); }
    finally { busy.current = false; onBusyChange?.(false); if (generation.current === version) setPending(null); }
  }

  return <div>
    <div className={styles.tabs} role="group" aria-label={text.title}>
      {(["reports", "hidden", "blocked", "notices"] as const).map(tab => <button key={tab} type="button"
        aria-pressed={kind === tab} disabled={!!pending} className={`${styles.tab}${kind === tab ? ` ${styles.selected}` : ""}`}
        onClick={() => setKind(tab)}>{text[tab]}</button>)}
    </div>
    {!loading && !error && !items.length && <p className={styles.copy}>{text.empty}</p>}
    {items.map(item => <article className={styles.entry} key={item.id}>
      <p className={styles.meta}>{new Date(item.blocked_at ?? item.created_at).toLocaleString(getDateLocale(lang))}</p>
      {(item.name || kind === "blocked") && <p className={styles.copy}>{item.name || text.unknown}</p>}
      {(item.body_snapshot || item.preview) && <p className={styles.copy}>{item.body_snapshot || item.preview}</p>}
      {kind === "reports" && <>
        <p className={styles.status}>{item.status === "open" ? text.open : item.moderation_action === "removed" ? text.removed : item.moderation_action === "dismissed" ? text.dismissed : text.resolved}</p>
        {item.reason && <p className={styles.meta}>{text.reasons[item.reason]}</p>}
        <p className={styles.meta}>{text.receipt}: {item.id}</p>
        {item.review_message && <p className={styles.copy}>{text.reviewed}: {item.review_message}</p>}
      </>}
      {item.message && <p className={styles.copy}>{item.message}</p>}
      {(kind === "hidden" || kind === "blocked" || (kind === "notices" && !item.read_at)) && <button type="button"
        className={styles.button} disabled={!!pending} onClick={() => void act(item)}>
        {pending === item.id ? text.saving : kind === "hidden" ? text.restore : kind === "blocked" ? text.unblock : text.confirm}
      </button>}
    </article>)}
    {loading && <p role="status" className={styles.meta}>{text.loading}</p>}
    {error && <div role="alert"><p className={styles.error}>{text.error}</p><button type="button" className={styles.button}
      disabled={!!pending || loading} onClick={() => items.length && hasMore ? void more() : setRevision(value => value + 1)}>{text.retry}</button></div>}
    {hasMore && !error && <button type="button" className={styles.button} disabled={loading || !!pending} onClick={() => void more()}>{text.more}</button>}
    <p className={styles.meta}>{text.supportInfo}</p>
    <a className={styles.support} href="mailto:support@christian-roots.com">{text.contactSupport} · support@christian-roots.com</a>
  </div>;
}
