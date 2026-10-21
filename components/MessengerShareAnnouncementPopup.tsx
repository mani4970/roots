"use client";

import { useEffect, useRef } from "react";
import { useLang } from "@/lib/useLang";
import type { Lang } from "@/lib/i18n";

const COPY: Record<Lang, { title: string; warning: string; confirm: string }> = {
  ko: {
    title: "이제 묵상을 메신저로 공유해보세요!",
    warning: "기기·브라우저·앱 버전에 따라 공유가 지원되지 않을 수 있어요.",
    confirm: "확인",
  },
  en: {
    title: "You can now share your reflections through messaging apps!",
    warning: "Sharing may not be supported on some devices, browsers or app versions.",
    confirm: "OK",
  },
  de: {
    title: "Teile deine Stille Zeit jetzt auch über Messenger!",
    warning: "Je nach Gerät, Browser oder App-Version wird das Teilen möglicherweise nicht unterstützt.",
    confirm: "OK",
  },
  fr: {
    title: "Partagez maintenant vos méditations par messagerie !",
    warning: "Le partage peut ne pas être pris en charge selon l’appareil, le navigateur ou la version de l’application.",
    confirm: "OK",
  },
  es: {
    title: "¡Ahora puedes compartir tus meditaciones por mensajería!",
    warning: "Es posible que compartir no sea compatible con algunos dispositivos, navegadores o versiones de la aplicación.",
    confirm: "Aceptar",
  },
};

export default function MessengerShareAnnouncementPopup({ show, onConfirm, onClose }: {
  show: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const lang = useLang();
  const copy = COPY[lang];
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!show) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => confirmRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === "Tab") {
        event.preventDefault();
        confirmRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [show]);

  if (!show) return null;

  return (
    <div role="presentation" style={{
      position: "fixed", inset: 0, zIndex: 275, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))",
      background: "rgba(26,28,30,.8)", backdropFilter: "blur(8px)",
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="messenger-share-announcement-title" aria-describedby="messenger-share-announcement-warning" style={{
        width: "100%", maxWidth: 360, maxHeight: "100%", overflowY: "auto", borderRadius: 28,
        border: "1px solid rgba(122,157,122,.3)", background: "var(--bg2)",
        boxShadow: "0 20px 64px rgba(0,0,0,.32)", padding: "30px 22px 22px", textAlign: "center",
      }}>
        <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 20 }}>
          <img src="/share/kakaotalk.svg" alt="" width={52} height={52} style={{ display: "block", objectFit: "contain" }} />
          <img src="/share/whatsapp.svg" alt="" width={52} height={52} style={{ display: "block", objectFit: "contain" }} />
        </div>
        <h2 id="messenger-share-announcement-title" style={{ margin: "0 0 16px", color: "var(--text)", fontSize: 20, fontWeight: 900, lineHeight: 1.45, overflowWrap: "anywhere" }}>
          {copy.title}
        </h2>
        <p id="messenger-share-announcement-warning" style={{ margin: "0 0 24px", color: "var(--text-muted-readable)", fontSize: 12.5, lineHeight: 1.65, overflowWrap: "anywhere" }}>
          {copy.warning}
        </p>
        <button ref={confirmRef} type="button" className="btn-sage" onClick={onConfirm} style={{ width: "100%", minHeight: 46 }}>
          {copy.confirm}
        </button>
      </div>
    </div>
  );
}
