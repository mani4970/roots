"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, MessageCircle, Pencil, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { createClient } from "@/lib/supabase";
import { loadProfileCards, type ProfileCard } from "@/lib/profileCards";
import { getQtCommentText } from "@/lib/qtCommentText";
import {
  deleteQtComment, insertQtComment, loadQtCommentCounts, loadQtComments,
  QT_COMMENT_MAX_LENGTH, qtCommentContextKey, updateQtComment,
  type QtComment, type QtCommentContext,
} from "@/lib/qtComments";
import styles from "./QtComments.module.css";

type Props = {
  qtId: string;
  userId: string;
  context: QtCommentContext;
  lang: Lang;
  onCountChange?: (count: number) => void;
  onOpenProfile?: (profile: ProfileCard | undefined, authorId: string) => void;
};

/** Kept outside the community page so reacting never remounts the draft or thread. */
export default function QtComments({ qtId, userId, context, lang, onCountChange, onOpenProfile }: Props) {
  const text = getQtCommentText(lang);
  const contextKey = qtCommentContextKey(qtId, context);
  const [rows, setRows] = useState<QtComment[]>([]);
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteAbove, setDeleteAbove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<"save" | "delete" | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const pendingRef = useRef(false);
  const moreRef = useRef(false);
  const submissionRef = useRef<{ id: string; body: string } | null>(null);
  const callbackRef = useRef(onCountChange);
  const deleteAnchorRef = useRef<HTMLDivElement | null>(null);
  const deletePopoverRef = useRef<HTMLDivElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  callbackRef.current = onCountChange;

  function closeDeleteConfirmation(restoreFocus = false) {
    if (pendingRef.current) return;
    setDeleting(null);
    setActionError(current => current === "delete" ? null : current);
    if (restoreFocus) deleteTriggerRef.current?.focus({ preventScroll: true });
  }

  useAndroidBackHandler(() => {
    if (!deleting) return false;
    closeDeleteConfirmation();
    return true;
  });

  // Only the floating confirmation changes sides; the comment and composer stay put.
  useLayoutEffect(() => {
    if (!deleting) return;
    function positionConfirmation() {
      const anchor = deleteAnchorRef.current?.getBoundingClientRect();
      const popup = deletePopoverRef.current?.getBoundingClientRect();
      if (!anchor || !popup) return;
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const below = bottom - anchor.bottom - 8;
      const above = anchor.top - top - 8;
      setDeleteAbove(below < popup.height && above > below);
    }
    positionConfirmation();
    document.addEventListener("scroll", positionConfirmation, true);
    window.addEventListener("resize", positionConfirmation);
    window.visualViewport?.addEventListener("resize", positionConfirmation);
    return () => {
      document.removeEventListener("scroll", positionConfirmation, true);
      window.removeEventListener("resize", positionConfirmation);
      window.visualViewport?.removeEventListener("resize", positionConfirmation);
    };
  }, [deleting, actionError, pending, lang]);

  useEffect(() => {
    if (!deleting) return;
    function handleOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !deleteAnchorRef.current?.contains(event.target)) {
        closeDeleteConfirmation();
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeDeleteConfirmation(true);
    }
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer, true);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [deleting]);

  function publishCount(value: number) {
    const next = Math.max(0, value);
    countRef.current = next;
    setCount(next);
    callbackRef.current?.(next);
  }

  useEffect(() => {
    setDraft("");
    setEditing(null);
    setEditBody("");
    setDeleting(null);
    setActionError(null);
    submissionRef.current = null;
  }, [contextKey, userId]);

  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    pendingRef.current = false;
    moreRef.current = false;
    setPending(null);
    setLoading(true);
    setLoadingMore(false);
    setLoadError(false);
    setRows([]);
    setHasMore(false);
    countRef.current = 0;
    setCount(0);
    if (!userId) { setLoading(false); return () => { generation.current++; }; }
    void loadQtComments(createClient(), qtId, context, { signal: controller.signal })
      .then(page => {
        if (generation.current !== version) return;
        setRows(page.rows);
        publishCount(page.remainingCount);
        setHasMore(page.remainingCount > page.rows.length);
      })
      .catch(() => {
        if (generation.current === version && !controller.signal.aborted) setLoadError(true);
      })
      .finally(() => { if (generation.current === version) setLoading(false); });
    return () => { generation.current++; controller.abort(); };
    // Primitive contextKey represents both scope fields; callback changes must not reload the thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, userId, reload]);

  async function loadEarlier() {
    if (moreRef.current || pendingRef.current || !hasMore || !rows.length) return;
    moreRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    const version = generation.current;
    try {
      const page = await loadQtComments(createClient(), qtId, context, { before: rows[0] });
      if (generation.current !== version) return;
      setRows(current => [...page.rows, ...current].filter((row, index, all) => all.findIndex(other => other.id === row.id) === index));
      setHasMore(page.remainingCount > page.rows.length);
    } catch {
      if (generation.current === version) setLoadError(true);
    } finally {
      if (generation.current === version) { moreRef.current = false; setLoadingMore(false); }
    }
  }

  async function refreshCount(version: number) {
    try {
      const values = await loadQtCommentCounts(createClient(), [{ qtId, ...context }]);
      if (generation.current === version) publishCount(values[contextKey] ?? 0);
    } catch { /* The successful write remains successful even if a follow-up count is offline. */ }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > QT_COMMENT_MAX_LENGTH || pendingRef.current || loading || loadError || !userId) return;
    pendingRef.current = true;
    setPending("new");
    setActionError(null);
    const version = generation.current;
    try {
      const supabase = createClient();
      if (submissionRef.current?.body !== body) {
        submissionRef.current = { id: crypto.randomUUID(), body };
      }
      const row = await insertQtComment(supabase, qtId, context, body, {
        id: submissionRef.current.id, authorId: userId,
      });
      if (generation.current !== version) return;
      // Do not erase text before the database acknowledges the insert.
      setDraft("");
      submissionRef.current = null;
      const alreadyVisible = rows.some(comment => comment.id === row.id);
      setRows(current => current.some(comment => comment.id === row.id) ? current : [...current, row]);
      if (!alreadyVisible) publishCount(countRef.current + 1);
      try {
        const [profile] = await loadProfileCards(supabase, [row.author_id]);
        if (generation.current === version && profile) setRows(current => current.map(comment => comment.id === row.id ? { ...comment, profile } : comment));
      } catch { /* A temporary profile failure must not invite duplicate comment submissions. */ }
      await refreshCount(version);
    } catch {
      if (generation.current === version) setActionError("save");
    } finally {
      if (generation.current === version) { pendingRef.current = false; setPending(null); }
    }
  }

  async function saveEdit(id: string) {
    const body = editBody.trim();
    if (!body || body.length > QT_COMMENT_MAX_LENGTH || pendingRef.current) return;
    pendingRef.current = true;
    setPending(id);
    setActionError(null);
    const version = generation.current;
    try {
      const updated = await updateQtComment(createClient(), id, body);
      if (generation.current !== version) return;
      setRows(current => current.map(comment => comment.id === id ? { ...comment, ...updated } : comment));
      setEditing(null);
      setEditBody("");
    } catch {
      if (generation.current === version) setActionError("save");
    } finally {
      if (generation.current === version) { pendingRef.current = false; setPending(null); }
    }
  }

  async function remove(id: string) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(id);
    setActionError(null);
    const version = generation.current;
    try {
      await deleteQtComment(createClient(), id);
      if (generation.current !== version) return;
      setRows(current => current.filter(comment => comment.id !== id));
      publishCount(countRef.current - 1);
      setDeleting(null);
      await refreshCount(version);
    } catch {
      if (generation.current === version) setActionError("delete");
    } finally {
      if (generation.current === version) { pendingRef.current = false; setPending(null); }
    }
  }

  function dateLabel(date: string) {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString(getDateLocale(lang), {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <section className={styles.thread} aria-label={text.title}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 17, color: "var(--text)", margin: "0 0 8px" }}>
        <MessageCircle size={19} aria-hidden="true" /> {text.title}{!loading && !loadError ? ` ${count}` : ""}
      </h3>
      {loading && <p role="status" className={styles.meta}><Loader2 size={15} className="spin" aria-hidden="true" /> {text.loading}</p>}
      {loadError && (
        <div role="alert" className={styles.error}>
          <p>{text.loadError}</p>
          <button type="button" className={styles.button} disabled={loadingMore} onClick={() => rows.length ? void loadEarlier() : setReload(value => value + 1)}>{text.retry}</button>
        </div>
      )}
      {hasMore && !loadError && <button type="button" className={styles.button} disabled={loadingMore || !!pending} onClick={() => void loadEarlier()}>{loadingMore ? text.loading : text.loadMore}</button>}
      {rows.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 20, margin: "18px 0" }}>
        {rows.map(comment => (
          <article key={comment.id} style={{ minWidth: 0 }}>
            <div className={styles.commentHeader}>
              <button type="button" className={styles.avatarButton} aria-label={text.profile} title={text.profile}
                disabled={!onOpenProfile} onClick={() => onOpenProfile?.(comment.profile, comment.author_id)}>
                {comment.profile?.avatar_url ? (
                  <img src={comment.profile.avatar_url} alt="" width={30} height={30} loading="lazy" style={{ objectFit: "cover", borderRadius: "50%", flexShrink: 0 }} />
                ) : (
                  <span aria-hidden="true" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--sage-light)", color: "var(--sage-dark)", fontSize: 14 }}>{(comment.profile?.name || text.unknown).slice(0, 1)}</span>
                )}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, overflowWrap: "anywhere" }}>{comment.profile?.name || text.unknown}</p>
                <p className={styles.meta} style={{ margin: 0 }}>
                  <time dateTime={comment.created_at}>{dateLabel(comment.created_at)}</time>
                  {comment.updated_at !== comment.created_at ? ` · ${text.edited}` : ""}
                </p>
              </div>
              {comment.author_id === userId && editing !== comment.id && (
                <div className={styles.headerActions} ref={deleting === comment.id ? deleteAnchorRef : undefined}>
                  <button type="button" className={styles.iconButton} aria-label={text.edit} title={text.edit} disabled={!!pending}
                    onClick={() => { setEditing(comment.id); setEditBody(comment.body); setDeleting(null); setActionError(null); }}>
                    <Pencil size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className={styles.iconButton} aria-label={text.remove} title={text.remove} disabled={!!pending}
                    aria-haspopup="dialog" aria-expanded={deleting === comment.id}
                    aria-controls={deleting === comment.id ? `qt-comment-delete-${comment.id}` : undefined}
                    onClick={(event) => {
                      deleteTriggerRef.current = event.currentTarget;
                      setDeleteAbove(false);
                      setDeleting(current => current === comment.id ? null : comment.id);
                      setActionError(null);
                    }}>
                    <X size={18} aria-hidden="true" />
                  </button>
                  {deleting === comment.id && (
                    <div id={`qt-comment-delete-${comment.id}`} ref={deletePopoverRef}
                      className={`${styles.deletePopover}${deleteAbove ? ` ${styles.deletePopoverAbove}` : ""}`}
                      role="dialog" aria-label={text.confirmRemove}>
                      <p className={styles.deletePrompt}>{text.confirmRemove}</p>
                      {actionError === "delete" && <p role="alert" className={styles.error}>{text.deleteError}</p>}
                      <div className={styles.deleteActions}>
                        <button type="button" className={`${styles.button} ${styles.danger}`} disabled={!!pending}
                          aria-busy={pending === comment.id} aria-label={pending === comment.id ? text.sending : text.confirm}
                          onClick={() => void remove(comment.id)}>{pending === comment.id ? <Loader2 size={16} className="spin" aria-hidden="true" /> : text.confirm}</button>
                        <button type="button" className={styles.button} disabled={!!pending} onClick={() => closeDeleteConfirmation(true)}>{text.cancel}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {editing === comment.id ? (
              <div className={styles.composer}>
                <textarea className={styles.composerInput} aria-label={text.edit} maxLength={QT_COMMENT_MAX_LENGTH} value={editBody} onChange={event => setEditBody(event.target.value)} disabled={!!pending} rows={2} />
                <div className={`${styles.composerFooter} ${styles.editFooter}`}>
                  <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!!pending || !editBody.trim()}
                    aria-busy={pending === comment.id} aria-label={pending === comment.id ? text.sending : text.save}
                    onClick={() => void saveEdit(comment.id)}>{pending === comment.id ? <Loader2 size={16} className="spin" aria-hidden="true" /> : text.save}</button>
                  <button type="button" className={styles.button} disabled={!!pending} onClick={() => { setEditing(null); setEditBody(""); setActionError(null); }}>{text.cancel}</button>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--text2)" }}>{comment.body}</p>
            )}
          </article>
        ))}
      </div>}
      {actionError === "save" && <p role="alert" className={styles.error}>{text.saveError}</p>}
      {userId ? (
        <form className={styles.composer} onSubmit={event => void submit(event)}>
          <textarea className={styles.composerInput} aria-label={text.placeholder} placeholder={text.placeholder}
            value={draft} onChange={event => setDraft(event.target.value)} maxLength={QT_COMMENT_MAX_LENGTH}
            disabled={!!pending || loading || (loadError && !rows.length)} rows={2} />
          <div className={styles.composerFooter}>
            <span className={styles.meta}>{draft.length}/{QT_COMMENT_MAX_LENGTH}</span>
            <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!!pending || loading || loadError || !draft.trim()}>{pending === "new" ? text.sending : text.send}</button>
          </div>
        </form>
      ) : <p className={styles.meta}>{text.signIn}</p>}
    </section>
  );
}
