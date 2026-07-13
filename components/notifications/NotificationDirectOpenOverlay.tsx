"use client";

import { Loader2 } from "lucide-react";

export default function NotificationDirectOpenOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        paddingBottom: "var(--native-bottom-system-bar)",
        color: "var(--sage-dark)",
      }}
    >
      <Loader2 size={30} strokeWidth={2.1} className="spin" />
    </div>
  );
}
