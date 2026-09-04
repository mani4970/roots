"use client";

import { useEffect, useState } from "react";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { getOnboardingText } from "@/lib/onboardingText";
import { useLang } from "@/lib/useLang";

type OnboardingSlide = {
  title: string;
  desc: string;
  imageSrc?: string;
  imageAlt?: string;
  imageMaxHeight?: number;
  imagePadding?: number;
  visual?: "ark-growth" | "heart";
  textTopPadding?: number;
};

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const lang = useLang();

  useEffect(() => {
    const imageSources = [
      "/images/onboarding/jesus_rootsman_rootswoman.webp",
      "/icon-qt.webp",
      "/icon-prayer-request.webp",
      "/images/reward-maps/peace-ark/backgrounds/ark_stage01_morning.webp",
      "/images/reward-maps/peace-ark/backgrounds/ark_stage10_morning.webp",
      "/rootsman_rock.webp",
    ];

    imageSources.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  const copy = getOnboardingText(lang);
  const SLIDES: OnboardingSlide[] = [
    {
      ...copy.slides[0],
      imageSrc: "/images/onboarding/jesus_rootsman_rootswoman.webp",
      imageAlt: "Jesus with Rootsman and Rootswoman",
      imageMaxHeight: 238,
      imagePadding: 0,
    },
    {
      ...copy.slides[1],
      imageSrc: "/icon-qt.webp",
      imageAlt: "Bible Reflection icon",
      imageMaxHeight: 206,
      imagePadding: 10,
      textTopPadding: 46,
    },
    {
      ...copy.slides[2],
      imageSrc: "/icon-prayer-request.webp",
      imageAlt: "Prayer icon",
      imageMaxHeight: 190,
      imagePadding: 12,
      textTopPadding: 46,
    },
    {
      ...copy.slides[3],
      visual: "ark-growth",
      textTopPadding: 18,
    },
    {
      ...copy.slides[4],
      visual: "heart",
      textTopPadding: 22,
    },
    {
      ...copy.slides[5],
      imageSrc: "/rootsman_rock.webp",
      imageAlt: "Encouraging Rootsman",
      imageMaxHeight: 250,
      imagePadding: 4,
    },
  ];

  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  function completeOnboarding() {
    onClose();
  }

  function goToNextSlide() {
    setPage((current) => Math.min(current + 1, SLIDES.length - 1));
  }

  function goToPreviousSlide() {
    setPage((current) => Math.max(current - 1, 0));
  }

  useAndroidBackHandler(() => {
    goToPreviousSlide();
    return true;
  });
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
        style={{
          width: "100%",
          maxWidth: 390,
          height: "min(600px, calc(100dvh - 32px))",
          overflow: "hidden",
          position: "relative",
          background: "var(--bg2)",
          borderRadius: 30,
          border: "1px solid rgba(222,214,201,0.95)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          padding: "30px 24px 22px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          userSelect: "none",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: 34,
            height: 3,
            borderRadius: 999,
            background: "rgba(122,157,122,0.48)",
          }}
        />

        <div
          style={{
            paddingTop: slide.textTopPadding ?? (isLast ? 42 : 22),
            ...(slide.visual === "heart"
              ? {
                  flex: "1 1 auto",
                  display: "flex",
                  flexDirection: "column" as const,
                  justifyContent: "center",
                }
              : {}),
          }}
        >
          {slide.visual === "heart" ? (
            <span aria-hidden="true" style={{ display: "block", fontSize: 92, lineHeight: 1, marginBottom: 24 }}>
              💛
            </span>
          ) : null}

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
              fontSize: isLast ? 18 : 14,
              color: isLast ? "var(--text)" : "var(--text2)",
              fontWeight: isLast ? 800 : 500,
              lineHeight: isLast ? 1.65 : 1.78,
              whiteSpace: "normal",
              margin: isLast ? "0 auto 8px" : "0 auto 22px",
              maxWidth: isLast ? 340 : 330,
            }}
          >
            {slide.desc}
          </p>
        </div>

        {slide.visual !== "heart" ? (
          <div
            aria-hidden="true"
            style={{
              position: "relative",
              width: "100%",
              flex: "1 1 auto",
              minHeight: 210,
              display: "flex",
              alignItems: "center",
              justifyContent: isLast ? "flex-start" : "center",
              margin: isLast ? "0 auto 8px" : "0 auto 18px",
              overflow: "hidden",
              isolation: "isolate",
            }}
          >
            {slide.visual === "ark-growth" ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <img
                  src="/images/reward-maps/peace-ark/backgrounds/ark_stage01_morning.webp"
                  alt=""
                  draggable={false}
                  style={{ display: "block", width: "100%", maxWidth: 210, height: "auto", objectFit: "contain" }}
                />
                <span style={{ color: "var(--sage-dark)", fontSize: 18, fontWeight: 800, lineHeight: 1 }} aria-hidden="true">↓</span>
                <img
                  src="/images/reward-maps/peace-ark/backgrounds/ark_stage10_morning.webp"
                  alt=""
                  draggable={false}
                  style={{ display: "block", width: "100%", maxWidth: 210, height: "auto", objectFit: "contain" }}
                />
              </div>
            ) : slide.imageSrc ? (
              <img
                key={`${page}-${slide.imageSrc}`}
                src={slide.imageSrc}
                alt={slide.imageAlt ?? ""}
                draggable={false}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "block",
                  maxWidth: "100%",
                  width: "auto",
                  maxHeight: slide.imageMaxHeight ?? 220,
                  objectFit: "contain",
                  padding: slide.imagePadding ?? 0,
                  background: "transparent",
                  boxShadow: "none",
                  margin: "0 auto",
                  transform: isLast ? "translateX(12px) translateZ(0)" : "translateZ(0)",
                  backfaceVisibility: "hidden",
                }}
              />
            ) : null}
          </div>
        ) : null}

        <div>
          <div style={{ display: "flex", justifyContent: "center", gap: 11, marginBottom: 18 }}>
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

          <div style={{ display: "flex", gap: 10 }}>
            {page > 0 ? (
              <button
                type="button"
                onClick={goToPreviousSlide}
                className="btn-outline"
                style={{ flex: 1 }}
              >
                {copy.previous}
              </button>
            ) : null}

            {isLast ? (
              <button
                type="button"
                onClick={completeOnboarding}
                className="btn-sage"
                style={{ flex: page > 0 ? 2 : 1 }}
              >
                {copy.start}
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNextSlide}
                className="btn-sage"
                style={{ flex: page > 0 ? 2 : 1 }}
              >
                {copy.next}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
