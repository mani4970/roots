import { t, type Lang, type TKey } from "@/lib/i18n";

/** Activity awards only; QT-day/fruit awards keep their existing receipt ledger. */
export const ACTIVITY_BADGE_META = {
  badge_noah: { img: "/badge_noah.webp", titleKey: "prayer_badge_noah_popup", msgKey: "badge_noah_msg" },
  badge_joseph: { img: "/badge_joseph.webp", titleKey: "badge_popup_joseph", msgKey: "badge_joseph_msg" },
  badge_prayer_ember: { img: "/badge_rootswoman_fire.webp", titleKey: "prayer_badge_ember_popup", msgKey: "badge_prayer_ember_msg" },
  badge_prayer_warrior: { img: "/prayer_warrior.webp", titleKey: "prayer_badge_warrior_popup", msgKey: "badge_prayer_warrior_msg" },
  badge_paul: { img: "/badge_paul.webp", titleKey: "community_badge_paul_title", msgKey: "badge_paul_msg" },
  badge_peter: { img: "/badge_peter.webp", titleKey: "community_badge_peter_title", msgKey: "badge_peter_msg" },
  badge_roots_together: { img: "/badge_roots_together.webp", titleKey: "community_badge_roots_together_title", msgKey: "badge_roots_together_msg" },
  badge_qt_bird: { img: "/qt_bird.webp", titleKey: "badge_popup_qt_bird", msgKey: "badge_qt_bird_msg" },
  badge_word_peace: { img: "/badge_rootswoman_rest.webp", titleKey: "qt_record_badge_word_peace_title", msgKey: "badge_word_peace_msg" },
  badge_jesus_love: { img: "/Jesus_watering_plant.webp", titleKey: "badge_popup_jesus_love", msgKey: "badge_jesus_love_msg" },
  badge_jesus_and_me: { img: "/Jesus_with_rootsman.webp", titleKey: "badge_popup_jesus_and_me", msgKey: "badge_jesus_and_me_msg" },
  badge_receive_my_love: { img: "/rootsman_finger_heart.webp", titleKey: "badge_popup_receive_my_love", msgKey: "badge_receive_my_love_msg" },
  badge_prayer_cheer: { img: "/rootsman_rock.webp", titleKey: "badge_popup_prayer_cheer", msgKey: "badge_prayer_cheer_msg" },
  badge_word_fruit: { img: "/rootsman_with_plant.webp", titleKey: "badge_popup_word_fruit", msgKey: "badge_word_fruit_msg" },
} as const satisfies Record<string, { img: string; titleKey: TKey; msgKey: TKey }>;

export type ActivityBadgeKey = keyof typeof ACTIVITY_BADGE_META;
export type ActivityBadgePopup = { img: string; title: string; msg: string };
export const ACTIVITY_BADGE_KEYS = Object.keys(ACTIVITY_BADGE_META) as ActivityBadgeKey[];

export function isActivityBadgeKey(value: unknown): value is ActivityBadgeKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ACTIVITY_BADGE_META, value);
}

export function getActivityBadgeKeyFromImage(img: string | null | undefined): ActivityBadgeKey | null {
  if (typeof img !== "string") return null;
  return ACTIVITY_BADGE_KEYS.find(key => ACTIVITY_BADGE_META[key].img === img) ?? null;
}

export function getActivityBadgePopup(key: ActivityBadgeKey, lang: Lang): ActivityBadgePopup {
  const meta = ACTIVITY_BADGE_META[key];
  return { img: meta.img, title: t(meta.titleKey, lang), msg: t(meta.msgKey, lang) };
}
