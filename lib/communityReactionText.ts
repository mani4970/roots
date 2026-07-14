import type { Lang } from "@/lib/i18n";

export type CommunityReactionId = "cheer" | "bless" | "pray";

export const COMMUNITY_REACTIONS: readonly CommunityReactionId[] = [
  "cheer",
  "bless",
  "pray",
] as const;

const LABELS: Record<CommunityReactionId, Record<Lang, string>> = {
  cheer: {
    ko: "아멘!",
    en: "Amen!",
    de: "Amen!",
    fr: "Amen !",
  },
  bless: {
    ko: "축복해요!",
    en: "Blessings!",
    de: "Segen!",
    fr: "Bénédictions !",
  },
  pray: {
    ko: "기도해요",
    en: "Praying",
    de: "Ich bete",
    fr: "Je prie",
  },
};

export function getCommunityReactionLabel(
  reactionId: CommunityReactionId,
  lang: Lang,
) {
  return LABELS[reactionId][lang] ?? LABELS[reactionId].ko;
}
