export type SundaySermonRefParts = {
  isSundaySermon: boolean;
  title: string;
  referenceText: string;
  refs: string[];
};

function splitReferenceText(referenceText: string): string[] {
  const text = referenceText.trim();
  if (!text) return [];
  return text
    .split(/\s*,\s*(?=[^,]+?\s+\d+\s*:\s*\d+)/)
    .map((ref) => ref.trim())
    .filter(Boolean);
}

/**
 * Parses the persisted Sunday sermon reference format:
 *   설교: <title> (<bible ref 1>, <bible ref 2>, ...)
 *
 * The title itself may contain parentheses. Only the final parenthesized
 * segment is treated as Scripture when it contains a chapter:verse pattern.
 */
export function parseSundaySermonRef(raw?: string | null): SundaySermonRefParts {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("설교:")) {
    return {
      isSundaySermon: false,
      title: "",
      referenceText: value,
      refs: splitReferenceText(value),
    };
  }

  const body = value.replace(/^설교:\s*/, "").trim();
  const trailingParenthesisStart = body.lastIndexOf(" (");
  const trailingParenthesisText =
    trailingParenthesisStart >= 0 && body.endsWith(")")
      ? body.slice(trailingParenthesisStart + 2, -1).trim()
      : "";
  const hasTrailingBibleRef = /\d+\s*:\s*\d+/.test(trailingParenthesisText);

  const title = hasTrailingBibleRef
    ? body.slice(0, trailingParenthesisStart).trim()
    : body;
  const referenceText = hasTrailingBibleRef ? trailingParenthesisText : "";

  return {
    isSundaySermon: true,
    title,
    referenceText,
    refs: splitReferenceText(referenceText),
  };
}
