"use client";

import { useEffect, useRef, useState } from "react";
import { storageSet } from "@/lib/clientStorage";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

type OnboardingSlide = {
  title: string;
  desc: string;
  imageSrc: string;
  imageAlt: string;
  imageMaxHeight?: number;
  imagePadding?: number;
};

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const lang = useLang();
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    const imageSources = [
      "/images/onboarding/jesus_rootsman_rootswoman.webp",
      "/icon-qt.webp",
      "/tree1.webp",
      "/badge_rootswoman_fire.webp",
      "/rootsman_rock.png",
    ];

    imageSources.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  const SLIDES: OnboardingSlide[] = [
    {
      title: t("onboarding_title1", lang),
      desc: t("onboarding_desc1", lang),
      imageSrc: "/images/onboarding/jesus_rootsman_rootswoman.webp",
      imageAlt: "Jesus with Rootsman and Rootswoman",
      imageMaxHeight: 238,
      imagePadding: 0,
    },
    {
      title: t("onboarding_title2", lang),
      desc: t("onboarding_desc2", lang),
      imageSrc: "/icon-qt.webp",
      imageAlt: "Bible reflection icon",
      imageMaxHeight: 206,
      imagePadding: 10,
    },
    {
      title: t("onboarding_title3", lang),
      desc: t("onboarding_desc3", lang),
      imageSrc: "/tree1.webp",
      imageAlt: "100 day Bible story map",
      imageMaxHeight: 218,
      imagePadding: 0,
    },
    {
      title: t("onboarding_title4", lang),
      desc: t("onboarding_desc4", lang),
      imageSrc: "/badge_rootswoman_fire.webp",
      imageAlt: "Faith fruit badge",
      imageMaxHeight: 230,
      imagePadding: 6,
    },
    {
      title: t("onboarding_title5", lang),
      desc: t("onboarding_desc5", lang),
      imageSrc: "/rootsman_rock.png",
      imageAlt: "Encouraging Rootsman",
      imageMaxHeight: 250,
      imagePadding: 4,
    },
  ];

  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;
  const canGoPrevious = page > 0;
  const canGoNext = page < SLIDES.length - 1;

  function completeOnboarding() {
    storageSet("onboarding_done", "true");
    onClose();
  }

  function goToNextSlide() {
    setPage((current) => Math.min(current + 1, SLIDES.length - 1));
  }

  function goToPreviousSlide() {
    setPage((current) => Math.max(current - 1, 0));
  }

  function handleSwipeStart(clientX: number, clientY: number) {
    startXRef.current = clientX;
    startYRef.current = clientY;
  }

  function handleSwipeEnd(clientX: number, clientY: number) {
    const startX = startXRef.current;
    const startY = startYRef.current;
    startXRef.current = null;
    startYRef.current = null;
    if (startX === null || startY === null) return;

    const dx = clientX - startX;
    const dy = clientY - startY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx < 0) goToNextSlide();
    else goToPreviousSlide();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.84)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        onTouchStart={(event) => handleSwipeStart(event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0)}
        onTouchEnd={(event) => handleSwipeEnd(event.changedTouches[0]?.clientX ?? 0, event.changedTouches[0]?.clientY ?? 0)}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" || event.pointerType === "pen") {
            handleSwipeStart(event.clientX, event.clientY);
          }
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "mouse" || event.pointerType === "pen") {
            handleSwipeEnd(event.clientX, event.clientY);
          }
        }}
        style={{
          width: "100%",
          maxWidth: 390,
          minHeight: 560,
          maxHeight: "min(760px, calc(100dvh - 32px))",
          overflow: "hidden",
          position: "relative",
          background:
            "radial-gradient(circle at 50% 44%, rgba(255,232,176,0.28), rgba(255,250,240,0) 46%), var(--bg2)",
          borderRadius: 30,
          border: "1px solid rgba(222,214,201,0.95)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          padding: "30px 24px 22px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          touchAction: "pan-y",
          userSelect: "none",
        }}
      >
        {canGoPrevious ? (
          <button
            type="button"
            aria-label="Previous onboarding slide"
            onClick={(event) => {
              event.stopPropagation();
              goToPreviousSlide();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
              width: 34,
              height: 48,
              border: "none",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              color: "rgba(79,106,79,0.82)",
              fontSize: 34,
              fontWeight: 700,
              lineHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ‹
          </button>
        ) : null}

        {canGoNext ? (
          <button
            type="button"
            aria-label="Next onboarding slide"
            onClick={(event) => {
              event.stopPropagation();
              goToNextSlide();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
              width: 34,
              height: 48,
              border: "none",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              color: "rgba(79,106,79,0.82)",
              fontSize: 34,
              fontWeight: 700,
              lineHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ›
          </button>
        ) : null}

        <div>
          <div
            style={{
              width: 34,
              height: 3,
              borderRadius: 999,
              background: "rgba(122,157,122,0.48)",
              margin: "0 auto 18px",
            }}
          />

          {slide.title ? (
            <h2
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "var(--text)",
                margin: "0 0 16px",
                lineHeight: 1.22,
                letterSpacing: -0.6,
                whiteSpace: "normal",
              }}
            >
              {slide.title}
            </h2>
          ) : (
            <div style={{ height: 8 }} />
          )}

          <p
            style={{
              fontSize: page === 4 ? 17 : 14,
              color: page === 4 ? "var(--text)" : "var(--text2)",
              fontWeight: page === 4 ? 750 : 500,
              lineHeight: page === 4 ? 1.72 : 1.78,
              whiteSpace: "normal",
              margin: "0 auto 22px",
              maxWidth: page === 4 ? 320 : 330,
            }}
          >
            {slide.desc}
          </p>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "relative",
            width: "100%",
            flex: "1 1 auto",
            minHeight: 210,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            overflow: "hidden",
            isolation: "isolate",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "8% 6% 2%",
              borderRadius: "999px",
              background: "rgba(255,226,160,0.22)",
              filter: "blur(0.2px)",
            }}
          />
          <img
            key={`${page}-${slide.imageSrc}`}
            src={slide.imageSrc}
            alt={slide.imageAlt}
            draggable={false}
            style={{
              position: "relative",
              zIndex: 1,
              display: "block",
              maxWidth: "100%",
              width: page === 2 ? "100%" : "auto",
              maxHeight: slide.imageMaxHeight ?? 220,
              objectFit: "contain",
              borderRadius: page === 2 ? 22 : 0,
              padding: slide.imagePadding ?? 0,
              background: page === 2 ? "rgba(255,255,255,0.44)" : "transparent",
              boxShadow: page === 2 ? "0 14px 34px rgba(48,38,25,0.08)" : "none",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
            }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "center", gap: 11, marginBottom: isLast ? 18 : 4 }}>
            {SLIDES.map((_, index) => (
              <span
                key={index}
                style={{
                  width: index === page ? 18 : 9,
                  height: 9,
                  borderRadius: 999,
                  background: index === page ? "var(--sage)" : "rgba(222,214,201,0.9)",
                  transition: "all 0.24s ease",
                }}
              />
            ))}
          </div>

          {isLast ? (
            <button onClick={completeOnboarding} className="btn-sage" style={{ width: "100%" }}>
              {t("onboarding_start", lang)}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
