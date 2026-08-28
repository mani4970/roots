import { getYouVersionBibleSource } from "@/lib/youVersionBible";
import {
  ESV_ATTRIBUTION_LABEL,
  ESV_ATTRIBUTION_URL,
  ESV_SHORT_COPYRIGHT_NOTICE,
  ESV_TRANSLATION_ID,
} from "@/lib/esvBible";

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
  88: {
    notice: "『아가페 쉬운성경』의 저작권은 ㈜아가페출판사에 있으며, ㈜아가페출판사의 허락을 받아 사용하였습니다.",
  },
  [ESV_TRANSLATION_ID]: {
    notice: ESV_SHORT_COPYRIGHT_NOTICE,
    url: ESV_ATTRIBUTION_URL,
    linkLabel: ESV_ATTRIBUTION_LABEL,
  },
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
