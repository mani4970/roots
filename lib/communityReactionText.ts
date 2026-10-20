import type { Lang } from "@/lib/i18n";

export type CommunityReactionId = "cheer" | "bless" | "pray";
type CommunityReactionLang = Lang | "es";

// Keep the legacy "pray" ID readable while offering only the current QT reactions.
export const COMMUNITY_REACTIONS = [
  "cheer",
  "bless",
] as const satisfies readonly CommunityReactionId[];

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
