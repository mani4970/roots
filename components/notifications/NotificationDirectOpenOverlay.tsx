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
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          color: "var(--sage-dark)",
        }}
      >
        <Loader2 size={23} className="spin" />
      </div>
    </div>
  );
}
