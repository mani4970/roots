import { getYouVersionBibleSource } from "@/lib/youVersionBible";

export type BibleCopyrightInfo = {
  notice: string;
  url?: string;
  linkLabel?: string;
};

const LICENSED_COPYRIGHT_BY_TRANSLATION_ID: Readonly<Record<number, BibleCopyrightInfo>> = {
  92: { notice: "성경전서 개역개정판 © 대한성서공회 1998." },
  84: { notice: "성경전서 개역한글판 © 대한성서공회 1961." },
  98: { notice: "성경전서 새번역 © 대한성서공회 2001." },
  89: { notice: "우리말성경 5판 © 두란노서원." },
};

export function getBibleCopyrightInfo(translationId: number): BibleCopyrightInfo | null {
  const licensedNotice = LICENSED_COPYRIGHT_BY_TRANSLATION_ID[translationId];
  if (licensedNotice) return licensedNotice;

  const youVersionSource = getYouVersionBibleSource(translationId);
  if (!youVersionSource) return null;

  return {
    notice: youVersionSource.copyrightNotice,
    url: youVersionSource.attributionUrl,
    linkLabel: youVersionSource.attributionLabel,
  };
}

export function getBibleCopyrightNotice(translationId: number) {
  return getBibleCopyrightInfo(translationId)?.notice ?? null;
}
