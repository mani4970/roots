/** The free format stores its body in meditation, just like six-step QT. */
export function getQtFeedPreview(row: Record<string, unknown>): {
  text: string;
  field: string | null;
} {
  for (const field of [
    "meditation",
    "summary",
    "application",
    "decision",
    "opening_prayer",
    "closing_prayer",
    "key_verse",
    "photo_caption",
  ]) {
    const value = row[field];
    if (typeof value !== "string") continue;
    const text = value.replace(/\s+/g, " ").trim();
    if (text) return { text, field };
  }
  return { text: "", field: null };
}
