import type { CommunityNotificationDirectTarget } from "@/lib/notifications/communityDeepLinks";

type SupabaseClientLike = any;

type DirectQtContent = {
  kind: "qt";
  record: any;
  reactionCounts: Record<string, Record<string, number>>;
  myReaction: Record<string, string>;
};

type DirectPrayerContent = {
  kind: "prayer";
  record: any;
  liked: boolean;
  prayed: boolean;
};

export type CommunityNotificationDirectContent =
  | DirectQtContent
  | DirectPrayerContent;

function visibilityIncludesGroup(
  visibility: string | null | undefined,
  groupId: string,
) {
  return String(visibility ?? "")
    .split(",")
    .map((part) => part.trim())
    .includes(`group_${groupId}`);
}

async function loadProfile(supabase: SupabaseClientLike, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id,name,avatar_url,streak_days")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

async function canOpenPartnerQt(
  supabase: SupabaseClientLike,
  userId: string,
  partnerId: string,
  qtRecordId: string,
) {
  const { data, error } = await supabase
    .from("qt_record_recipients")
    .select("qt_record_id")
    .eq("qt_record_id", qtRecordId)
    .eq("owner_id", partnerId)
    .eq("recipient_id", userId)
    .maybeSingle();
  return !error && !!data;
}

async function canOpenPartnerPrayer(
  supabase: SupabaseClientLike,
  userId: string,
  partnerId: string,
  prayerItemId: string,
) {
  const { data, error } = await supabase
    .from("prayer_item_recipients")
    .select("prayer_item_id")
    .eq("prayer_item_id", prayerItemId)
    .eq("owner_id", partnerId)
    .eq("recipient_id", userId)
    .maybeSingle();
  return !error && !!data;
}

export async function loadCommunityNotificationDirectContent(
  supabase: SupabaseClientLike,
  userId: string,
  target: CommunityNotificationDirectTarget,
): Promise<CommunityNotificationDirectContent | null> {
  if (target.contentKind === "qt") {
    if (
      target.scope === "partner" &&
      !(await canOpenPartnerQt(
        supabase,
        userId,
        target.scopeTargetId,
        target.contentId,
      ))
    ) {
      return null;
    }

    const { data: qtRow, error: qtError } = await supabase
      .from("qt_records")
      .select("*")
      .eq("id", target.contentId)
      .maybeSingle();
    if (qtError || !qtRow) return null;

    if (
      target.scope === "group" &&
      !visibilityIncludesGroup(qtRow.visibility, target.scopeTargetId)
    ) {
      return null;
    }

    const [profile, reactionResult] = await Promise.all([
      loadProfile(supabase, qtRow.user_id),
      supabase
        .from("qt_reactions")
        .select("qt_id,reaction,user_id")
        .eq("qt_id", target.contentId),
    ]);

    const reactionCounts: Record<string, Record<string, number>> = {};
    const myReaction: Record<string, string> = {};
    for (const reaction of reactionResult.data ?? []) {
      if (!reactionCounts[reaction.qt_id]) reactionCounts[reaction.qt_id] = {};
      reactionCounts[reaction.qt_id][reaction.reaction] =
        (reactionCounts[reaction.qt_id][reaction.reaction] ?? 0) + 1;
      if (reaction.user_id === userId) {
        myReaction[reaction.qt_id] = reaction.reaction;
      }
    }

    return {
      kind: "qt",
      record: { ...qtRow, profiles: profile },
      reactionCounts,
      myReaction,
    };
  }

  if (
    target.scope === "partner" &&
    !(await canOpenPartnerPrayer(
      supabase,
      userId,
      target.scopeTargetId,
      target.contentId,
    ))
  ) {
    return null;
  }

  const { data: prayerRow, error: prayerError } = await supabase
    .from("prayer_items")
    .select("*")
    .eq("id", target.contentId)
    .maybeSingle();
  if (prayerError || !prayerRow) return null;

  if (
    target.scope === "group" &&
    !visibilityIncludesGroup(prayerRow.visibility, target.scopeTargetId)
  ) {
    return null;
  }

  const [profile, likeResult, prayedResult] = await Promise.all([
    loadProfile(supabase, prayerRow.user_id),
    prayerRow.is_answered
      ? supabase
          .from("prayer_likes")
          .select("user_id")
          .eq("prayer_id", target.contentId)
      : Promise.resolve({ data: [] }),
    !prayerRow.is_answered
      ? supabase
          .from("user_prayer_logs")
          .select("id")
          .eq("user_id", userId)
          .eq("prayer_id", target.contentId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const likes = Array.isArray(likeResult.data) ? likeResult.data : null;
  return {
    kind: "prayer",
    record: {
      ...prayerRow,
      like_count:
        prayerRow.is_answered && likes
          ? likes.length
          : Number(prayerRow.like_count ?? 0),
      profiles: profile,
    },
    liked: !!likes?.some((row: any) => row.user_id === userId),
    prayed: !!prayedResult.data,
  };
}
