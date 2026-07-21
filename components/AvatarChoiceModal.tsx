"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useLang } from "@/lib/useLang";
import {
  getRootsAvatarChoiceText,
  getRootsAvatarImageSrc,
  getRootsAvatarLabel,
  normalizeRootsAvatarType,
  type RootsAvatarType,
} from "@/lib/avatar";

interface AvatarChoiceModalProps {
  show: boolean;
  selectedAvatar?: unknown;
  mode?: "intro" | "change";
  saving?: boolean;
  onSelect: (avatarType: RootsAvatarType) => void;
  onLater?: () => void;
  onClose?: () => void;
}

const OPTIONS: readonly RootsAvatarType[] = ["rootsman", "rootswoman"];

export default function AvatarChoiceModal({
  show,
  selectedAvatar,
  mode = "intro",
  saving = false,
  onSelect,
  onLater,
  onClose,
}: AvatarChoiceModalProps) {
  const lang = useLang();
  const currentSelected = normalizeRootsAvatarType(selectedAvatar);
  const [pendingAvatar, setPendingAvatar] = useState<RootsAvatarType>(currentSelected);

  useEffect(() => {
    if (show) setPendingAvatar(currentSelected);
  }, [show, currentSelected]);

  if (!show) return null;

  const title = getRootsAvatarChoiceText(mode === "intro" ? "introTitle" : "changeTitle", lang);
  const body = getRootsAvatarChoiceText(mode === "intro" ? "introBody" : "changeBody", lang);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 240, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-modal)", backdropFilter: "blur(8px)", padding: "0 18px" }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ width: "100%", maxWidth: 390, background: "var(--profile-modal-surface)", border: "1px solid var(--border)", borderRadius: 28, padding: "24px 18px 18px", boxShadow: "var(--shadow-modal)", position: "relative" }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={getRootsAvatarChoiceText("close", lang)}
            style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        )}

        <div style={{ padding: onClose ? "0 32px" : "0 6px", textAlign: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginBottom: 8, lineHeight: 1.35 }}>{title}</h2>
          <p style={{ fontSize: 12.5, color: "var(--profile-muted-text)", lineHeight: 1.65 }}>{body}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {OPTIONS.map((avatarType) => {
            const isSelected = pendingAvatar === avatarType;
            return (
              <button
                key={avatarType}
                type="button"
                disabled={saving}
                onClick={() => setPendingAvatar(avatarType)}
                style={{ border: `1.5px solid ${isSelected ? "var(--profile-selected-border)" : "var(--border)"}`, background: isSelected ? "var(--profile-selected-surface)" : "var(--profile-card-surface)", borderRadius: 20, padding: "14px 10px 12px", cursor: saving ? "wait" : "pointer", minWidth: 0, boxShadow: isSelected ? "var(--shadow-card-sage)" : "var(--shadow-card)", WebkitTapHighlightColor: "transparent" }}
              >
                <div style={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <img
                    src={getRootsAvatarImageSrc(avatarType)}
                    alt={getRootsAvatarLabel(avatarType, lang)}
                    style={{ maxWidth: 74, maxHeight: 88, objectFit: "contain", imageRendering: "pixelated" }}
                  />
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text)", marginBottom: 10 }}>{getRootsAvatarLabel(avatarType, lang)}</div>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 24, borderRadius: 999, padding: "5px 10px", fontSize: 10.5, fontWeight: 850, background: isSelected ? "var(--sage-action)" : "var(--profile-card-muted-surface)", color: isSelected ? "var(--on-sage-action)" : "var(--profile-muted-text)" }}>
                  {getRootsAvatarChoiceText(isSelected ? "selected" : "select", lang)}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => onSelect(pendingAvatar)}
          className="btn-sage roots-profile-action"
          style={{ width: "100%", marginTop: 14, minHeight: 46, justifyContent: "center" }}
        >
          {saving ? <Loader2 size={14} className="spin" /> : getRootsAvatarChoiceText("confirm", lang)}
        </button>

        {onLater && (
          <button
            type="button"
            disabled={saving}
            onClick={onLater}
            style={{ width: "100%", marginTop: 8, padding: "10px", background: "transparent", border: "none", color: "var(--profile-muted-text)", fontSize: 12.5, fontWeight: 800, cursor: saving ? "wait" : "pointer" }}
          >
            {getRootsAvatarChoiceText("later", lang)}
          </button>
        )}
      </div>
    </div>
  );
}
