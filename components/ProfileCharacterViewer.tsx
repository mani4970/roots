"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import ProfileCharacterPreview from "@/components/ProfileCharacterPreview";
import type { ProfileCharacterLayer } from "@/lib/profileCharacter";

type ProfileCharacterViewerProps = {
  show: boolean;
  avatarType: unknown;
  title: string;
  alt: string;
  closeLabel: string;
  layers?: readonly ProfileCharacterLayer[];
  onClose: () => void;
};

export default function ProfileCharacterViewer({
  show,
  avatarType,
  title,
  alt,
  closeLabel,
  layers = [],
  onClose,
}: ProfileCharacterViewerProps) {
  const historyEntryActiveRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!show || typeof window === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const currentState = window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
    window.history.pushState(
      { ...currentState, rootsProfileCharacterViewer: true },
      "",
      window.location.href,
    );
    historyEntryActiveRef.current = true;

    function handlePopState() {
      if (!historyEntryActiveRef.current) return;
      historyEntryActiveRef.current = false;
      onCloseRef.current();
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [show]);

  function requestClose() {
    if (typeof window !== "undefined" && historyEntryActiveRef.current) {
      window.history.back();
      return;
    }
    onCloseRef.current();
  }

  if (!show) return null;

  return (
    <div
      role="presentation"
      onClick={requestClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 575,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom))",
        background: "var(--overlay-modal)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={event => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 390,
          maxHeight: "calc(100dvh - 36px)",
          overflowY: "auto",
          borderRadius: 28,
          border: "1px solid var(--profile-sage-notice-border)",
          background: "var(--profile-modal-surface)",
          boxShadow: "var(--shadow-modal)",
          padding: "16px 16px 20px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "38px 1fr 38px", alignItems: "center", marginBottom: 10 }}>
          <span aria-hidden="true" />
          <h3 style={{ margin: 0, textAlign: "center", color: "var(--text)", fontSize: 18, fontWeight: 950 }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={requestClose}
            aria-label={closeLabel}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--bg3)",
              color: "var(--text2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={17} />
          </button>
        </div>

        <div
          style={{
            minHeight: 430,
            borderRadius: 24,
            border: "1px solid var(--profile-character-preview-border)",
            background: "var(--profile-character-preview)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px",
          }}
        >
          <ProfileCharacterPreview
            avatarType={avatarType}
            alt={alt}
            layers={layers}
            style={{ width: "min(74vw, 276px)", maxWidth: 276 }}
          />
        </div>
      </div>
    </div>
  );
}
