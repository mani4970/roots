export const QT_PHOTO_MAX_INPUT_SIZE = 15 * 1024 * 1024;
export const QT_PHOTO_MAX_STORED_SIZE = 2 * 1024 * 1024;

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

function normalizeMimeType(value: string | null | undefined, fileName = "") {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
  if (raw) return raw;

  const lowerName = fileName.toLowerCase();
  if (/\.(jpe?g|jfif)$/.test(lowerName)) return "image/jpeg";
  if (/\.png$/.test(lowerName)) return "image/png";
  if (/\.webp$/.test(lowerName)) return "image/webp";
  if (/\.hei[cf]$/.test(lowerName)) return "image/heic";
  if (/\.avif$/.test(lowerName)) return "image/avif";
  return "";
}

function getExtension(contentType: string): PreparedQTPhoto["extension"] {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

async function decodeWithImageBitmap(blob: Blob): Promise<DecodedPhoto | null> {
  if (typeof createImageBitmap !== "function") return null;

  try {
    const bitmap = await createImageBitmap(blob, {
      imageOrientation: "from-image",
      premultiplyAlpha: "default",
      colorSpaceConversion: "default",
    });
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
    if (error instanceof QTPhotoPreparationError) throw error;
    return null;
  }
}

async function decodeWithImageElement(blob: Blob): Promise<DecodedPhoto> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      if (image.complete) {
        if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve();
        else reject(new QTPhotoPreparationError("decode_failed"));
        return;
      }
      image.onload = () => resolve();
      image.onerror = () => reject(new QTPhotoPreparationError("decode_failed"));
    });

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

async function validatePhotoBlob(blob: Blob) {
  const decoded = await decodePhoto(blob);
  try {
    const stats = readPixelStats(decoded);
    assertPhotoIsNotBlankOrBlack(stats);
    return { width: decoded.width, height: decoded.height };
  } finally {
    decoded.cleanup();
  }
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
    let lastWidth = decoded.width;
    let lastHeight = decoded.height;

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
      lastWidth = width;
      lastHeight = height;

      if (encoded.size <= QT_PHOTO_MAX_STORED_SIZE) {
        const validation = await validatePhotoBlob(encoded);
        return {
          blob: encoded,
          width: validation.width,
          height: validation.height,
        };
      }
    }

    if (!lastBlob) throw new QTPhotoPreparationError("encode_failed");
    if (lastBlob.size > QT_PHOTO_MAX_STORED_SIZE) {
      throw new QTPhotoPreparationError("stored_too_large");
    }

    const validation = await validatePhotoBlob(lastBlob);
    return {
      blob: lastBlob,
      width: validation.width || lastWidth,
      height: validation.height || lastHeight,
    };
  } finally {
    decoded.cleanup();
  }
}

export async function prepareQTPhoto(file: File): Promise<PreparedQTPhoto> {
  const mimeType = normalizeMimeType(file.type, file.name);
  if (!mimeType.startsWith("image/")) {
    throw new QTPhotoPreparationError("unsupported");
  }
  if (file.size <= 0) {
    throw new QTPhotoPreparationError("decode_failed");
  }
  if (file.size > QT_PHOTO_MAX_INPUT_SIZE) {
    throw new QTPhotoPreparationError("input_too_large");
  }

  if (DIRECT_UPLOAD_MIME_TYPES.has(mimeType) && file.size <= QT_PHOTO_MAX_STORED_SIZE) {
    const validation = await validatePhotoBlob(file);
    const contentType = mimeType as PreparedQTPhoto["contentType"];
    return {
      blob: file,
      contentType,
      extension: getExtension(contentType),
      width: validation.width,
      height: validation.height,
      originalSize: file.size,
      wasTransformed: false,
    };
  }

  let compressed: { blob: Blob; width: number; height: number };
  try {
    compressed = await compressPhoto(file);
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
  };
}
