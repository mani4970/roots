"use client";

import { Loader2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";

const NOTIFICATION_DIRECT_OPEN_COPY = {
  ko: "알림 화면을 여는 중",
  en: "Opening notification",
  de: "Benachrichtigung wird geöffnet",
  fr: "Ouverture de la notification",
  es: "Abriendo la notificación",
} as const;

export default function NotificationDirectOpenOverlay({ lang }: { lang: Lang | "es" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={NOTIFICATION_DIRECT_OPEN_COPY[lang] ?? NOTIFICATION_DIRECT_OPEN_COPY.ko}
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
