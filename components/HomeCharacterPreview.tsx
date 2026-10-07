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
  lang: string;
};

type PreviewPhase = "loading" | "ready" | "unavailable";
const CHARACTER_PREPARATION_TIMEOUT_MS = 15_000;
// Keep Home's fallback copy local; do not import the whole shop text catalog.
const UNAVAILABLE_TEXT = {
  ko: "캐릭터를 불러오지 못했어요",
  en: "Could not load your character",
  de: "Charakter konnte nicht geladen werden",
  fr: "Impossible de charger le personnage",
  es: "No se pudo cargar el personaje",
} as const;

/** Only this character waits for its outfit; Home actions and rewards do not. */
export default function HomeCharacterPreview({ ownerId, avatarType, alt, layers, itemsReady, lang }: HomeCharacterPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [preparation, setPreparation] = useState<{ signature: string; phase: PreviewPhase } | null>(null);
  const visibleLayers = itemsReady ? filterProfileCharacterLayers(layers, avatarType) : [];
  const signature = JSON.stringify([
    ownerId,
    itemsReady,
    getProfileCharacterBaseImageSrc(avatarType, visibleLayers),
    visibleLayers.map(layer => [layer.id, layer.src, layer.slot, layer.zIndex]),
  ]);
  // A new owner/outfit must never inherit the old outfit's ready state.
  const phase = preparation?.signature === signature ? preparation.phase : "loading";
  const ready = itemsReady && phase === "ready";
  const unavailable = phase === "unavailable";
  const language = lang === "en" || lang === "de" || lang === "fr" || lang === "es" ? lang : "ko";

  useEffect(() => {
    let disposed = false;
    let revision = 0;
    let checkTimer: number | null = null;
    const images = Array.from(previewRef.current?.querySelectorAll("img") ?? []);
    const publish = (next: PreviewPhase) => {
      if (disposed) return;
      setPreparation(previous => previous?.signature === signature && previous.phase === next
        ? previous : { signature, phase: next });
    };
    publish("loading");
    // A stalled outfit read or image must not leave an endless waiting state.
    // This is a UI deadline, not a retry or cancellation of the original request.
    const deadline = window.setTimeout(() => publish("unavailable"), CHARACTER_PREPARATION_TIMEOUT_MS);

    const check = () => {
      checkTimer = null;
      if (disposed || !itemsReady || images.length === 0) return;
      const checkedRevision = ++revision;
      if (images.some(image => image.complete && image.naturalWidth === 0)) {
        publish("unavailable");
        return;
      }
      if (!images.every(image => image.complete && image.naturalWidth > 0)) return;
      const sources = images.map(image => image.src);
      const stillCurrent = () => !disposed && checkedRevision === revision
        && images.every((image, index) => image.src === sources[index]);

      // Decode the real displayed elements, not duplicate Image() preloaders.
      void Promise.all(images.map(image => typeof image.decode === "function"
        ? image.decode() : Promise.resolve())).then(() => {
        if (!stillCurrent()) return;
        if (images.every(image => image.complete && image.naturalWidth > 0
          && (!image.currentSrc || image.currentSrc === image.src))) {
          window.clearTimeout(deadline);
          publish("ready");
        }
      }).catch(() => {
        if (stillCurrent()) publish("unavailable");
      });
    };
    const scheduleCheck = () => {
      ++revision;
      if (disposed || checkTimer !== null) return;
      // Run after every handler for this event has finished. In particular,
      // ProfileCharacterPreview may replace a failed hair src with its fallback.
      checkTimer = window.setTimeout(check, 0);
    };
    images.forEach(image => {
      image.decoding = "async";
      image.addEventListener("load", scheduleCheck);
      image.addEventListener("error", scheduleCheck);
    });
    if (itemsReady) scheduleCheck(); // Also handles images already in cache.

    // Keep observing after a failed source/deadline: a successful fallback or
    // late original response can still recover, without issuing any new request.
    return () => {
      disposed = true;
      ++revision;
      window.clearTimeout(deadline);
      if (checkTimer !== null) window.clearTimeout(checkTimer);
      images.forEach(image => {
        image.removeEventListener("load", scheduleCheck);
        image.removeEventListener("error", scheduleCheck);
      });
    };
  }, [signature, itemsReady]);

  return (
    <div aria-busy={phase === "loading"} style={{ position: "relative", width: "clamp(92px, 25vw, 112px)", aspectRatio: "1 / 1" }}>
      <div ref={previewRef} aria-hidden={!ready} style={{ visibility: ready ? "visible" : "hidden" }}>
        {itemsReady && (
          <ProfileCharacterPreview key={ownerId} avatarType={avatarType} alt={alt} layers={visibleLayers} forceSquareCanvas />
        )}
      </div>
      {!ready && (
        <div role={unavailable ? "status" : undefined} aria-hidden={!unavailable} style={{ position: "absolute", inset: "8% 12%", borderRadius: 18, background: "var(--sage-light)", opacity: unavailable ? 1 : 0.55, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, pointerEvents: "none" }}>
          {unavailable ? (
            <span style={{ color: "var(--text2)", fontSize: 11, lineHeight: 1.35, textAlign: "center", padding: "0 4px", overflowWrap: "anywhere" }}>
              {UNAVAILABLE_TEXT[language]}
            </span>
          ) : (
            <>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--border)" }} />
              <span style={{ width: 34, height: 29, borderRadius: "14px 14px 8px 8px", background: "var(--border)" }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
