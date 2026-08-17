"use client";

import Image from "next/image";
import { useLang } from "@/lib/useLang";

type PetShopAnnouncementPopupProps = {
  show: boolean;
  onClose: () => void;
  onOpenShop: () => void;
};

type AnnouncementLang = "ko" | "en" | "de" | "fr" | "es";

const COPY: Record<AnnouncementLang, {
  title: string;
  button: string;
  close: string;
  petNames: readonly string[];
}> = {
  ko: {
    title: "루츠맨과 루츠우먼을 위한\n반려동물이 생겼어요!",
    button: "사랑 상점 구경하기",
    close: "닫기",
    petNames: ["슈나우저", "비숑 프리제", "러시안 블루", "페르시안 고양이"],
  },
  en: {
    title: "Pets have arrived for\nRootsman and Rootswoman!",
    button: "Visit the Love Shop",
    close: "Close",
    petNames: ["Schnauzer", "Bichon Frise", "Russian Blue", "Persian Cat"],
  },
  de: {
    title: "Für Rootsman und Rootswoman\ngibt es jetzt Haustiere!",
    button: "Zum Herzenshop",
    close: "Schließen",
    petNames: ["Schnauzer", "Bichon Frisé", "Russisch Blau", "Perserkatze"],
  },
  fr: {
    title: "Des animaux sont arrivés pour\nRootsman et Rootswoman !",
    button: "Voir la Boutique d’amour",
    close: "Fermer",
    petNames: ["Schnauzer", "Bichon frisé", "Bleu russe", "Chat persan"],
  },
  es: {
    title: "¡Ya hay mascotas para\nRootsman y Rootswoman!",
    button: "Visitar la Tienda de corazones",
    close: "Cerrar",
    petNames: ["Schnauzer", "Bichón frisé", "Azul ruso", "Gato persa"],
  },
};

const PET_PATHS = [
  "/images/heart-shop/character/shared/pets/pet-01.png",
  "/images/heart-shop/character/shared/pets/pet-02.png",
  "/images/heart-shop/character/shared/pets/pet-03.png",
  "/images/heart-shop/character/shared/pets/pet-04.png",
] as const;

// Keep the popup crop independent from the full-canvas profile position.
// All four pets are centered around x=822 after the profile placement update.
const PET_POPUP_CROP = { x: 649, y: 940, width: 345, height: 345 } as const;

function PetTile({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ minWidth: 0, textAlign: "center" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          overflow: "hidden",
          borderRadius: 18,
          border: "1px solid rgba(122,157,122,.22)",
          background: "var(--sage-light)",
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={1086}
          height={1448}
          unoptimized
          draggable={false}
          style={{
            position: "absolute",
            left: `${(-PET_POPUP_CROP.x / PET_POPUP_CROP.width) * 100}%`,
            top: `${(-PET_POPUP_CROP.y / PET_POPUP_CROP.height) * 100}%`,
            width: `${(1086 / PET_POPUP_CROP.width) * 100}%`,
            height: `${(1448 / PET_POPUP_CROP.height) * 100}%`,
            maxWidth: "none",
            imageRendering: "pixelated",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
      <span style={{ display: "block", marginTop: 5, color: "var(--text3)", fontSize: 8.5, lineHeight: 1.25, fontWeight: 800 }}>
        {alt}
      </span>
    </div>
  );
}

export default function PetShopAnnouncementPopup({
  show,
  onClose,
  onOpenShop,
}: PetShopAnnouncementPopupProps) {
  const lang = useLang();
  if (!show) return null;
  const copy = COPY[lang] ?? COPY.ko;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 245,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))",
        background: "rgba(26,28,30,.78)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-shop-announcement-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          borderRadius: 28,
          border: "1px solid rgba(122,157,122,.3)",
          background: "var(--bg2)",
          boxShadow: "0 20px 64px rgba(0,0,0,.3)",
          padding: "28px 20px 22px",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--bg3)",
            color: "var(--text3)",
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <div style={{ display: "inline-flex", marginBottom: 10, borderRadius: 999, padding: "5px 10px", background: "rgba(232,117,104,.12)", color: "#c65f54", fontSize: 10, fontWeight: 950, letterSpacing: ".3px" }}>
          NEW
        </div>
        <h2
          id="pet-shop-announcement-title"
          style={{ margin: "0 24px 16px", color: "var(--text)", fontSize: 20, lineHeight: 1.42, fontWeight: 950, whiteSpace: "pre-line" }}
        >
          {copy.title}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginBottom: 18 }}>
          {PET_PATHS.map((path, index) => (
            <PetTile key={path} src={path} alt={copy.petNames[index]} />
          ))}
        </div>

        <button type="button" onClick={onOpenShop} className="btn-sage" style={{ width: "100%", minHeight: 46 }}>
          {copy.button} <span aria-hidden="true">💛</span>
        </button>
      </div>
    </div>
  );
}
