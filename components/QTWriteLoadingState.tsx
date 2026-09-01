import { Loader2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getQTWriteText } from "@/lib/qtWriteText";

export default function QTWriteLoadingState({ lang }: { lang: Lang }) {
  const text = getQTWriteText(lang);

  return (
    <div
      className="roots-native-tablet-viewport"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-muted-readable)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div
        className="spin"
        style={{ display: "inline-flex", color: "var(--sage)" }}
        aria-hidden="true"
      >
        <Loader2 size={26} />
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>
        {text.loadingPassage}
      </p>
    </div>
  );
}
