export type WordCardImageContent = { title: string; verse: string; reference: string };

/** Shared with offline tests. Whole words wrap naturally; long tokens use Unicode code points. */
export function wrapCardText(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  const output: string[] = [];
  for (const paragraph of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!paragraph) { output.push(""); continue; }
    const tokens = paragraph.match(/\S+\s*|\s+/gu) ?? [paragraph];
    let line = "";
    for (const token of tokens) {
      if (measure(line + token) <= maxWidth) { line += token; continue; }
      if (line.trim()) { output.push(line.trimEnd()); line = ""; }
      const cleaned = token.trimStart();
      if (measure(cleaned) <= maxWidth) { line = cleaned; continue; }
      for (const char of Array.from(cleaned)) {
        if (line && measure(line + char) > maxWidth) { output.push(line.trimEnd()); line = ""; }
        line += char;
      }
    }
    if (line.length) output.push(line.trimEnd());
  }
  return output;
}

function loadSignature(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => { image.src = ""; reject(new Error("Signature timeout")); }, 8_000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error("Signature load failed")); };
    image.src = "/word-card-signature.svg";
  });
}

/**
 * The same single inset frame as WordCards.module.css at its 430px card width.
 * CSS: shell radius 15px, 1px transparent shell border, inset 9px,
 * frame border 1.5px, frame radius 9px. Canvas strokes are centered on their
 * path, so use the middle of the CSS border (1 + 9 + 1.5 / 2).
 * Export uses an opaque paper background across the full PNG so social apps
 * cannot render the rounded outer corners as black transparency.
 */
export function drawWordCardFrame(context: CanvasRenderingContext2D, width: number, height: number): void {
  const scale = width / 430;
  const lineWidth = 1.5 * scale;
  const framePathInset = (1 + 9) * scale + lineWidth / 2;
  const framePathRadius = 9 * scale - lineWidth / 2;
  context.save();
  context.fillStyle = "#fffdf8";
  // Keep every exported pixel opaque. Instagram and other share targets may
  // display transparent PNG corners against a black surface.
  context.fillRect(0, 0, width, height);
  context.beginPath();
  context.roundRect(0, 0, width, height, 15 * scale);
  context.fill();
  context.strokeStyle = "#72836f";
  context.lineWidth = lineWidth;
  context.beginPath();
  context.roundRect(framePathInset, framePathInset, width - framePathInset * 2, height - framePathInset * 2, framePathRadius);
  context.stroke();
  context.restore();
}

/**
 * Draw the full content, independently of the visible scroll position. No DOM
 * screenshot, remote rendering service, persistent Bible cache or user upload.
 * Export is always light paper even when the app is in dark mode.
 */
export async function createWordCardImage(content: WordCardImageContent): Promise<Blob> {
  if (!content.verse.trim()) throw new Error("Empty verse");
  if (document.fonts?.ready) {
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2_000))]);
  }
  const signature = await loadSignature();
  const canvas = document.createElement("canvas");
  const maybeContext = canvas.getContext("2d");
  if (!maybeContext) throw new Error("Canvas unavailable");
  const context = maybeContext;
  const width = 1080, inset = 96, textWidth = width - inset * 2;
  const titleFont = "600 43px 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif";
  const verseFont = "50px Georgia, 'AppleMyungjo', 'Batang', serif";
  const smallFont = "32px 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif";
  const lines = (text: string, font: string) => { context.font = font; return wrapCardText(text, textWidth, value => context.measureText(value).width); };
  const titleLines = lines(content.title, titleFont);
  const verseLines = lines(content.verse, verseFont);
  const refLines = lines(content.reference, smallFont);
  const bodyHeight = titleLines.length * 63 + 92 + verseLines.length * 82 + 44 + refLines.length * 47;
  const height = Math.ceil(Math.max(1350, 245 + bodyHeight + 105));
  // Fail explicitly rather than truncating a very long text or exhausting mobile memory.
  if (height > 14000) throw new Error("Card exceeds safe image dimensions");
  canvas.width = width; canvas.height = height;
  drawWordCardFrame(context, width, height);
  context.drawImage(signature, inset, 74, 295, 79);
  context.textBaseline = "top";
  function draw(block: string[], font: string, top: number, lineHeight: number, color: string, align: CanvasTextAlign = "center") {
    context.font = font; context.fillStyle = color; context.textAlign = align;
    block.forEach((line, index) => context.fillText(line, align === "center" ? width / 2 : align === "right" ? width - inset : inset, top + index * lineHeight));
    return top + block.length * lineHeight;
  }
  let y = 236 + Math.max(0, (height - 245 - bodyHeight - 105) * .5);
  y = draw(titleLines, titleFont, y, 63, "#303a32") + 92;
  y = draw(verseLines, verseFont, y, 82, "#303a32", "center") + 44;
  draw(refLines, smallFont, y, 47, "#657267");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image encoding failed")), "image/png");
  });
  canvas.width = 1; canvas.height = 1;
  return blob;
}

export function downloadWordCard(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = file.name; anchor.rel = "noopener";
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  // Do not revoke before browsers have had time to start reading the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function supportsWordCardShare(file: File): boolean {
  try { return typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }); }
  catch { return false; }
}
