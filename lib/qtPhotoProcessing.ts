export const QT_PHOTO_MAX_INPUT_SIZE = 15 * 1024 * 1024;
export const QT_PHOTO_MAX_STORED_SIZE = 2 * 1024 * 1024;

const PHOTO_DECODE_TIMEOUT_MS = 15_000;
const PHOTO_COMPRESSION_ATTEMPTS = [
  { maxSide: 1800, quality: 0.84 },
  { maxSide: 1600, quality: 0.8 },
  { maxSide: 1440, quality: 0.76 },
  { maxSide: 1280, quality: 0.72 },
] as const;

const DIRECT_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type QTPhotoPreparationErrorCode =
  | "unsupported"
  | "input_too_large"
  | "decode_failed"
  | "invalid_dimensions"
  | "blank_or_black"
  | "encode_failed"
  | "stored_too_large";

export class QTPhotoPreparationError extends Error {
  readonly code: QTPhotoPreparationErrorCode;

  constructor(code: QTPhotoPreparationErrorCode, message?: string) {
    super(message ?? code);
    this.name = "QTPhotoPreparationError";
    this.code = code;
  }
}

export type PreparedQTPhoto = {
  blob: Blob;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
  originalSize: number;
  wasTransformed: boolean;
  /** Detected MIME type of the source bytes (kept for diagnostics). */
  sourceMimeType: string;
  /** Backward-compatible alias used by older call sites. */
  detectedSourceType: string;
};

export type QTPhotoVerificationResult = {
  width: number;
  height: number;
  size: number;
};

type DecodedPhoto = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

type PhotoPixelStats = {
  meanLuminance: number;
  standardDeviation: number;
  darkRatio: number;
  brightRatio: number;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs = PHOTO_DECODE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new QTPhotoPreparationError("decode_failed")), timeoutMs);
    promise.then(
      value => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      error => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function normalizeMimeType(value: string | null | undefined, fileName = "") {
  const raw = String(value ?? "").trim().toLowerCase().split(";", 1)[0];
  if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
  if (raw === "image/x-png") return "image/png";
  if (raw.startsWith("image/")) return raw;

  const lowerName = fileName.toLowerCase();
  if (/\.(jpe?g|jfif)$/.test(lowerName)) return "image/jpeg";
  if (/\.png$/.test(lowerName)) return "image/png";
  if (/\.webp$/.test(lowerName)) return "image/webp";
  if (/\.hei[cf]$/.test(lowerName)) return "image/heic";
  if (/\.avif$/.test(lowerName)) return "image/avif";
  return "";
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  let value = "";
  for (let index = start; index < end && index < bytes.length; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}

async function sniffMimeType(blob: Blob): Promise<string> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  } catch {
    return "";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "image/webp";
  }

  if (bytes.length >= 16 && ascii(bytes, 4, 8) === "ftyp") {
    const brands = new Set<string>();
    for (let index = 8; index + 4 <= bytes.length; index += 4) {
      brands.add(ascii(bytes, index, index + 4).toLowerCase());
    }
    if (brands.has("avif") || brands.has("avis")) return "image/avif";
    const heifBrands = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];
    if (heifBrands.some(brand => brands.has(brand))) return "image/heic";
  }

  return "";
}

export async function detectQTPhotoMimeType(file: Blob, fileName = "") {
  const sniffed = await sniffMimeType(file);
  if (sniffed) return sniffed;
  return normalizeMimeType(file.type, fileName);
}

function getExtension(contentType: string): PreparedQTPhoto["extension"] {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

async function decodeWithImageBitmap(blob: Blob): Promise<DecodedPhoto | null> {
  if (typeof createImageBitmap !== "function") return null;

  try {
    const bitmap = await withTimeout(createImageBitmap(blob, {
      imageOrientation: "from-image",
      premultiplyAlpha: "default",
      colorSpaceConversion: "default",
    }));
    const width = bitmap.width;
    const height = bitmap.height;
    if (width <= 0 || height <= 0) {
      bitmap.close();
      throw new QTPhotoPreparationError("invalid_dimensions");
    }
    return {
      source: bitmap,
      width,
      height,
      cleanup: () => bitmap.close(),
    };
  } catch (error) {
    if (error instanceof QTPhotoPreparationError && error.code === "invalid_dimensions") throw error;
    return null;
  }
}

async function decodeWithImageElement(blob: Blob): Promise<DecodedPhoto> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;

    await withTimeout(new Promise<void>((resolve, reject) => {
      if (image.complete) {
        if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve();
        else reject(new QTPhotoPreparationError("decode_failed"));
        return;
      }
      image.onload = () => resolve();
      image.onerror = () => reject(new QTPhotoPreparationError("decode_failed"));
    }));

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width <= 0 || height <= 0) {
      throw new QTPhotoPreparationError("invalid_dimensions");
    }

    return {
      source: image,
      width,
      height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    if (error instanceof QTPhotoPreparationError) throw error;
    throw new QTPhotoPreparationError("decode_failed");
  }
}

async function decodePhoto(blob: Blob): Promise<DecodedPhoto> {
  const bitmap = await decodeWithImageBitmap(blob);
  if (bitmap) return bitmap;
  return decodeWithImageElement(blob);
}

function create2DContext(canvas: HTMLCanvasElement, willReadFrequently = false) {
  return canvas.getContext("2d", {
    alpha: false,
    willReadFrequently,
  });
}

