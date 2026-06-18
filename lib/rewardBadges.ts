import { t, type Lang, type TKey } from "@/lib/i18n";

type SupabaseLike = any;
type RewardBadgeState = Partial<Record<NewRewardBadgeKey, boolean>>;

export type NewRewardBadgeKey =
  | "badge_jesus_love"
  | "badge_jesus_and_me"
  | "badge_receive_my_love"
  | "badge_prayer_cheer"
  | "badge_word_fruit";

export const NEW_REWARD_BADGES = [
  { key: "badge_jesus_love", img: "/Jesus_watering_plant.png", titleKey: "badge_jesus_love_title", descKey: "badge_jesus_love_desc" },
  { key: "badge_jesus_and_me", img: "/Jesus_with_rootsman.png", titleKey: "badge_jesus_and_me_title", descKey: "badge_jesus_and_me_desc" },
  { key: "badge_receive_my_love", img: "/rootsman_finger_heart.png", titleKey: "badge_receive_my_love_title", descKey: "badge_receive_my_love_desc" },
  { key: "badge_prayer_cheer", img: "/rootsman_rock.png", titleKey: "badge_prayer_cheer_title", descKey: "badge_prayer_cheer_desc" },
  { key: "badge_word_fruit", img: "/rootsman_with_plant.png", titleKey: "badge_word_fruit_title", descKey: "badge_word_fruit_desc" },
] as const satisfies readonly { key: NewRewardBadgeKey; img: string; titleKey: TKey; descKey: TKey }[];

const NEW_REWARD_BADGE_META = {
  badge_jesus_love: {
    img: "/Jesus_watering_plant.png",
    popupTitleKey: "badge_popup_jesus_love" as TKey,
    msgKey: "badge_jesus_love_msg" as TKey,
  },
  badge_jesus_and_me: {
    img: "/Jesus_with_rootsman.png",
    popupTitleKey: "badge_popup_jesus_and_me" as TKey,
    msgKey: "badge_jesus_and_me_msg" as TKey,
  },
  badge_receive_my_love: {
    img: "/rootsman_finger_heart.png",
    popupTitleKey: "badge_popup_receive_my_love" as TKey,
    msgKey: "badge_receive_my_love_msg" as TKey,
  },
  badge_prayer_cheer: {
    img: "/rootsman_rock.png",
    popupTitleKey: "badge_popup_prayer_cheer" as TKey,
    msgKey: "badge_prayer_cheer_msg" as TKey,
  },
  badge_word_fruit: {
    img: "/rootsman_with_plant.png",
    popupTitleKey: "badge_popup_word_fruit" as TKey,
    msgKey: "badge_word_fruit_msg" as TKey,
  },
} as const satisfies Record<NewRewardBadgeKey, { img: string; popupTitleKey: TKey; msgKey: TKey }>;

const NEW_REWARD_BADGE_COLUMNS = NEW_REWARD_BADGES.map(badge => badge.key) as NewRewardBadgeKey[];
const NEW_REWARD_BADGE_SELECT = NEW_REWARD_BADGE_COLUMNS.join(",");

const BADGE_THRESHOLDS = {
  qtReactions: 50,
  answeredPrayers: 30,
  companions: 10,
  prayerLogs: 60,
  dailyWords: 50,
} as const;

export function getRewardBadgePopup(key: NewRewardBadgeKey, lang: Lang) {
  const meta = NEW_REWARD_BADGE_META[key];
  return {
    img: meta.img,
    title: t(meta.popupTitleKey, lang),
    msg: t(meta.msgKey, lang),
  };
}

async function readRewardBadgeState(supabase: SupabaseLike, userId: string): Promise<RewardBadgeState | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(NEW_REWARD_BADGE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // The app should remain usable if production deploy briefly happens before this migration is applied.
    console.warn("새 보상 배지 컬럼을 읽지 못했어요:", error.message);
    return null;
  }

  return (data ?? null) as RewardBadgeState | null;
}

