const KBS_COPYRIGHT_BY_TRANSLATION_ID: Readonly<Record<number, string>> = {
  92: "성경전서 개역개정판 © 대한성서공회 1998.",
  84: "성경전서 개역한글판 © 대한성서공회 1961.",
  98: "성경전서 새번역 © 대한성서공회 2001.",
};

export function getBibleCopyrightNotice(translationId: number) {
  return KBS_COPYRIGHT_BY_TRANSLATION_ID[translationId] ?? null;
}
