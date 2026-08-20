import type { Lang } from "@/lib/i18n";

export type CommunityReactionId = "cheer" | "bless" | "pray";
type CommunityReactionLang = Lang | "es";

export const COMMUNITY_REACTIONS: readonly CommunityReactionId[] = [
  "cheer",
  "bless",
  "pray",
] as const;

const LABELS: Record<CommunityReactionId, Record<CommunityReactionLang, string>> = {
  cheer: {
    ko: "아멘!",
    en: "Amen!",
    de: "Amen!",
    fr: "Amen !",
    es: "¡Amén!",
  },
  bless: {
    ko: "축복해요!",
    en: "Blessings!",
    de: "Segen!",
    fr: "Bénédictions !",
    es: "¡Bendiciones!",
  },
  pray: {
    ko: "기도해요",
    en: "Praying",
    de: "Ich bete",
    fr: "Je prie",
    es: "Estoy orando",
  },
};

export function getCommunityReactionLabel(
  reactionId: CommunityReactionId,
  lang: CommunityReactionLang,
) {
  return LABELS[reactionId][lang] ?? LABELS[reactionId].ko;
}
