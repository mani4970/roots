"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { qtFlowCopy } from "@/lib/qtFlowCopy";

let mountedEditors = 0;

export default function QTConnectionNotice({ lang, ready = true }: { lang: Lang; ready?: boolean }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!ready) return;
    mountedEditors += 1;
    // Native offline screens consult this only after the editor has mounted.
    // A cold-start, error or loading screen never promises editable content.
    document.documentElement.setAttribute("data-roots-editor-ready", "true");
    const update = () => setOffline(navigator.onLine === false);
    const nativeUpdate = (event: Event) => {
      const online = (event as CustomEvent<{ online?: boolean }>).detail?.online;
      if (typeof online === "boolean") setOffline(!online);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("roots-qt-connectivity", nativeUpdate);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("roots-qt-connectivity", nativeUpdate);
      mountedEditors -= 1;
      if (mountedEditors === 0) document.documentElement.removeAttribute("data-roots-editor-ready");
    };
  }, [ready]);

  if (!ready || !offline) return null;
  return (
    <div role="status" aria-live="polite" style={{ margin: "calc(12px + var(--safe-area-top, 0px)) 16px 12px", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-card)", color: "var(--text)", fontSize: 13, lineHeight: 1.6 }}>
      {qtFlowCopy("offline", lang)}
    </div>
  );
}
