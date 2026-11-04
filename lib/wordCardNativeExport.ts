import { Capacitor } from "@capacitor/core";

type ImagePayload = { base64: string; filename: string };
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

export function hasNativeWordCardExport(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("RootsWordCardExport");
}

export function wordCardExportErrorCode(error: unknown): string {
  const value = error as { code?: unknown; name?: unknown; message?: unknown } | null;
  const code = typeof value?.code === "string" ? value.code : "";
  const description = `${value?.name ?? ""} ${value?.message ?? ""}`.toLowerCase();
  if (code === "CANCELLED" || code === "CANCELED" || description.includes("aborterror")
    || /\b(cancelled|canceled)\b/.test(description)) return "CANCELLED";
  return code;
}
function exportError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

/** Binary PNG only; never treat a data:/blob: URL as a native file path. No user
 * identifiers, remote uploads, base64 logs or persistent browser caches. */
export async function wordCardImagePayload(file: File): Promise<ImagePayload> {
  if (file.type !== "image/png" || file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw exportError("INVALID_IMAGE");
  if (!/^Christian-Roots-\d{4}-\d{2}-\d{2}-(ko|en|de|fr|es)\.png$/.test(file.name)) throw exportError("INVALID_FILENAME");
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(exportError("IMAGE_READ_FAILED"));
    reader.onabort = () => reject(exportError("CANCELLED"));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const prefix = "data:image/png;base64,";
      if (!result.startsWith(prefix)) { reject(exportError("INVALID_IMAGE")); return; }
      resolve(result.slice(prefix.length));
    };
    reader.readAsDataURL(file);
  });
  return { base64, filename: file.name };
}
