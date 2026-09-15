"use client";

import { useEffect, useRef, useState } from "react";
import type { RootsAvatarType } from "@/lib/avatar";
import {
  filterProfileCharacterLayers,
  getProfileCharacterBaseImageSrc,
  type ProfileCharacterLayer,
} from "@/lib/profileCharacter";
import ProfileCharacterPreview from "@/components/ProfileCharacterPreview";

type HomeCharacterPreviewProps = {
  ownerId: string;
  avatarType: RootsAvatarType;
  alt: string;
  layers: readonly ProfileCharacterLayer[];
  itemsReady: boolean;
};

/** Home alone waits for a complete appearance; page loading and rewards do not. */
export default function HomeCharacterPreview({ ownerId, avatarType, alt, layers, itemsReady }: HomeCharacterPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [preparedSignature, setPreparedSignature] = useState<string | null>(null);
  const visibleLayers = itemsReady ? filterProfileCharacterLayers(layers, avatarType) : [];
  const signature = JSON.stringify([
    ownerId,
    getProfileCharacterBaseImageSrc(avatarType),
    visibleLayers.map(layer => [layer.id, layer.src, layer.slot, layer.zIndex]),
  ]);
  // Compare during render, so a new avatar/outfit cannot expose the old readiness
  // for one frame while the effect for its new image sources is starting.
  const ready = itemsReady && preparedSignature === signature;

  useEffect(() => {
    setPreparedSignature(null);
    const images = Array.from(previewRef.current?.querySelectorAll("img") ?? []);
    if (images.length === 0) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];
    const loaded = images.map(image => {
      image.decoding = "async";
      return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          image.removeEventListener("load", onLoad);
          image.removeEventListener("error", onError);
        };
        const onLoad = () => {
          cleanup();
          if (image.naturalWidth > 0) resolve();
          else reject(new Error("Home character image unavailable"));
        };
        const onError = () => {
          cleanup();
          reject(new Error("Home character image unavailable"));
        };
        cleanups.push(cleanup);
        image.addEventListener("load", onLoad);
        image.addEventListener("error", onError);
        // Covers cached images and a load that finished before listeners attached.
        if (image.complete) image.naturalWidth > 0 ? onLoad() : onError();
      });
    });

    // Use the real rendered elements: no second preloader, polling, image copies,
    // or extra requests. Promise-based decoding leaves Home interactions available.
    void Promise.all(loaded).then(async () => {
      if (disposed) return;
      await Promise.all(images.map(image => typeof image.decode === "function" ? image.decode() : undefined));
      if (!disposed && images.every(image => image.complete && image.naturalWidth > 0)) {
        setPreparedSignature(signature);
      }
    }).catch(() => {
      // A failed layer must not reveal an incomplete outfit. The surrounding
      // customization button remains usable, including when the network is down.
      cleanups.forEach(cleanup => cleanup());
    });

    return () => {
      disposed = true;
      cleanups.forEach(cleanup => cleanup());
    };
  }, [signature]);

  return (
    <div style={{ position: "relative", width: "clamp(72px, 20vw, 88px)" }}>
      <div ref={previewRef} aria-hidden={!ready} style={{ visibility: ready ? "visible" : "hidden" }}>
        <ProfileCharacterPreview avatarType={avatarType} alt={alt} layers={visibleLayers} />
      </div>
      {!ready && (
        <div aria-hidden="true" style={{ position: "absolute", inset: "8% 12%", borderRadius: 18, background: "var(--sage-light)", opacity: 0.55, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, pointerEvents: "none" }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--border)" }} />
          <span style={{ width: 34, height: 29, borderRadius: "14px 14px 8px 8px", background: "var(--border)" }} />
        </div>
      )}
    </div>
  );
}
