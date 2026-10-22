"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bell, Loader2, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date";
import { createClient } from "@/lib/supabase";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import {
  commentNotificationMessage,
  getCommentNotificationText,
} from "@/lib/notifications/commentNotificationText";
import {
  clearCommentNotifications,
  loadCommentNotificationPage,
  type CommentNotification,
} from "@/lib/notifications/commentNotifications";
import { useCommentNotifications } from "./CommentNotificationsProvider";
import styles from "./CommentNotificationInbox.module.css";

export function CommentNotificationBell({
  lang,
  onClick,
}: {
  lang: Lang;
  onClick: () => void;
}) {
  const { unread } = useCommentNotifications(),
    text = getCommentNotificationText(lang);
  return (
    <button
      type="button"
      className={styles.bell}
      onClick={onClick}
      aria-label={unread ? text.unread : text.title}
      title={text.title}
    >
      <Bell size={21} aria-hidden="true" />
      {unread > 0 && <span className={styles.dot} aria-hidden="true" />}
    </button>
  );
}

function Frame({
  lang,
  onClose,
  headerAction,
  children,
}: {
  lang: Lang;
  onClose: () => void;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  const text = getCommentNotificationText(lang);
  useAndroidBackHandler(() => {
    closeRef.current();
    return true;
  });
  useEffect(() => {
    const before = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],[tabindex="0"]',
        ) ?? [],
      ).filter((e) => e.getClientRects().length > 0);
      const first = buttons[0],
        last = buttons.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key, true);
      const active = document.activeElement;
      if (
        before instanceof HTMLElement &&
        before.isConnected &&
        (!active || active === document.body || ref.current?.contains(active))
      )
        before.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div
      className={styles.overlay}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closeRef.current();
      }}
    >
      <div
        ref={ref}
        className={styles.panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-notification-title"
      >
        <div className={styles.header}>
          <h2 id="comment-notification-title" className={styles.title}>
            {text.title}
          </h2>
          <div className={styles.headerActions}>
            {headerAction}
            <button
              type="button"
              className={styles.close}
              aria-label={text.close}
              onClick={() => closeRef.current()}
            >
              <X size={21} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function CommentNotificationStatus({
  lang,
  loading,
  onClose,
  onRetry,
  unavailable,
}: {
  lang: Lang;
  loading: boolean;
  onClose: () => void;
  onRetry: () => void;
  unavailable: boolean;
}) {
  const text = getCommentNotificationText(lang);
  return (
    <Frame lang={lang} onClose={onClose}>
      <div className={styles.state} role={loading ? "status" : "alert"}>
        {loading ? (
          <>
            <Loader2 size={20} className="spin" aria-hidden="true" />
            <p>{text.opening}</p>
          </>
        ) : (
          <>
            <p>{unavailable ? text.unavailable : text.error}</p>
            {!unavailable && (
              <button type="button" className={styles.action} onClick={onRetry}>
                {text.retry}
              </button>
            )}
          </>
        )}
      </div>
    </Frame>
  );
}

export default function CommentNotificationInbox({
  lang,
  onClose,
  onSelect,
}: {
  lang: Lang;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [rows, setRows] = useState<CommentNotification[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [clearing, setClearing] = useState(false),
    [clearError, setClearError] = useState(false),
    [more, setMore] = useState(false),
    [reload, setReload] = useState(0);
  const busy = useRef(false),
    clearBusy = useRef(false),
    alive = useRef(true),
    request = useRef<AbortController | null>(null),
    clearButton = useRef<HTMLButtonElement>(null),
    cursor = useRef<CommentNotification | undefined>();
  const { refresh } = useCommentNotifications(),
    text = getCommentNotificationText(lang);
  useEffect(() => {
    alive.current = true;
    busy.current = true;
    setLoading(true);
    setError(false);
    setRows([]);
    setMore(false);
    cursor.current = undefined;
    const controller = new AbortController();
    request.current = controller;
    void loadCommentNotificationPage(
      createClient(),
      undefined,
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted) {
          setRows(page.rows);
          setMore(page.hasMore);
          cursor.current = page.rows.at(-1);
          refresh();
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          busy.current = false;
          setLoading(false);
        }
      });
    return () => {
      alive.current = false;
      controller.abort();
      request.current?.abort();
    };
  }, [reload, refresh]);
  async function earlier() {
    if (busy.current || clearBusy.current || !cursor.current) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    const controller = new AbortController();
    request.current = controller;
    try {
      const page = await loadCommentNotificationPage(
        createClient(),
        cursor.current,
        controller.signal,
      );
      if (!alive.current || controller.signal.aborted) return;
      setRows((current) => [
        ...new Map(
          [...current, ...page.rows].map((row) => [row.id, row]),
        ).values(),
      ]);
      setMore(page.hasMore);
      cursor.current = page.rows.at(-1);
    } catch {
      if (alive.current && !controller.signal.aborted) setError(true);
    } finally {
      if (alive.current && !controller.signal.aborted) {
        busy.current = false;
        setLoading(false);
      }
    }
  }
  async function clearAll() {
    if (clearBusy.current) return;
    clearBusy.current = true;
    setClearing(true);
    setClearError(false);
    // An earlier-page response must not restore notifications after deletion.
    request.current?.abort();
    busy.current = false;
    setLoading(false);
    setError(false);
    try {
      await clearCommentNotifications(createClient());
      if (!alive.current) return;
      if (
        document.activeElement === clearButton.current ||
        document.activeElement === document.body
      )
        (
          clearButton.current?.closest('[role="dialog"]') as HTMLElement | null
        )?.focus({ preventScroll: true });
      setRows([]);
      setMore(false);
      cursor.current = undefined;
      // Fetch again so a notification arriving after deletion is still shown.
      setReload((n) => n + 1);
    } catch {
      if (alive.current) setClearError(true);
    } finally {
      clearBusy.current = false;
      if (alive.current) setClearing(false);
    }
  }
  return (
    <Frame
      lang={lang}
      onClose={onClose}
      headerAction={
        (rows.length > 0 || clearing) && (
          <button
            ref={clearButton}
            type="button"
            className={styles.clear}
            disabled={clearing}
            aria-busy={clearing}
            onClick={() => void clearAll()}
          >
            {text.clearAll}
          </button>
        )
      }
    >
      {clearError && (
        <p className={styles.state} role="alert">
          {text.clearError}
        </p>
      )}
      {!loading && !error && !rows.length && (
        <p className={styles.state}>{text.empty}</p>
      )}
      {rows.map((row) => (
        <button
          type="button"
          key={row.id}
          className={`${styles.item}${!row.read_at ? ` ${styles.unread}` : ""}`}
          disabled={clearing}
          onClick={() => onSelect(row.id)}
        >
          {row.profile?.avatar_url ? (
            <img
              className={styles.avatar}
              src={row.profile.avatar_url}
              width={34}
              height={34}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className={styles.avatar} aria-hidden="true">
              {(row.profile?.name || text.unknown).slice(0, 1)}
            </span>
          )}
          <span className={styles.copy}>
            <span className={styles.message}>
              {commentNotificationMessage(row.kind, row.profile?.name, lang)}
            </span>
            <span className={styles.preview}>{row.body}</span>
            <time className={styles.time} dateTime={row.created_at}>
              {new Date(row.created_at).toLocaleString(getDateLocale(lang), {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </span>
          {!row.read_at && (
            <span className={styles.itemDot} aria-hidden="true" />
          )}
        </button>
      ))}
      {loading && (
        <p className={styles.state} role="status">
          {text.loading}
        </p>
      )}
      {error && (
        <div className={styles.state} role="alert">
          {text.error}
          <button
            type="button"
            className={styles.action}
            onClick={() =>
              rows.length ? void earlier() : setReload((n) => n + 1)
            }
          >
            {text.retry}
          </button>
        </div>
      )}
      {more && !loading && !error && (
        <button
          type="button"
          className={styles.action}
          onClick={() => void earlier()}
        >
          {text.more}
        </button>
      )}
    </Frame>
  );
}
