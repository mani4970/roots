import { t, type Lang, type TKey } from "@/lib/i18n";

type SupabaseLike = any;
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

export function getRewardBadgePopup(key: NewRewardBadgeKey, lang: Lang) {
  const meta = NEW_REWARD_BADGE_META[key];
  return {
    img: meta.img,
    title: t(meta.popupTitleKey, lang),
    msg: t(meta.msgKey, lang),
  };
}

async function awardBadgeIfNeeded(
  supabase: SupabaseLike,
  userId: string,
  key: NewRewardBadgeKey
): Promise<NewRewardBadgeKey | null> {
  const { data, error } = await supabase.rpc("award_own_reward_badge", {
    p_user_id: userId,
    p_badge_key: key,
  });

  if (error) {
    console.warn("새 보상 배지를 저장하지 못했어요:", key, error.message);
    return null;
  }

  return data?.awarded === true ? key : null;
}

export async function checkAndAwardQtReactionBadge(supabase: SupabaseLike, userId: string) {
  return awardBadgeIfNeeded(supabase, userId, "badge_jesus_love");
}

export async function checkAndAwardAnsweredPrayerBadge(supabase: SupabaseLike, userId: string) {
  return awardBadgeIfNeeded(supabase, userId, "badge_jesus_and_me");
}

export async function checkAndAwardCompanionBadge(supabase: SupabaseLike, userId: string) {
  return awardBadgeIfNeeded(supabase, userId, "badge_receive_my_love");
}

export async function checkAndAwardPrayTogetherBadge(supabase: SupabaseLike, userId: string) {
  return awardBadgeIfNeeded(supabase, userId, "badge_prayer_cheer");
}

export async function checkAndAwardDailyWordBadge(supabase: SupabaseLike, userId: string) {
  return awardBadgeIfNeeded(supabase, userId, "badge_word_fruit");
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
