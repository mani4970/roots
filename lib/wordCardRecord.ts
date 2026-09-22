import type { Lang } from "@/lib/i18n";
import { BOOK_NAMES, translateBibleRef, translateBookName } from "@/lib/bibleBooks";
import { getShiftedLocalDateString, parseLocalDateString } from "@/lib/date";

export type RecallRecord = {
  id: string; user_id: string; date: string; is_draft: boolean | null;
  key_verse: string | null; decision: string | null; bible_ref: string | null;
  bible_version: string | number | null; qt_mode?: string | null;
  reflection_type?: string | null; photo_path?: string | null;
};
export type HeldWordBlock = { text: string; reference?: string };
export type VerseCandidate = { chapter: number; start: number; end: number; line: number; prefix: string };
type Passage = { book: string; startChapter: number; endChapter: number; start: number; end: number };
export type VerifiedVerse = { chapter: number; num: number | string; text: string };

/** Calendar arithmetic, not 168 hours: DST and year boundaries must stay correct. */
export function getRecallDate(today: string): string {
  return getShiftedLocalDateString(-7, parseLocalDateString(today));
}

export type RecallMode = "6step" | "sunday" | "free" | "photo" | "unknown";

/** Follow stored format, never the weekday. Older text rows without a mode are
 * the legacy 6-step form. Photo detection mirrors the existing record page. */
export function getRecallMode(record: RecallRecord): RecallMode {
  if (record.reflection_type === "photo" || record.qt_mode === "photo" || record.photo_path?.trim()) return "photo";
  if (record.qt_mode === "sunday" || record.qt_mode === "free") return record.qt_mode;
  if (!record.qt_mode || record.qt_mode === "6step") return "6step";
  return "unknown";
}

export function canShowRecallWord(record: RecallRecord | null): boolean {
  return Boolean(record && record.is_draft !== true && getRecallMode(record) === "6step" && record.key_verse?.trim());
}

export function isDisplayableRecall(record: RecallRecord | null): record is RecallRecord {
  if (!record || record.is_draft === true) return false;
  const mode = getRecallMode(record);
  // A missing/unavailable photo is a PHOTO error, not a missing reflection.
  if (mode === "photo") return true;
  if (mode === "unknown") return false;
  return Boolean((mode === "6step" && record.key_verse?.trim()) || record.decision?.trim());
}

/** The writer stores commitments joined with \n. Soft wrapping is NOT an item boundary.
 * Remove an existing list prefix for display only; decimal numbers and years
 * (e.g. 3.14 / 2026.) remain original text. Never write this back to a record. */
export function getRecallDecisionItems(decision: string | null | undefined): string[] {
  return (decision ?? "").replace(/\r\n?/g, "\n").split("\n")
    .map(line => line.trim()).filter(Boolean)
    .map(line => line.replace(/^\d{1,3}[.)](?:\s+|(?=[^\d\s]))/u, "").trim() || line);
}

export function parseRecallPassage(reference: string | null): Passage | null {
  if (!reference) return null;
  const normalized = translateBibleRef(reference.trim(), "ko");
  const match = normalized.match(/^(.+?)\s+(\d+):(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?$/u);
  if (!match || !BOOK_NAMES.KO.includes(match[1])) return null;
  const startChapter = Number(match[2]);
  const endChapter = Number(match[4] ?? match[2]);
  const start = Number(match[3]);
  const end = Number(match[5] ?? match[3]);
  if (startChapter < 1 || endChapter < startChapter || endChapter > 150 || start < 1 || end < 1 || start > 176 || end > 176) return null;
  if (endChapter === startChapter && end < start) return null;
  return { book: match[1], startChapter, endChapter, start, end };
}

/** Numbers are only candidates. Do not label a numbered personal note as Scripture. */
export function getVerseCandidates(record: RecallRecord): VerseCandidate[] {
  const passage = parseRecallPassage(record.bible_ref);
  if (!passage || !record.key_verse) return [];
  const candidates: VerseCandidate[] = [];
  for (const [line, text] of record.key_verse.split("\n").entries()) {
    const match = text.match(/^((?:(\d+):)?(\d+)(?:[-–](\d+))?)\s+\S/u);
    if (!match) continue;
    // A bare verse number is ambiguous when the original passage crosses chapters.
    if (!match[2] && passage.startChapter !== passage.endChapter) continue;
    const chapter = Number(match[2] ?? passage.startChapter);
    const start = Number(match[3]);
    const end = Number(match[4] ?? match[3]);
    if (chapter < passage.startChapter || chapter > passage.endChapter || start < 1 || end < start || end > 176) continue;
    if ((chapter === passage.startChapter && start < passage.start) || (chapter === passage.endChapter && end > passage.end)) continue;
    candidates.push({ chapter, start, end, line, prefix: match[1] });
  }
  return candidates;
}

function comparable(text: string) { return text.replace(/\s+/gu, " ").trim(); }

/**
 * Promote only an exact match against the ORIGINAL translation to a referenced
 * verse. Render the saved text, not newly fetched wording. Unmatched/edited text
 * (including numbered notes) remains untouched. No source is invented.
 */
export function buildHeldWordBlocks(record: RecallRecord, verses: VerifiedVerse[], lang: Lang): HeldWordBlock[] {
  const raw = record.key_verse ?? "";
  if (!raw.trim()) return [];
  const passage = parseRecallPassage(record.bible_ref);
  if (!passage) return [{ text: raw }];
  const lines = raw.split("\n");
  const candidates = getVerseCandidates(record);
  const byLine = new Map(candidates.map(candidate => [candidate.line, candidate]));
  const blocks: HeldWordBlock[] = [];
  let plain: string[] = [];
  const flush = () => { if (plain.length) { blocks.push({ text: plain.join("\n") }); plain = []; } };
  for (let i = 0; i < lines.length; i++) {
    const candidate = byLine.get(i);
    if (!candidate) { plain.push(lines[i]); continue; }
    const matches = verses.filter(verse => {
      const id = String(verse.num).match(/^(\d+)(?:[-–](\d+))?$/);
      return id && verse.chapter === candidate.chapter
        && Number(id[1]) === candidate.start && Number(id[2] ?? id[1]) === candidate.end;
    });
    let matched: { verse: VerifiedVerse; text: string; lastLine: number } | null = null;
    for (const verse of matches) {
      let text = lines[i].slice(candidate.prefix.length).replace(/^\s+/, "");
      let j = i;
      const target = comparable(verse.text);
      while (j < lines.length) {
        if (comparable(text) === target) { matched = { verse, text, lastLine: j }; break; }
        if (comparable(text).length >= target.length || j + 1 >= lines.length || byLine.has(j + 1)) break;
        text += `\n${lines[++j]}`;
      }
      if (matched) break;
    }
    if (!matched) { plain.push(lines[i]); continue; }
    flush();
    blocks.push({ text: matched.text, reference: `${translateBookName(passage.book, lang)} ${candidate.chapter}:${matched.verse.num}` });
    i = matched.lastLine;
  }
  flush();
  return blocks;
}
