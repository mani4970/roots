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
