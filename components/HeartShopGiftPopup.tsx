"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Gift } from "lucide-react";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";

type Props = {
  received?: boolean;
  title: string;
  itemName: string;
  visual: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export default function HeartShopGiftPopup({ received = false, title, itemName, visual, primaryLabel, onPrimary, secondaryLabel, onSecondary }: Props) {
  const titleId = useId();
  const itemId = useId();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const lastRef = useRef<HTMLButtonElement>(null);
  const dismiss = onSecondary ?? onPrimary;
  const handled = useRef(false);

  function act(action: () => void) {
    if (handled.current) return;
    handled.current = true;
    action();
  }

  useEffect(() => {
    const previous = document.activeElement;
    primaryRef.current?.focus({ preventScroll: true });
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  useAndroidBackHandler(() => { act(dismiss); return true; });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 560, display: "grid", placeItems: "center", padding: "calc(16px + env(safe-area-inset-top)) 18px calc(16px + env(safe-area-inset-bottom))", background: "var(--overlay-modal)", backdropFilter: "blur(6px)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={itemId}
        onKeyDown={event => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            act(dismiss);
          } else if (event.key === "Tab") {
            const first = primaryRef.current;
            const last = lastRef.current ?? first;
            if (document.activeElement === (event.shiftKey ? first : last)) {
              event.preventDefault();
              (event.shiftKey ? last : first)?.focus();
            }
          }
        }}
        style={{ width: "min(100%, 360px)", maxHeight: "100%", overflowY: "auto", border: "1px solid var(--border)", borderRadius: 25, background: "var(--bg2)", color: "var(--text)", boxShadow: "var(--shadow-card)", padding: "22px 20px 12px", textAlign: "center" }}>
        <Gift size={received ? 32 : 22} color="var(--sage-dark)" aria-hidden="true" />
        <h2 id={titleId} style={{ fontSize: 19, margin: "8px 0 16px", lineHeight: 1.4, overflowWrap: "anywhere" }}>{title}</h2>
        <div aria-hidden="true" style={{ width: 118, minHeight: 108, margin: "0 auto", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 17, background: "var(--heart-shop-preview-surface)" }}>{visual}</div>
        <p id={itemId} style={{ margin: "10px 0 20px", fontSize: received ? 15 : 18, fontWeight: received ? 700 : 850 }}>{itemName}</p>
        <button ref={primaryRef} type="button" className="btn-sage" onClick={() => act(onPrimary)} style={{ width: "100%", minHeight: 46, marginBottom: onSecondary ? 0 : 8 }}>{primaryLabel}</button>
        {onSecondary && secondaryLabel && <button ref={lastRef} type="button" onClick={() => act(onSecondary)} style={{ width: "100%", minHeight: 44, background: "transparent", border: 0, color: "var(--text2)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{secondaryLabel}</button>}
      </section>
    </div>
  );
}
