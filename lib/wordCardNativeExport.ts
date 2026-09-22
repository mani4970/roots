import { Capacitor, registerPlugin } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { downloadWordCard, supportsWordCardShare } from "@/lib/wordCardImage";

export type WordCardSaveResult = "photos" | "files" | "download" | "cancelled";
type ImagePayload = { base64: string; filename: string };
interface RootsWordCardExportPlugin {
  prepareImage(options: ImagePayload): Promise<{ uri: string }>;
  saveImage(options: ImagePayload): Promise<{ destination: "photos" | "files" }>;
}
const NativeExport = registerPlugin<RootsWordCardExportPlugin>("RootsWordCardExport");
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
function requireNativeExport() {
  if (!hasNativeWordCardExport()) throw exportError("NATIVE_UPDATE_REQUIRED");
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

export async function saveWordCardImage(file: File): Promise<WordCardSaveResult> {
  if (!Capacitor.isNativePlatform()) {
    downloadWordCard(file);
    return "download"; // The browser accepted a download; not a verified disk write.
  }
  requireNativeExport();
  try {
    const result = await NativeExport.saveImage(await wordCardImagePayload(file));
    if (result.destination !== "photos" && result.destination !== "files") throw exportError("SAVE_FAILED");
    return result.destination;
  } catch (error) {
    if (wordCardExportErrorCode(error) === "CANCELLED") return "cancelled";
    throw error;
  }
}

export async function shareWordCardImage(file: File, title: string): Promise<"shared" | "cancelled"> {
  try {
    if (Capacitor.isNativePlatform()) {
      requireNativeExport();
      const { uri } = await NativeExport.prepareImage(await wordCardImagePayload(file));
      if (!uri.startsWith("file://")) throw exportError("INVALID_FILE_URI");
      // Reuse the app's existing native share plugin (including iPad popovers).
      // Keep its cached image after the sheet closes: Android recipients may read
      // it asynchronously. Native code purges ONLY our >24h-old temp directories.
      await Share.share({ files: [uri], title, dialogTitle: title });
    } else {
      if (!supportsWordCardShare(file)) throw exportError("SHARE_UNAVAILABLE");
      // No await before this invocation: Safari requires the original tap gesture.
      await navigator.share({ files: [file], title });
    }
    return "shared"; // Handed to the OS/target, not a claim of a completed post.
  } catch (error) {
    if (wordCardExportErrorCode(error) === "CANCELLED") return "cancelled";
    throw error;
  }
}
