import { loadProfileCards, mapProfileCards, type ProfileCard } from "@/lib/profileCards";

export type QtCommentContext = {
  scope: "all" | "group" | "partner";
  scopeId: string | null;
};

export type QtCommentCountRequest = QtCommentContext & { qtId: string };
export type QtComment = {
  id: string;
  qt_id: string;
  scope: QtCommentContext["scope"];
  scope_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  deleted_at: string | null;
  like_count: number;
  my_liked: boolean;
  reply_count: number;
  profile?: ProfileCard;
};

export const QT_COMMENT_MAX_LENGTH = 2000;
export const QT_COMMENT_PAGE_SIZE = 30;
const COMMENT_COLUMNS = "id,qt_id,scope,scope_id,author_id,body,created_at,updated_at,parent_id,deleted_at";

/** One thread/count identity per QT; context remains insertion provenance only. */
export function qtCommentContextKey(qtId: string, _context?: QtCommentContext) {
  return qtId;
}

function normalizeComment(row: any): QtComment {
  return { ...row, parent_id: row.parent_id ?? null, deleted_at: row.deleted_at ?? null,
    like_count: Number(row.like_count ?? 0), my_liked: row.my_liked === true, reply_count: Number(row.reply_count ?? 0) };
}

/** Counts follow live QT visibility; no comment bodies are loaded. */
export async function loadQtCommentCounts(supabase: any, contexts: QtCommentCountRequest[], signal?: AbortSignal) {
  const counts: Record<string, number> = {};
  const unique = Array.from(new Set(contexts.map(context => context.qtId).filter(Boolean)));
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    const requestedIds = new Set(batch);
    const request = supabase.rpc("get_qt_shared_comment_counts", {
      p_qt_ids: batch,
    });
    const { data, error } = await (signal ? request.abortSignal(signal) : request);
    if (error) throw error;
    batch.forEach(qtId => { counts[qtCommentContextKey(qtId)] = 0; });
    (data ?? []).forEach((row: any) => {
      const qtId = String(row.qt_id);
      const count = Number(row.comment_count);
      if (!requestedIds.has(qtId) || !Number.isFinite(count) || count < 0) return;
      counts[qtCommentContextKey(qtId)] = count;
    });
  }
  return counts;
}

export async function loadQtComments(
  supabase: any,
  qtId: string,
  _context: QtCommentContext,
  options: { parentId?: string; before?: Pick<QtComment, "created_at" | "id">; signal?: AbortSignal } = {},
) {
  if (options.before) {
    const { created_at, id } = options.before;
    // Both cursor fields must retain the database's UUID/timestamp shape.
    if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(created_at)) {
      throw new Error("Invalid comment cursor");
    }
  }
  const query = supabase.rpc("get_qt_comment_page", {
    p_qt_id: qtId, p_parent_id: options.parentId ?? null,
    p_before_created_at: options.before?.created_at ?? null, p_before_id: options.before?.id ?? null,
  });
  const { data, error } = await (options.signal ? query.abortSignal(options.signal) : query);
  if (error) throw error;
  if (!data || !Array.isArray(data.comments)) throw new Error("Invalid comment page");
  const rows: QtComment[] = data.comments.map(normalizeComment);
  // Missing profile cards must not hide readable comments.
  let profiles: Record<string, ProfileCard> = {};
  try { profiles = mapProfileCards(await loadProfileCards(supabase, rows.map(row => row.author_id), { signal: options.signal })); }
  catch (error) { if (options.signal?.aborted) throw error; }
  return {
    rows: rows.map(row => ({ ...row, profile: profiles[row.author_id] })),
    totalCount: Number(data.comment_count ?? 0),
    hasMore: data.has_more === true,
    oldest: rows[0] ?? null,
  };
}

export async function insertQtComment(
  supabase: any, qtId: string, context: QtCommentContext, body: string,
  retryIdentity?: { id: string; authorId: string },
  parentId: string | null = null,
) {
  const trimmed = body.trim();
  const { data, error } = await supabase.from("qt_comments").insert({
    ...(retryIdentity ? { id: retryIdentity.id } : {}),
    qt_id: qtId, scope: context.scope, scope_id: context.scopeId, body: trimmed, parent_id: parentId,
  }).select(COMMENT_COLUMNS).single();
  if (error?.code === "23505" && retryIdentity) {
    // A timed-out request may have committed. Retrying the same draft reuses its UUID.
    // Only acknowledge a duplicate after RLS and every immutable field match.
    const existing = await supabase.from("qt_comments").select(COMMENT_COLUMNS)
      .eq("id", retryIdentity.id).eq("author_id", retryIdentity.authorId).maybeSingle();
    const row = existing.data as QtComment | null;
    if (!existing.error && row && row.id === retryIdentity.id && row.author_id === retryIdentity.authorId &&
      row.qt_id === qtId && row.scope === context.scope &&
      (row.scope_id ?? null) === context.scopeId && (row.parent_id ?? null) === parentId &&
      !row.deleted_at && row.body === trimmed) return normalizeComment(row);
  }
  if (error) throw error;
  return normalizeComment(data);
}

export async function updateQtComment(supabase: any, id: string, body: string) {
  const { data, error } = await supabase.from("qt_comments").update({ body: body.trim() })
    .eq("id", id).select(COMMENT_COLUMNS).single();
  if (error) throw error;
  // Statistics are not selected by the write, so the UI keeps its current ones.
  return data as Pick<QtComment, "id" | "body" | "updated_at" | "deleted_at">;
}

export async function deleteQtComment(supabase: any, id: string) {
  const { data, error } = await supabase.rpc("delete_qt_comment", { p_comment_id: id });
  if (error) throw error;
  if (data?.id !== id) throw new Error("Comment is no longer accessible");
  return data as { id: string; parent_id: string | null; tombstone: boolean; deleted_now: boolean; reply_count?: number; deleted_count?: number };
}

export async function setQtCommentLike(supabase: any, id: string, liked: boolean) {
  const { data, error } = await supabase.rpc("set_qt_comment_like", { p_comment_id: id, p_liked: liked });
  if (error) throw error;
  const row = data?.find((item: any) => item.comment_id === id);
  if (!row) throw new Error("Comment is no longer accessible");
  return { like_count: Number(row.like_count), my_liked: row.my_liked === true, reply_count: Number(row.reply_count) };
}
