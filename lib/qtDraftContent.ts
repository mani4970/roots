export type QTWriteDraftContent = {
  bibleRef: string;
  keyVerse: string;
  answers: Record<string, string>;
  decisions: string[];
  freeText: string;
  sermonTitle: string;
  passageRefs: string[];
};

export function hasMeaningfulQTWriteDraftContent(
  content: QTWriteDraftContent,
  options: { scheduledPassageWasPrefilled: boolean },
) {
  const hasUserInput = Boolean(
    content.keyVerse.trim() ||
    content.freeText.trim() ||
    content.sermonTitle.trim() ||
    Object.values(content.answers).some(value => value.trim()) ||
    content.decisions.some(value => value.trim()),
  );

  if (hasUserInput) return true;
  if (options.scheduledPassageWasPrefilled) return false;

  return Boolean(
    content.bibleRef.trim() ||
    content.passageRefs.some(ref => ref.trim()),
  );
}
