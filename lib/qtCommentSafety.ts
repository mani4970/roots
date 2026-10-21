import { loadProfileCards, mapProfileCards } from "@/lib/profileCards";
import type { Lang } from "@/lib/i18n";

export const COMMENT_REPORT_REASONS = ["harassment", "hate", "spam", "privacy", "illegal", "other"] as const;
export type CommentReportReason = typeof COMMENT_REPORT_REASONS[number];
export type CommentSafetyKind = "reports" | "hidden" | "blocked" | "notices";
export type CommentSafetyItem = {
  id: string; created_at: string; blocked_at?: string; comment_id?: string; hidden_user_id?: string;
  author_id?: string; reported_user_id?: string; body_snapshot?: string; preview?: string; reason?: CommentReportReason;
  status?: string; moderation_action?: string; review_message?: string; reviewed_at?: string;
  message?: string; read_at?: string; name?: string;
};
export type CommentSafetyAction = { kind: "hide" | "report" | "block" | "restore" | "acknowledge"; commentId?: string; authorId?: string };

export async function setQtCommentHidden(client: any, commentId: string, hidden: boolean) {
  const { error } = await client.rpc("set_qt_comment_hidden", { p_comment_id: commentId, p_hidden: hidden });
  if (error) throw error;
}
export async function setQtCommentUserBlock(client: any, userId: string, blocked: boolean) {
  const { error } = await client.rpc("set_qt_comment_user_block", { p_user_id: userId, p_blocked: blocked });
  if (error) throw error;
}
export async function reportQtComment(client: any, input: {
  commentId: string; reason: CommentReportReason; details: string; name: string; email: string; goodFaith: boolean; lang: Lang;
}) {
  const { data, error } = await client.rpc("submit_qt_comment_report", {
    p_comment_id: input.commentId, p_reason: input.reason, p_details: input.details,
    p_name: input.name, p_email: input.email, p_good_faith: input.goodFaith, p_lang: input.lang,
  });
  if (error || typeof data !== "string") throw error ?? new Error("Missing report receipt");
  return data;
}

const HISTORY = {
  reports: { table: "qt_comment_reports", owner: "reporter_id", time: "created_at", columns: "id,comment_id,reported_user_id,body_snapshot,reason,status,created_at,reviewed_at,moderation_action,review_message" },
  hidden: { table: "qt_comment_hidden_items", owner: "user_id", time: "created_at", columns: "id,comment_id,author_id,preview,created_at" },
  blocked: { table: "hidden_community_users", owner: "user_id", time: "blocked_at", columns: "id,hidden_user_id,blocked_at,created_at" },
  notices: { table: "qt_comment_moderation_notices", owner: "user_id", time: "created_at", columns: "id,comment_id,preview,message,created_at,read_at" },
} as const;

export async function loadQtCommentSafetyHistory(client: any, userId: string, kind: CommentSafetyKind, options: {
  before?: CommentSafetyItem; signal?: AbortSignal;
} = {}) {
  const spec = HISTORY[kind];
  let query = client.from(spec.table).select(spec.columns).eq(spec.owner, userId)
    .order(spec.time, { ascending: false }).order("id", { ascending: false }).limit(21);
  if (kind === "blocked") query = query.not("blocked_at", "is", null);
  if (options.before) {
    const time = options.before[spec.time], id = options.before.id;
    if (!time || !/^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(time) || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid safety cursor");
    query = query.or(`${spec.time}.lt.${time},and(${spec.time}.eq.${time},id.lt.${id})`);
  }
  const { data, error } = await (options.signal ? query.abortSignal(options.signal) : query);
  if (error) throw error;
  const items: CommentSafetyItem[] = (data ?? []).slice(0, 20);
  if (kind === "blocked" || kind === "hidden") {
    try {
      const profiles = mapProfileCards(await loadProfileCards(client, items.map(row => row.hidden_user_id ?? row.author_id ?? "").filter(Boolean), { signal: options.signal }));
      items.forEach(row => { row.name = profiles[row.hidden_user_id ?? row.author_id ?? ""]?.name ?? undefined; });
    } catch (error) { if (options.signal?.aborted) throw error; }
  }
  return { items, hasMore: (data ?? []).length > 20 };
}

export async function acknowledgeQtCommentNotice(client: any, id: string) {
  const { error } = await client.from("qt_comment_moderation_notices").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
