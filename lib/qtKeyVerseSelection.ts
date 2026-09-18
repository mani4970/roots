export type KeyVerseSource = { num: number | string; text: string };

/** Numeric chapter/verse order, including bridge IDs such as 20:22-23. */
export function compareKeyVerseIds(a: string, b: string): number {
  const parts = (id: string) => {
    const match = id.match(/^(?:(\d+):)?(\d+)(?:[-–](\d+))?$/);
    return match ? [Number(match[1] ?? 0), Number(match[2]), Number(match[3] ?? match[2])] : null;
  };
  const left = parts(a);
  const right = parts(b);
  if (!left || !right) return a.localeCompare(b, undefined, { numeric: true });
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

/**
 * Only exact, selected source text belongs to the automatic block. Everything
 * else (including edited verses and numbered notes) remains user-authored text.
 * No trimming: leading/trailing spaces and blank lines in notes are retained.
 */
export function toggleKeyVerseText(
  current: string,
  selectedIds: readonly string[],
  clicked: KeyVerseSource,
  sources: readonly KeyVerseSource[],
): string {
  const clickedId = String(clicked.num).trim();
  if (!clickedId) return current;
  const selected = new Set(selectedIds);
  const lines = current.split("\n");
  const ownedIndexes = new Set<number>();
  const automatic = new Map<string, string>();
  const candidates = new Map<string, string[][]>();
  for (const source of [...sources, clicked]) {
    const id = String(source.num).trim();
    if (!selected.has(id)) continue;
    const versions = candidates.get(id) ?? [];
    versions.push(`${id} ${source.text}`.split("\n"));
    candidates.set(id, versions);
  }

  for (const id of selected) {
    const versions = candidates.get(id) ?? [];
    // Prefer the last matching occurrence: automatic verses are below notes.
    let foundStart = -1;
    let foundLines: string[] = [];
    for (const version of versions) {
      for (let start = lines.length - version.length; start >= 0; start--) {
        if (version.every((line, offset) => !ownedIndexes.has(start + offset) && lines[start + offset] === line)) {
          if (start > foundStart || (start === foundStart && version.length > foundLines.length)) {
            foundStart = start;
            foundLines = version;
          }
          break;
        }
      }
    }
    if (foundStart < 0) continue;
    foundLines.forEach((_, offset) => ownedIndexes.add(foundStart + offset));
    automatic.set(id, foundLines.join("\n"));
  }

  if (selected.has(clickedId)) automatic.delete(clickedId);
  else automatic.set(clickedId, `${clickedId} ${clicked.text}`);

  const manual = lines.filter((_, index) => !ownedIndexes.has(index)).join("\n");
  const ordered = [...automatic.entries()]
    .sort(([a], [b]) => compareKeyVerseIds(a, b))
    .map(([, text]) => text).join("\n");
  return manual && ordered ? `${manual}\n${ordered}` : manual || ordered;
}
