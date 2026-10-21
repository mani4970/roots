import { t, type Lang } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { parseSundaySermonRef } from "@/lib/sundaySermonRef";
import { getDateLocale, parseLocalDateString } from "@/lib/date";
import { ESV_TRANSLATION_ID } from "@/lib/esvBible";

/** A snapshot of the saved record. Sharing must never save or advance progress. */
export type QtShareRecord = {
  id?: string;
  date: string;
  bible_ref?: string | null;
  bible_version?: string | number | null;
  qt_mode?: string | null;
  reflection_type?: string | null;
  opening_prayer?: string | null;
  summary?: string | null;
  key_verse?: string | null;
  meditation?: string | null;
  application?: string | null;
  decision?: string | null;
  closing_prayer?: string | null;
  photo_caption?: string | null;
  photo_path?: string | null;
};

export function isQtPhotoRecord(record: QtShareRecord): boolean {
  return record.reflection_type === "photo" || record.qt_mode === "photo" || !!record.photo_path;
}

function shareHeader(record: QtShareRecord, lang: Lang): string {
  const isSunday = record.qt_mode === "sunday";
  const dateObj = parseLocalDateString(record.date);
  const dateStrBase = dateObj.toLocaleDateString(getDateLocale(lang), { year: "numeric", month: "long", day: "numeric" });
  const dateStr = isSunday && lang === "ko"
    ? `${dateStrBase} 주일`
    : isSunday
      ? dateStrBase
      : dateObj.toLocaleDateString(getDateLocale(lang), { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  if (isSunday) {
    const parsed = parseSundaySermonRef(record.bible_ref ?? "");
    const translatedRefs = parsed.referenceText ? translateBibleRef(parsed.referenceText, lang) : "";
    return [
      `📖 ${dateStr}`,
      parsed.title ? `${t("qt_record_sermon_title_label", lang)}: ${parsed.title}` : "",
      translatedRefs ? `${t("qt_record_passage_label", lang)}: ${translatedRefs}` : "",
    ].filter(Boolean).join("\n");
  }
  return `📖 ${dateStr} · ${translateBibleRef(record.bible_ref ?? "", lang)}`;
}

/** Keep this byte-for-byte equivalent to the existing QT record's 전체 복사. */
export function formatQtShareText(record: QtShareRecord, lang: Lang): string {
  const decisions = record.decision
    ? record.decision.split("\n").filter((d) => d.trim()).map((d, i) => `${i + 1}. ${d}`).join("\n")
    : "";
  const headerLine = shareHeader(record, lang);
  const opening = record.opening_prayer ? `\n${t("qt_record_section_opening_prayer", lang)}\n${record.opening_prayer}` : "";
  const meditation = record.meditation ? `\n${t("qt_record_section_meditation", lang)}\n${record.meditation}` : "";
  const application = (record.application || decisions)
    ? `\n${t("qt_record_section_application_decision", lang)}\n${record.application ?? ""}${decisions ? "\n" + decisions : ""}` : "";
  const closing = record.closing_prayer ? `\n${t("qt_record_section_closing_prayer", lang)}\n${record.closing_prayer}` : "";
  const parts = record.qt_mode === "sunday" ? [
    headerLine, opening, meditation, application, closing,
    record.summary ? `\n${t("qt_record_section_sermon_summary", lang)}\n${record.summary}` : "",
  ] : [
    headerLine, opening,
    record.summary ? `\n${t("qt_record_section_summary", lang)}\n${record.summary}` : "",
    record.key_verse ? `\n${t("qt_record_section_key_verse", lang)}\n${record.key_verse}${Number(record.bible_version) === ESV_TRANSLATION_ID ? "\n(ESV)" : ""}` : "",
    meditation, application, closing,
  ];
  return parts.filter(Boolean).join("\n");
}

/** Photo sharing adds the written memo to the actual attachment, never its URL. */
export function formatQtPhotoShareText(record: QtShareRecord, _lang: Lang): string {
  const memo = record.photo_caption || record.meditation;
  return memo?.trim() ? memo : "";
}
