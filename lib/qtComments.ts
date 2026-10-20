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
  profile?: ProfileCard;
};

export const QT_COMMENT_MAX_LENGTH = 2000;
export const QT_COMMENT_PAGE_SIZE = 30;
const COMMENT_COLUMNS = "id,qt_id,scope,scope_id,author_id,body,created_at,updated_at";

/** One thread/count identity per QT; context remains insertion provenance only. */
export function qtCommentContextKey(qtId: string, _context?: QtCommentContext) {
  return qtId;
}

function commentQuery(supabase: any, qtId: string, count = false) {
  return supabase.from("qt_comments")
    .select(COMMENT_COLUMNS, count ? { count: "exact" } : undefined)
    .eq("qt_id", qtId);
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
  options: { before?: Pick<QtComment, "created_at" | "id">; signal?: AbortSignal } = {},
) {
  let query = commentQuery(supabase, qtId, true)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(QT_COMMENT_PAGE_SIZE);
  if (options.before) {
    const { created_at, id } = options.before;
    // Both fields originate from the database. Validate before using PostgREST's cursor expression.
    if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(created_at)) {
      throw new Error("Invalid comment cursor");
    }
    query = query.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
  }
  const { data, error, count } = await (options.signal ? query.abortSignal(options.signal) : query);
  if (error) throw error;
  const rows = (data ?? []) as QtComment[];
  // Missing profile cards must not hide readable comments.
  let profiles: Record<string, ProfileCard> = {};
  try { profiles = mapProfileCards(await loadProfileCards(supabase, rows.map(row => row.author_id), { signal: options.signal })); }
  catch (error) { if (options.signal?.aborted) throw error; }
  return {
    rows: rows.map(row => ({ ...row, profile: profiles[row.author_id] })).reverse(),
    remainingCount: Number(count ?? 0),
    oldest: rows.length ? rows[rows.length - 1] : null,
  };
}

export async function insertQtComment(
  supabase: any, qtId: string, context: QtCommentContext, body: string,
  retryIdentity?: { id: string; authorId: string },
) {
  const trimmed = body.trim();
  const { data, error } = await supabase.from("qt_comments").insert({
    ...(retryIdentity ? { id: retryIdentity.id } : {}),
    qt_id: qtId, scope: context.scope, scope_id: context.scopeId, body: trimmed,
  }).select(COMMENT_COLUMNS).single();
  if (error?.code === "23505" && retryIdentity) {
    // A timed-out request may have committed. Retrying the same draft reuses its UUID.
    // Only acknowledge a duplicate after RLS and every immutable field match.
    const existing = await supabase.from("qt_comments").select(COMMENT_COLUMNS)
      .eq("id", retryIdentity.id).eq("author_id", retryIdentity.authorId).maybeSingle();
    const row = existing.data as QtComment | null;
    if (!existing.error && row && row.id === retryIdentity.id && row.author_id === retryIdentity.authorId &&
      row.qt_id === qtId && row.scope === context.scope &&
      (row.scope_id ?? null) === context.scopeId && row.body === trimmed) return row;
  }
  if (error) throw error;
  return data as QtComment;
}

export async function updateQtComment(supabase: any, id: string, body: string) {
  const { data, error } = await supabase.from("qt_comments").update({ body: body.trim() })
    .eq("id", id).select(COMMENT_COLUMNS).single();
  if (error) throw error;
  return data as QtComment;
}

export async function deleteQtComment(supabase: any, id: string) {
  const { data, error } = await supabase.from("qt_comments").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Comment is no longer accessible");
}
