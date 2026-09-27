import type { RootsAvatarType } from "@/lib/avatar";

// Only image readiness lives here. Frame cadence, paths, positions, and phase
// timers stay in the already-approved map animation components.
const IMAGE_READY_TIMEOUT_MS = 15_000;

/** The shared walking actor uses six Garden images, not the walk-sheet URL. */
export function getRewardMapSequenceImageSources(
  avatarType: RootsAvatarType,
  enterSprite: { src: string },
  actionSprite?: { src: string },
  exitSprite?: { src: string },
): string[] {
  const movingSources = (sprite: { src: string }) =>
    sprite.src.endsWith("/rootsman_walk_sheet.png") ||
    sprite.src.endsWith("/rootswoman_walk_sheet.webp")
      ? Array.from({ length: 6 }, (_, frame) =>
          `/images/reward-maps/garden/sprites/frames/${avatarType}/walk_${frame}.webp`)
      : [sprite.src];

  return [...new Set([
    ...movingSources(enterSprite),
    ...(actionSprite ? [actionSprite.src] : []),
    ...(exitSprite ? movingSources(exitSprite) : []),
  ])];
}

function prepareImage(src: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Sprite preparation cancelled", "AbortError"));
      return;
    }

    const image = new Image();
    let settled = false;
    let decoding = false;
    const cleanup = () => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", onAbort);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => fail(new DOMException("Sprite preparation cancelled", "AbortError"));
    const timer = setTimeout(() => fail(new Error(`Sprite preparation timed out: ${src}`)), IMAGE_READY_TIMEOUT_MS);

    image.onload = () => {
      if (settled || decoding) return;
      decoding = true;
      // complete alone also becomes true for a broken image. Check its actual
      // dimensions, then wait for decoding before letting any phase clock run.
      if (!image.naturalWidth || !image.naturalHeight) {
        fail(new Error(`Sprite image is unavailable: ${src}`));
        return;
      }
      const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
      void decoded.then(() => {
        if (settled) return;
        if (signal.aborted) { onAbort(); return; }
        settled = true;
        cleanup();
        resolve(image);
      }).catch(() => fail(new Error(`Sprite image could not be decoded: ${src}`)));
    };
    image.onerror = () => fail(new Error(`Sprite image failed to load: ${src}`));
    signal.addEventListener("abort", onAbort, { once: true });
    image.src = src;
  });
}

/**
 * Prepare just this run's images. Callers retain the returned image elements
 * until the run ends, and abort on cleanup. Failed runs are not cached, so a
 * later replay can retry. This helper never reads/writes rewards or user data.
 */
export function prepareRewardMapImages(
  sources: readonly string[],
  signal: AbortSignal,
): Promise<HTMLImageElement[]> {
  return Promise.all([...new Set(sources)].map(src => prepareImage(src, signal)));
}
