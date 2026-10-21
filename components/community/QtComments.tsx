"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Heart, Loader2, MessageCircle, MoreHorizontal, Pencil, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { createClient } from "@/lib/supabase";
import { loadProfileCards, type ProfileCard } from "@/lib/profileCards";
import { getQtCommentText } from "@/lib/qtCommentText";
import { getQtCommentSafetyText } from "@/lib/qtCommentSafetyText";
import type { CommentSafetyAction } from "@/lib/qtCommentSafety";
import CommentSafetyDialog from "./CommentSafetyDialog";
import {
  deleteQtComment, insertQtComment, loadQtCommentCounts, loadQtComments,
  QT_COMMENT_MAX_LENGTH, qtCommentLength, limitQtCommentInput, qtCommentContextKey, setQtCommentLike, updateQtComment,
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

type ReplyPage = { rows: QtComment[]; loaded: boolean; loading: boolean; error: boolean; hasMore: boolean; oldest: QtComment | null };
type Submission = { id: string; body: string; context: QtCommentContext };
const emptyReplyPage = (): ReplyPage => ({ rows: [], loaded: false, loading: false, error: false, hasMore: false, oldest: null });
function mergeComments(first: QtComment[], second: QtComment[]) {
  const byId = new Map(first.map(row => [row.id, row]));
  second.forEach(row => byId.set(row.id, { ...byId.get(row.id), ...row }));
  return [...byId.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id.localeCompare(b.id));
}

/** Kept outside the community page so reacting never remounts the draft or thread. */
export default function QtComments({ qtId, userId, context, lang, onCountChange, onOpenProfile }: Props) {
  const text = getQtCommentText(lang);
  const safetyText = getQtCommentSafetyText(lang);
  const contextKey = qtCommentContextKey(qtId, context);
  const [rows, setRows] = useState<QtComment[]>([]);
  const [count, setCount] = useState(0);
  const [canPost, setCanPost] = useState(true);
  const [safety, setSafety] = useState<QtComment | null>(null);
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
  const [actionError, setActionError] = useState<"save" | "delete" | "reply" | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const pendingRef = useRef(false);
  const moreRef = useRef(false);
  const submissionRef = useRef<Submission | null>(null);
  const [replies, setReplies] = useState<Record<string, ReplyPage>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});
  const [likeErrors, setLikeErrors] = useState<Record<string, boolean>>({});
  const replySubmissions = useRef<Record<string, Submission>>({});
  const replyRequests = useRef(new Map<string, AbortController>());
  const likeRequests = useRef(new Set<string>());
  const removedIds = useRef(new Set<string>());
  const oldestRoot = useRef<QtComment | null>(null);
  const replyInput = useRef<HTMLTextAreaElement | null>(null);
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
    setSafety(null);
    setEditing(null);
    setEditBody("");
    setDeleting(null);
    setActionError(null);
    submissionRef.current = null;
    replySubmissions.current = {};
    setReplies({});
    setExpanded({});
    setReplying(null);
    setReplyDrafts({});
    setLikePending({});
    setLikeErrors({});
  }, [contextKey, userId]);

  useEffect(() => { if (replying) replyInput.current?.focus(); }, [replying]);

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
    oldestRoot.current = null;
    replyRequests.current.forEach(controller => controller.abort());
    replyRequests.current.clear();
    likeRequests.current.clear();
    removedIds.current.clear();
    setReplies({});
    setExpanded({});
    setLikePending({});
    setLikeErrors({});
    setHasMore(false);
    countRef.current = 0;
    setCount(0);
    if (!userId) { setLoading(false); return () => { generation.current++; }; }
    void loadQtComments(createClient(), qtId, context, { signal: controller.signal })
      .then(page => {
        if (generation.current !== version) return;
        setRows(page.rows);
        setCanPost(page.canPost);
        publishCount(page.totalCount);
        setHasMore(page.hasMore);
        oldestRoot.current = page.oldest;
      })
      .catch(() => {
        if (generation.current === version && !controller.signal.aborted) setLoadError(true);
      })
      .finally(() => { if (generation.current === version) setLoading(false); });
    return () => {
      generation.current++;
      controller.abort();
      replyRequests.current.forEach(request => request.abort());
    };
    // A QT has one shared thread. Changing its entry surface or callbacks must not reload it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, userId, reload]);

  async function loadEarlier() {
    if (moreRef.current || pendingRef.current || !hasMore || !oldestRoot.current) return;
    moreRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    const version = generation.current;
    try {
      const page = await loadQtComments(createClient(), qtId, context, { before: oldestRoot.current });
      if (generation.current !== version) return;
      setRows(current => mergeComments(page.rows.filter(row => !commentIsFiltered(row)), current));
      setHasMore(page.hasMore);
      oldestRoot.current = page.oldest;
    } catch {
      if (generation.current === version) setLoadError(true);
    } finally {
      if (generation.current === version) { moreRef.current = false; setLoadingMore(false); }
    }
  }

  async function loadReplies(rootId: string, earlier = false) {
    if (replyRequests.current.has(rootId)) return;
    const currentPage = replies[rootId];
    if (earlier && (!currentPage?.hasMore || !currentPage.oldest)) return;
    const controller = new AbortController();
    replyRequests.current.set(rootId, controller);
    const version = generation.current;
    setReplies(current => ({ ...current, [rootId]: { ...(current[rootId] ?? emptyReplyPage()), loading: true, error: false } }));
    try {
      const page = await loadQtComments(createClient(), qtId, context, {
        parentId: rootId, before: earlier ? currentPage?.oldest ?? undefined : undefined, signal: controller.signal,
      });
      if (generation.current !== version) return;
      setReplies(current => ({ ...current, [rootId]: {
        rows: mergeComments(page.rows, current[rootId]?.rows ?? []).filter(row => !commentIsFiltered(row)),
        loaded: true, loading: false, error: false,
        hasMore: page.hasMore, oldest: page.oldest,
      } }));
    } catch {
      if (generation.current === version && !controller.signal.aborted) {
        setReplies(current => ({ ...current, [rootId]: { ...(current[rootId] ?? emptyReplyPage()), loading: false, error: true } }));
      }
    } finally {
      if (replyRequests.current.get(rootId) === controller) replyRequests.current.delete(rootId);
    }
  }

  function toggleReplies(rootId: string) {
    const open = !expanded[rootId];
    setExpanded(current => ({ ...current, [rootId]: open }));
    if (open && !replies[rootId]?.loaded) void loadReplies(rootId);
  }

  function patchComment(id: string, patch: Partial<QtComment>) {
    setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
    setReplies(current => Object.fromEntries(Object.entries(current).map(([rootId, page]) => [rootId, {
      ...page, rows: page.rows.map(row => row.id === id ? { ...row, ...patch } : row),
    }])));
  }

  async function toggleLike(comment: QtComment) {
    if (!userId || comment.author_id === userId || comment.deleted_at || likeRequests.current.has(comment.id)) return;
    const id = comment.id, version = generation.current;
    likeRequests.current.add(id);
    setLikePending(current => ({ ...current, [id]: true }));
    setLikeErrors(current => ({ ...current, [id]: false }));
    const next = !comment.my_liked;
    patchComment(id, { my_liked: next, like_count: Math.max(0, comment.like_count + (next ? 1 : -1)) });
    try {
      const stats = await setQtCommentLike(createClient(), id, next);
      if (generation.current === version) patchComment(id, { like_count: stats.like_count, my_liked: stats.my_liked });
    } catch {
      if (generation.current === version) {
        patchComment(id, { like_count: comment.like_count, my_liked: comment.my_liked });
        setLikeErrors(current => ({ ...current, [id]: true }));
      }
    } finally {
      if (generation.current === version) {
        likeRequests.current.delete(id);
        setLikePending(current => ({ ...current, [id]: false }));
      }
    }
  }

  async function submitReply(event: FormEvent, rootId: string) {
    event.preventDefault();
    const body = (replyDrafts[rootId] ?? "").trim();
    if (!body || qtCommentLength(body) > QT_COMMENT_MAX_LENGTH || pendingRef.current || !userId || !canPost) return;
    pendingRef.current = true;
    setPending(`reply:${rootId}`);
    setActionError(null);
    const version = generation.current;
    try {
      const supabase = createClient();
      if (replySubmissions.current[rootId]?.body !== body) {
        replySubmissions.current[rootId] = { id: crypto.randomUUID(), body, context: { ...context } };
      }
      const submission = replySubmissions.current[rootId];
      const row = await insertQtComment(supabase, qtId, submission.context, body, { id: submission.id, authorId: userId }, rootId);
      if (generation.current !== version) return;
      setReplyDrafts(current => ({ ...current, [rootId]: "" }));
      delete replySubmissions.current[rootId];
      setReplying(null);
      const alreadyVisible = replies[rootId]?.rows.some(comment => comment.id === row.id);
      setReplies(current => ({ ...current, [rootId]: {
        ...(current[rootId] ?? emptyReplyPage()), rows: mergeComments(current[rootId]?.rows ?? [], [row]),
      } }));
      setExpanded(current => ({ ...current, [rootId]: true }));
      if (!alreadyVisible) {
        setRows(current => current.map(comment => comment.id === rootId ? { ...comment, reply_count: comment.reply_count + 1 } : comment));
        publishCount(countRef.current + 1);
      }
      // Open only this thread. The page merges with the acknowledged reply,
      // including after a timeout/retry; other collapsed threads stay closed.
      if (!replies[rootId]?.loaded) void loadReplies(rootId);
      try {
        const [profile] = await loadProfileCards(supabase, [row.author_id]);
        if (generation.current === version && profile) patchComment(row.id, { profile });
      } catch { /* The acknowledged reply is already saved. */ }
      await refreshCount(version);
    } catch {
      if (generation.current === version) setActionError("reply");
    } finally {
      if (generation.current === version) { pendingRef.current = false; setPending(null); }
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
    if (!body || qtCommentLength(body) > QT_COMMENT_MAX_LENGTH || pendingRef.current || loading || loadError || !userId || !canPost) return;
    pendingRef.current = true;
    setPending("new");
    setActionError(null);
    const version = generation.current;
    try {
      const supabase = createClient();
      if (submissionRef.current?.body !== body) {
        submissionRef.current = { id: crypto.randomUUID(), body, context: { ...context } };
      }
      // An uncertain insert keeps its original route as well as its UUID when retried.
      const row = await insertQtComment(supabase, qtId, submissionRef.current.context, body, {
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
    const original = rows.find(row => row.id === id) ?? Object.values(replies).flatMap(page => page.rows).find(row => row.id === id);
    const maximum = Math.max(QT_COMMENT_MAX_LENGTH, qtCommentLength(original?.body ?? ""));
    if (!body || qtCommentLength(body) > maximum || pendingRef.current) return;
    pendingRef.current = true;
    setPending(id);
    setActionError(null);
    const version = generation.current;
    try {
      const updated = await updateQtComment(createClient(), id, body);
      if (generation.current !== version) return;
      patchComment(id, updated);
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
      const result = await deleteQtComment(createClient(), id);
      if (generation.current !== version) return;
      if (result.parent_id) {
        const parentId = result.parent_id;
        removedIds.current.add(id);
        if (result.reply_count === 0 && rows.some(row => row.id === parentId && row.deleted_at)) removedIds.current.add(parentId);
        setReplies(current => current[parentId] ? { ...current, [parentId]: {
          ...current[parentId], rows: current[parentId].rows.filter(comment => comment.id !== id),
        } } : current);
        setRows(current => current.map(comment => comment.id === parentId ? {
          ...comment, reply_count: result.reply_count ?? Math.max(0, comment.reply_count - 1),
        } : comment).filter(comment => !comment.deleted_at || comment.reply_count > 0));
        if (result.reply_count === 0) setExpanded(current => ({ ...current, [parentId]: false }));
      } else if (result.tombstone) {
        patchComment(id, { body: "", deleted_at: new Date().toISOString(), my_liked: false, like_count: 0,
          ...(result.reply_count !== undefined ? { reply_count: result.reply_count } : {}),
        });
        if (replying === id) setReplying(null);
      } else {
        removedIds.current.add(id);
        replies[id]?.rows.forEach(reply => removedIds.current.add(reply.id));
        replyRequests.current.get(id)?.abort();
        replyRequests.current.delete(id);
        setRows(current => current.filter(comment => comment.id !== id));
        setReplies(current => { const next = { ...current }; delete next[id]; return next; });
        setExpanded(current => { const next = { ...current }; delete next[id]; return next; });
        if (replying === id) setReplying(null);
      }
      if (result.deleted_now) publishCount(countRef.current - Math.max(1, result.deleted_count ?? 1));
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

  function safetyChanged(action: CommentSafetyAction) {
    if (action.kind !== "hide" && action.kind !== "report") return;
    const version = generation.current;
    const shouldHide = (row: QtComment) => row.id === action.commentId;
    const removedRoots = new Set(rows.filter(shouldHide).map(row => row.id));
    rows.filter(shouldHide).forEach(row => removedIds.current.add(row.id));
    Object.entries(replies).forEach(([rootId, page]) => {
      page.rows.filter(row => removedRoots.has(rootId) || shouldHide(row)).forEach(row => removedIds.current.add(row.id));
      if (removedRoots.has(rootId)) { replyRequests.current.get(rootId)?.abort(); replyRequests.current.delete(rootId); }
    });
    if (action.commentId) removedIds.current.add(action.commentId);
    setRows(current => current.filter(row => !removedIds.current.has(row.id)));
    setReplies(current => Object.fromEntries(Object.entries(current).filter(([id]) => !removedRoots.has(id))
      .map(([id, page]) => [id, { ...page, rows: page.rows.filter(row => !removedIds.current.has(row.id)) }])));
    if (replying && removedRoots.has(replying)) setReplying(null);
    void refreshCount(version);
    // Reconcile only the existing roots' statistics; retain drafts, pages and scroll.
    const ids = rows.filter(row => !removedIds.current.has(row.id)).map(row => row.id);
    void (async () => {
      try {
        for (let offset = 0; offset < ids.length; offset += 100) {
          const { data, error } = await createClient().rpc("get_qt_comment_stats", { p_comment_ids: ids.slice(offset, offset + 100) });
          if (error || generation.current !== version) return;
          (data ?? []).forEach((row: { comment_id: string; reply_count: number }) => patchComment(row.comment_id, { reply_count: Number(row.reply_count) }));
        }
      } catch { /* The acknowledged safety action remains successful. */ }
    })();
  }

  function commentIsFiltered(row: QtComment) {
    return removedIds.current.has(row.id) || (!!row.parent_id && removedIds.current.has(row.parent_id));
  }

  function renderComment(comment: QtComment, isReply = false) {
    const own = comment.author_id === userId;
    const editMaximum = Math.max(QT_COMMENT_MAX_LENGTH, qtCommentLength(comment.body));
    const confirmRemove = !isReply && comment.reply_count > 0 ? text.confirmRemoveThread : text.confirmRemove;
    return <div className={styles.commentContent} data-comment-id={comment.id}>
      {!comment.deleted_at && <div className={styles.commentHeader}>
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
        {!own && userId && <button type="button" className={styles.iconButton} aria-label={safetyText.menu}
          title={safetyText.menu} disabled={!!pending} aria-haspopup="dialog"
          onClick={() => { setDeleting(null); setSafety(comment); }}><MoreHorizontal size={18} aria-hidden="true" /></button>}
        {comment.author_id === userId && editing !== comment.id && (
          <div className={styles.headerActions} ref={deleting === comment.id ? deleteAnchorRef : undefined}>
            <button type="button" className={styles.iconButton} aria-label={text.edit} title={text.edit} disabled={!!pending}
              onClick={() => { setReplying(null); setEditing(comment.id); setEditBody(comment.body); setDeleting(null); setActionError(null); }}>
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
                role="dialog" aria-label={confirmRemove}>
                <p className={styles.deletePrompt}>{confirmRemove}</p>
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
      </div>}
      {comment.deleted_at ? <p className={styles.deleted}>{text.deleted}</p> : editing === comment.id ? (
        <div className={styles.composer}>
          <textarea className={styles.composerInput} aria-label={text.edit} maxLength={editMaximum * 2} value={editBody} onChange={event => setEditBody(limitQtCommentInput(event.target.value, editMaximum))} disabled={!!pending} rows={2} />
          <div className={`${styles.composerFooter} ${styles.editFooter}`}>
            <span className={styles.meta} style={{ marginRight: "auto" }}>{qtCommentLength(editBody)}/{editMaximum}</span>
            <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!!pending || !editBody.trim()}
              aria-busy={pending === comment.id} aria-label={pending === comment.id ? text.sending : text.save}
              onClick={() => void saveEdit(comment.id)}>{pending === comment.id ? <Loader2 size={16} className="spin" aria-hidden="true" /> : text.save}</button>
            <button type="button" className={styles.button} disabled={!!pending} onClick={() => { setEditing(null); setEditBody(""); setActionError(null); }}>{text.cancel}</button>
          </div>
        </div>
      ) : <div className={styles.bodyRow}>
        <p className={styles.commentBody} style={{ margin: 0, fontSize: 17, lineHeight: 1.8, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--text2)" }}>{comment.body}</p>
        {!own ? <button type="button" className={`${styles.reactionButton}${comment.my_liked ? ` ${styles.liked}` : ""}`}
            aria-label={comment.my_liked ? text.unlike : text.like} title={comment.my_liked ? text.unlike : text.like}
            aria-describedby={comment.like_count > 0 ? `qt-comment-like-count-${comment.id}` : undefined}
            aria-pressed={comment.my_liked} aria-busy={!!likePending[comment.id]}
            disabled={!userId || !!likePending[comment.id]} onClick={() => void toggleLike(comment)}>
            <Heart size={18} aria-hidden="true" fill={comment.my_liked ? "currentColor" : "none"} />
            {comment.like_count > 0 && <span id={`qt-comment-like-count-${comment.id}`}>{comment.like_count}</span>}
          </button> : comment.like_count > 0 ? <span className={styles.likeSummary} role="img" aria-label={`${text.like}: ${comment.like_count}`}>
            <Heart size={18} aria-hidden="true" />
            <span aria-hidden="true">{comment.like_count}</span>
          </span> : null}
      </div>}

      {editing !== comment.id && !isReply && <div className={styles.replyActions}>
        {!comment.deleted_at && <button type="button" className={styles.replyAction} aria-label={text.reply}
            disabled={!userId || !!pending || !canPost} aria-expanded={replying === comment.id}
            aria-controls={replying === comment.id ? `qt-comment-reply-form-${comment.id}` : undefined}
            onClick={() => {
              setReplying(current => current === comment.id ? null : comment.id);
              setEditing(null); setDeleting(null); setActionError(null);
            }}>{text.reply}</button>}
        {comment.reply_count > 0 && <button type="button" className={styles.replyToggle} aria-expanded={!!expanded[comment.id]}
          aria-controls={expanded[comment.id] ? `qt-comment-replies-${comment.id}` : undefined}
          onClick={() => toggleReplies(comment.id)}>
          <span className={styles.replyConnector} aria-hidden="true" />
          <span>{(comment.reply_count === 1 ? text.replyOne : text.replies).replace("{n}", String(comment.reply_count))}</span>
          <ChevronDown size={14} aria-hidden="true" className={expanded[comment.id] ? styles.chevronOpen : undefined} />
        </button>}
      </div>}
      {likeErrors[comment.id] && <p role="alert" className={styles.error}>{text.likeError}</p>}
    </div>;
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
      {rows.length > 0 && <div className={styles.commentList}>
        {rows.filter(comment => !comment.deleted_at || comment.reply_count > 0).map(comment => (
          <article key={comment.id} style={{ minWidth: 0 }}>
            {renderComment(comment)}
            {replying === comment.id && !comment.deleted_at && (
              <form id={`qt-comment-reply-form-${comment.id}`} className={`${styles.composer} ${styles.replyComposer}`}
                onSubmit={event => void submitReply(event, comment.id)}>
                <textarea ref={replyInput} className={styles.composerInput} rows={2}
                  aria-label={text.replyTo.replace("{name}", comment.profile?.name || text.unknown)}
                  value={replyDrafts[comment.id] ?? ""} maxLength={QT_COMMENT_MAX_LENGTH * 2} disabled={!!pending || !canPost}
                  onChange={event => { const value = limitQtCommentInput(event.target.value); setReplyDrafts(current => ({ ...current, [comment.id]: value })); }} />
                {actionError === "reply" && <p role="alert" className={styles.error}>{text.saveError}</p>}
                <div className={`${styles.composerFooter} ${styles.editFooter}`}>
                  <span className={styles.meta} style={{ marginRight: "auto" }}>{qtCommentLength(replyDrafts[comment.id] ?? "")}/{QT_COMMENT_MAX_LENGTH}</span>
                  <button type="submit" className={`${styles.button} ${styles.primary}`}
                    disabled={!!pending || !canPost || !(replyDrafts[comment.id] ?? "").trim()}
                    aria-label={pending === `reply:${comment.id}` ? text.sending : text.send}
                    aria-busy={pending === `reply:${comment.id}`}>
                    {pending === `reply:${comment.id}` ? <Loader2 size={16} className="spin" aria-hidden="true" /> : text.send}
                  </button>
                  <button type="button" className={styles.button} disabled={!!pending}
                    onClick={() => { setReplying(null); setActionError(null); }}>{text.cancel}</button>
                </div>
              </form>
            )}
            {expanded[comment.id] && <div id={`qt-comment-replies-${comment.id}`} className={styles.replies}>
              {replies[comment.id]?.loading && <p role="status" className={styles.meta}>{text.repliesLoading}</p>}
              {replies[comment.id]?.error && <div role="alert" className={styles.error}>
                <p>{text.repliesError}</p>
                <button type="button" className={styles.button}
                  onClick={() => void loadReplies(comment.id, !!replies[comment.id]?.loaded)}>{text.retry}</button>
              </div>}
              {replies[comment.id]?.hasMore && !replies[comment.id]?.error && <button type="button" className={styles.replyToggle}
                disabled={replies[comment.id]?.loading || !!pending} onClick={() => void loadReplies(comment.id, true)}>{text.earlierReplies}</button>}
              {replies[comment.id]?.rows.map(reply => <article key={reply.id} className={styles.replyItem}>{renderComment(reply, true)}</article>)}
            </div>}
          </article>
        ))}
      </div>}
      {actionError === "save" && <p role="alert" className={styles.error}>{text.saveError}</p>}
      {!loading && !canPost && <p className={styles.meta}>{safetyText.postingBlocked}</p>}
      {userId ? (
        <form className={styles.composer} onSubmit={event => void submit(event)}>
          <textarea className={styles.composerInput} aria-label={text.placeholder} placeholder={text.placeholder}
            value={draft} onChange={event => setDraft(limitQtCommentInput(event.target.value))} maxLength={QT_COMMENT_MAX_LENGTH * 2}
            disabled={!!pending || loading || !canPost || (loadError && !rows.length)} rows={2} />
          <div className={styles.composerFooter}>
            <span className={styles.meta}>{qtCommentLength(draft)}/{QT_COMMENT_MAX_LENGTH}</span>
            <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!!pending || loading || loadError || !canPost || !draft.trim()}>{pending === "new" ? text.sending : text.send}</button>
          </div>
        </form>
      ) : <p className={styles.meta}>{text.signIn}</p>}
      {safety && <CommentSafetyDialog key={safety.id} lang={lang}
        comment={safety} onClose={() => setSafety(null)} onChange={safetyChanged} />}
    </section>
  );
}
