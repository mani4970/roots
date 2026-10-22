import {
  loadProfileCards,
  mapProfileCards,
  type ProfileCard,
} from "@/lib/profileCards";
import type { QtComment, QtCommentContext } from "@/lib/qtComments";

export type CommentNotification = {
  id: string;
  qt_id: string;
  comment_id: string;
  parent_id: string | null;
  actor_id: string;
  kind: "comment" | "reply";
  created_at: string;
  read_at: string | null;
  body: string;
  profile?: ProfileCard;
};
export type CommentNotificationFocus = {
  notificationId: string;
  record: any;
  context: QtCommentContext | null;
  root: QtComment;
  target: QtComment;
};
export const COMMENT_NOTIFICATION_CHANGED =
  "roots-comment-notification-changed";
export const COMMENT_NOTIFICATION_INTENT = "roots-comment-notification-intent";
export function isCommentNotificationId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
export function commentNotificationLink(id: string) {
  return `/community?commentNotificationId=${encodeURIComponent(id)}`;
}
export function publishCommentNotificationChange() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(COMMENT_NOTIFICATION_CHANGED));
}

export async function loadCommentNotificationPage(
  supabase: any,
  cursor?: Pick<CommentNotification, "created_at" | "id">,
  signal?: AbortSignal,
) {
  const request = supabase.rpc("get_qt_comment_notification_page", {
    p_before_at: cursor?.created_at ?? null,
    p_before_id: cursor?.id ?? null,
  });
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw error;
  if (!Array.isArray(data?.rows)) throw new Error("Invalid notification page");
  let profiles: ProfileCard[] = [];
  try {
    profiles = await loadProfileCards(
      supabase,
      data.rows.map((n: CommentNotification) => n.actor_id),
      { signal },
    );
  } catch {
    if (signal?.aborted) throw signal.reason;
  }
  const cards = mapProfileCards(profiles);
  return {
    rows: data.rows.map((n: CommentNotification) => ({
      ...n,
      profile: cards[n.actor_id],
    })) as CommentNotification[],
    hasMore: data.has_more === true,
  };
}

export async function loadCommentNotificationFocus(
  supabase: any,
  id: string,
  signal?: AbortSignal,
): Promise<CommentNotificationFocus | null> {
  const request = supabase.rpc("get_qt_comment_notification_focus", {
    p_notification_id: id,
  });
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw error;
  if (!data?.root || !data?.target || !data?.record) return null;
  let profiles: ProfileCard[] = [];
  try {
    profiles = await loadProfileCards(
      supabase,
      [data.record.user_id, data.root.author_id, data.target.author_id],
      { signal },
    );
  } catch {
    if (signal?.aborted) throw signal.reason;
  }
  const cards = mapProfileCards(profiles);
  const normalize = (c: QtComment): QtComment => ({
    ...c,
    like_count: Number(c.like_count ?? 0),
    reply_count: Number(c.reply_count ?? 0),
    my_liked: c.my_liked === true,
    profile: cards[c.author_id],
  });
  return {
    notificationId: data.notification_id,
    record: { ...data.record, profiles: cards[data.record.user_id] },
    context: data.context,
    root: normalize(data.root),
    target: normalize(data.target),
  };
}

export async function acknowledgeCommentNotification(
  supabase: any,
  id: string,
) {
  const { data, error } = await supabase.rpc(
    "mark_qt_comment_notification_read",
    { p_notification_id: id },
  );
  if (error) throw error;
  if (!data) throw new Error("Notification is no longer accessible");
  publishCommentNotificationChange();
}

/** The SQL trigger is authoritative; this only wakes the durable server queue. */
export function wakeCommentNotificationDelivery(commentId: string) {
  if (typeof window === "undefined") return;
  void fetch("/api/comment-notifications/dispatch", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ commentId }),
  }).catch(() => {});
}