function readPixelStats(decoded: DecodedPhoto): PhotoPixelStats {
  const sampleMax = 64;
  const scale = Math.min(1, sampleMax / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = create2DContext(canvas, true);
  if (!context) throw new QTPhotoPreparationError("decode_failed");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(decoded.source, 0, 0, width, height);

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, width, height).data;
  } catch {
    throw new QTPhotoPreparationError("decode_failed");
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }

  const count = Math.max(1, pixels.length / 4);
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  let darkCount = 0;
  let brightCount = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
    luminanceSum += luminance;
    luminanceSquaredSum += luminance * luminance;
    if (luminance <= 10) darkCount += 1;
    if (luminance >= 245) brightCount += 1;
  }

  const meanLuminance = luminanceSum / count;
  const variance = Math.max(0, luminanceSquaredSum / count - meanLuminance * meanLuminance);
  return {
    meanLuminance,
    standardDeviation: Math.sqrt(variance),
    darkRatio: darkCount / count,
    brightRatio: brightCount / count,
  };
}

function assertPhotoIsNotBlankOrBlack(stats: PhotoPixelStats) {
  const isNearlyBlack =
    stats.meanLuminance < 7 &&
    stats.standardDeviation < 6 &&
    stats.darkRatio > 0.995 &&
    stats.brightRatio < 0.002;
  const isNearlyBlankWhite =
    stats.meanLuminance > 249 &&
    stats.standardDeviation < 3 &&
    stats.brightRatio > 0.997 &&
    stats.darkRatio < 0.001;

  if (isNearlyBlack || isNearlyBlankWhite) {
    throw new QTPhotoPreparationError("blank_or_black");
  }
}

async function inspectPhotoBlob(blob: Blob, checkPixels: boolean): Promise<QTPhotoVerificationResult> {
  const decoded = await decodePhoto(blob);
  try {
    if (checkPixels) {
      const stats = readPixelStats(decoded);
      assertPhotoIsNotBlankOrBlack(stats);
    }
    return { width: decoded.width, height: decoded.height, size: blob.size };
  } finally {
    decoded.cleanup();
  }
}

export async function verifyQTPhotoBlob(
  blob: Blob,
  options: { checkPixels?: boolean; maxSize?: number } = {},
): Promise<QTPhotoVerificationResult> {
  if (blob.size <= 0) throw new QTPhotoPreparationError("decode_failed");
  const maxSize = options.maxSize ?? QT_PHOTO_MAX_STORED_SIZE;
  if (blob.size > maxSize) throw new QTPhotoPreparationError("stored_too_large");
  return inspectPhotoBlob(blob, options.checkPixels === true);
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new QTPhotoPreparationError("encode_failed")),
      "image/jpeg",
      quality,
    );
  });
}

async function compressPhoto(blob: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const decoded = await decodePhoto(blob);
  try {
    let lastBlob: Blob | null = null;

    for (const attempt of PHOTO_COMPRESSION_ATTEMPTS) {
      const scale = Math.min(1, attempt.maxSide / Math.max(decoded.width, decoded.height));
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = create2DContext(canvas);
      if (!context) throw new QTPhotoPreparationError("encode_failed");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, width, height);

      const encoded = await canvasToJpeg(canvas, attempt.quality);
      canvas.width = 1;
      canvas.height = 1;
      lastBlob = encoded;

      if (encoded.size <= QT_PHOTO_MAX_STORED_SIZE) {
        const validation = await verifyQTPhotoBlob(encoded, { checkPixels: true });
        return {
          blob: encoded,
          width: validation.width,
          height: validation.height,
        };
      }
    }

    if (!lastBlob || lastBlob.size > QT_PHOTO_MAX_STORED_SIZE) {
      throw new QTPhotoPreparationError("stored_too_large");
    }

    const validation = await verifyQTPhotoBlob(lastBlob, { checkPixels: true });
    return {
      blob: lastBlob,
      width: validation.width,
      height: validation.height,
    };
  } finally {
    decoded.cleanup();
  }
}

export async function prepareQTPhoto(
  file: File,
  options: { validateDirectPixels?: boolean } = {},
): Promise<PreparedQTPhoto> {
  if (file.size <= 0) throw new QTPhotoPreparationError("decode_failed");
  if (file.size > QT_PHOTO_MAX_INPUT_SIZE) throw new QTPhotoPreparationError("input_too_large");

  const detectedSourceType = await detectQTPhotoMimeType(file, file.name);
  if (!detectedSourceType.startsWith("image/")) {
    throw new QTPhotoPreparationError("unsupported");
  }

  const sourceBlob = file.type === detectedSourceType
    ? file
    : new Blob([file], { type: detectedSourceType });

  // For an already-supported file under the Storage limit, preserve the exact
  // original bytes. Pixel reads are deliberately avoided here because some
  // Android browsers can display a valid photo but fail Canvas/getImageData.
  if (DIRECT_UPLOAD_MIME_TYPES.has(detectedSourceType) && sourceBlob.size <= QT_PHOTO_MAX_STORED_SIZE) {
    const validation = await verifyQTPhotoBlob(sourceBlob, {
      checkPixels: options.validateDirectPixels === true,
    });
    const contentType = detectedSourceType as PreparedQTPhoto["contentType"];
    return {
      blob: sourceBlob,
      contentType,
      extension: getExtension(contentType),
      width: validation.width,
      height: validation.height,
      originalSize: file.size,
      wasTransformed: false,
      sourceMimeType: detectedSourceType,
      detectedSourceType,
    };
  }

  let compressed: { blob: Blob; width: number; height: number };
  try {
    compressed = await compressPhoto(sourceBlob);
  } catch (error) {
    if (error instanceof QTPhotoPreparationError) throw error;
    throw new QTPhotoPreparationError("decode_failed");
  }

  return {
    blob: compressed.blob,
    contentType: "image/jpeg",
    extension: "jpg",
    width: compressed.width,
    height: compressed.height,
    originalSize: file.size,
    wasTransformed: true,
    sourceMimeType: detectedSourceType,
    detectedSourceType,
  };
}