async function awardBadgeIfNeeded(
  supabase: SupabaseLike,
  userId: string,
  key: NewRewardBadgeKey,
  eligible: boolean,
  currentState?: RewardBadgeState | null
): Promise<NewRewardBadgeKey | null> {
  if (!eligible) return null;
  const state = currentState ?? await readRewardBadgeState(supabase, userId);
  if (!state || state[key]) return null;

  const { error } = await supabase
    .from("profiles")
    .update({ [key]: true })
    .eq("id", userId);

  if (error) {
    console.warn("새 보상 배지를 저장하지 못했어요:", key, error.message);
    return null;
  }

  return key;
}

async function getRowsCount(supabase: SupabaseLike, table: string, userId: string) {
  const { data, error } = await supabase.from(table).select("id").eq("user_id", userId);
  if (error) throw error;
  return data?.length ?? 0;
}

export async function checkAndAwardQtReactionBadge(supabase: SupabaseLike, userId: string) {
  const state = await readRewardBadgeState(supabase, userId);
  if (!state || state.badge_jesus_love) return null;
  const count = await getRowsCount(supabase, "qt_reactions", userId);
  return awardBadgeIfNeeded(supabase, userId, "badge_jesus_love", count >= BADGE_THRESHOLDS.qtReactions, state);
}

export async function checkAndAwardAnsweredPrayerBadge(supabase: SupabaseLike, userId: string) {
  const state = await readRewardBadgeState(supabase, userId);
  if (!state || state.badge_jesus_and_me) return null;

  const { data, error } = await supabase
    .from("prayer_items")
    .select("id,testimony")
    .eq("user_id", userId)
    .eq("is_answered", true);
  if (error) throw error;

  const count = (data ?? []).filter((row: any) => String(row.testimony ?? "").trim().length > 0).length;
  return awardBadgeIfNeeded(supabase, userId, "badge_jesus_and_me", count >= BADGE_THRESHOLDS.answeredPrayers, state);
}

export async function checkAndAwardCompanionBadge(supabase: SupabaseLike, userId: string) {
  const state = await readRewardBadgeState(supabase, userId);
  if (!state || state.badge_receive_my_love) return null;

  const { data, error } = await supabase
    .from("companions")
    .select("id,requester_id,receiver_id,status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
  if (error) throw error;

  const count = new Set((data ?? []).map((row: any) => row.requester_id === userId ? row.receiver_id : row.requester_id).filter(Boolean)).size;
  return awardBadgeIfNeeded(supabase, userId, "badge_receive_my_love", count >= BADGE_THRESHOLDS.companions, state);
}

export async function checkAndAwardPrayTogetherBadge(supabase: SupabaseLike, userId: string) {
  const state = await readRewardBadgeState(supabase, userId);
  if (!state || state.badge_prayer_cheer) return null;
  const count = await getRowsCount(supabase, "user_prayer_logs", userId);
  return awardBadgeIfNeeded(supabase, userId, "badge_prayer_cheer", count >= BADGE_THRESHOLDS.prayerLogs, state);
}

export async function checkAndAwardDailyWordBadge(supabase: SupabaseLike, userId: string) {
  const state = await readRewardBadgeState(supabase, userId);
  if (!state || state.badge_word_fruit) return null;

  const { data, error } = await supabase
    .from("daily_checkins")
    .select("date,verse,verse_text")
    .eq("user_id", userId);
  if (error) throw error;

  const uniqueVerseDates = new Set(
    (data ?? [])
      .filter((row: any) => String(row.verse_text ?? row.verse ?? "").trim().length > 0)
      .map((row: any) => row.date)
      .filter(Boolean)
  );
  return awardBadgeIfNeeded(supabase, userId, "badge_word_fruit", uniqueVerseDates.size >= BADGE_THRESHOLDS.dailyWords, state);
}

export async function repairNewRewardBadges(supabase: SupabaseLike, userId: string) {
  const awarded = await Promise.all([
    checkAndAwardQtReactionBadge(supabase, userId),
    checkAndAwardAnsweredPrayerBadge(supabase, userId),
    checkAndAwardCompanionBadge(supabase, userId),
    checkAndAwardPrayTogetherBadge(supabase, userId),
    checkAndAwardDailyWordBadge(supabase, userId),
  ]);

  return awarded.filter(Boolean).reduce<Record<string, boolean>>((acc, key) => {
    if (key) acc[key] = true;
    return acc;
  }, {});
}
