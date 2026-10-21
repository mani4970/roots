import { Capacitor, registerPlugin } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { copyText } from "@/lib/nativeShare";
import { downloadWordCard, supportsWordCardShare } from "@/lib/wordCardImage";
import { hasNativeWordCardExport, wordCardExportErrorCode, wordCardImagePayload } from "@/lib/wordCardNativeExport";
import { formatQtPhotoShareText, formatQtShareText, isQtPhotoRecord, type QtShareRecord } from "@/lib/qtShareText";
import type { Lang } from "@/lib/i18n";

export { formatQtPhotoShareText, formatQtShareText, isQtPhotoRecord, type QtShareRecord } from "@/lib/qtShareText";

const NativePhotoExport = registerPlugin<{ prepareImage(options: { base64: string; filename: string }): Promise<{ uri: string }> }>("RootsWordCardExport");
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
export type QtShareResult = "shared" | "copied" | "photo-downloaded-and-copied" | "photo-downloaded" | "native-update-required" | "cancelled" | "failed";

/** Prepare before the tap so Safari retains its user activation at navigator.share. */
export async function prepareQtPhotoFile(photoUrl: string, date: string, lang: Lang, signal?: AbortSignal): Promise<File> {
  const response = await fetch(photoUrl, { signal });
  if (!response.ok) throw new Error("QT_PHOTO_UNAVAILABLE");
  const blob = await response.blob();
  if (!blob.size || blob.size > 32 * 1024 * 1024 || !blob.type.startsWith("image/")) throw new Error("QT_PHOTO_INVALID");
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("QT_PHOTO_INVALID"));
      image.src = objectUrl;
    });
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("QT_PHOTO_INVALID");
    // A bounded PNG works with the existing installed iOS/Android export plugin.
    // Keep the original proportions and all image content; no external uploads.
    let scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight), Math.sqrt(4_000_000 / (image.naturalWidth * image.naturalHeight)));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("QT_PHOTO_INVALID");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      canvas.width = 1; canvas.height = 1;
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (png?.size && png.size <= MAX_IMAGE_BYTES) {
        const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "2000-01-01";
        return new File([png], `Christian-Roots-${safeDate}-${lang}.png`, { type: "image/png" });
      }
      scale *= 0.7;
    }
    throw new Error("QT_PHOTO_TOO_LARGE");
  } finally {
    image.onload = null; image.onerror = null;
    URL.revokeObjectURL(objectUrl);
  }
}

/** No record writes, progress calls or navigation. Shared means OS handoff only. */
export async function shareQtRecord({ record, lang, photoFile }: { record: QtShareRecord; lang: Lang; photoFile?: File | null }): Promise<QtShareResult> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "failed";
  const isPhoto = isQtPhotoRecord(record);
  const text = isPhoto ? formatQtPhotoShareText(record, lang) : formatQtShareText(record, lang);
  // A separate title may be prepended by the receiving app. Send only the
  // existing copy text, or the photo and its written memo.
  const textPayload = text ? { text } : {};
  if (isPhoto && !photoFile) return "failed";
  try {
    if (Capacitor.isNativePlatform()) {
      if (isPhoto) {
        // Older binaries cannot attach a Blob URL. Never pretend memo-only was
        // photo sharing, or replace a private photo with its signed URL.
        if (!hasNativeWordCardExport()) return "native-update-required";
        const { uri } = await NativePhotoExport.prepareImage(await wordCardImagePayload(photoFile!));
        if (!uri.startsWith("file://")) return "failed";
        await Share.share({ files: [uri], ...textPayload });
      } else {
        await Share.share({ text });
      }
      return "shared";
    }
    if (isPhoto && supportsWordCardShare(photoFile!)) {
      // This call executes synchronously up to the first await: original tap.
      await navigator.share({ files: [photoFile!], ...textPayload });
      return "shared";
    }
    if (!isPhoto && typeof navigator.share === "function") {
      await navigator.share({ text });
      return "shared";
    }
  } catch (error) {
    if (wordCardExportErrorCode(error) === "CANCELLED") return "cancelled";
    // A failed native sheet cannot safely fall back to a WebView blob download.
    if (Capacitor.isNativePlatform()) return "failed";
  }
  if (isPhoto) {
    // Download requested, not a claim that a browser has written to disk.
    try { downloadWordCard(photoFile!); }
    catch { return "failed"; }
    if (!text) return "photo-downloaded";
    return await copyText(text) ? "photo-downloaded-and-copied" : "photo-downloaded";
  }
  return await copyText(text) ? "copied" : "failed";
}
