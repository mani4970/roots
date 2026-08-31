"use client";

import { useEffect, useState } from "react";

type ErrorLang = "ko" | "de" | "en" | "fr" | "es";

type ErrorCopy = {
  title: string;
  body: string;
  retry: string;
  home: string;
};

const ERROR_COPY: Record<ErrorLang, ErrorCopy> = {
  ko: {
    title: "잠시 문제가 발생했어요",
    body: "앱을 다시 불러오거나 홈으로 이동해 주세요.",
    retry: "다시 시도",
    home: "홈으로 이동",
  },
  de: {
    title: "Ein Problem ist aufgetreten",
    body: "Bitte versuche es erneut oder gehe zur Startseite.",
    retry: "Erneut versuchen",
    home: "Zur Startseite",
  },
  en: {
    title: "Something went wrong",
    body: "Please try again or return to the home screen.",
    retry: "Try again",
    home: "Go home",
  },
  fr: {
    title: "Un problème est survenu",
    body: "Veuillez réessayer ou revenir à l’accueil.",
    retry: "Réessayer",
    home: "Accueil",
  },
  es: {
    title: "Se produjo un problema",
    body: "Inténtalo de nuevo o vuelve al inicio.",
    retry: "Intentar de nuevo",
    home: "Volver al inicio",
  },
};

const ERROR_LANGS = new Set<ErrorLang>(["ko", "de", "en", "fr", "es"]);

function readErrorLang(): ErrorLang {
  try {
    const storedLang = window.localStorage.getItem("roots_lang")?.toLowerCase();
    if (storedLang && ERROR_LANGS.has(storedLang as ErrorLang)) {
      return storedLang as ErrorLang;
    }

    const browserLang = window.navigator.language.toLowerCase().split("-")[0];
    if (ERROR_LANGS.has(browserLang as ErrorLang)) {
      return browserLang as ErrorLang;
    }
  } catch {}

  return "ko";
}

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<ErrorLang>("ko");

  useEffect(() => {
    setLang(readErrorLang());
  }, []);

  const copy = ERROR_COPY[lang];

  return (
    <main
      role="alert"
      aria-labelledby="roots-error-title"
      aria-describedby="roots-error-description"
      style={{
        width: "100%",
        maxWidth: 430,
        minHeight: "100vh",
        margin: "0 auto",
        padding: "max(32px, env(safe-area-inset-top)) 24px max(32px, env(safe-area-inset-bottom))",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <img
        src="/roots-logo-transparent-160.png"
        alt="Roots"
        width={72}
        height={72}
        draggable={false}
        style={{ objectFit: "contain", marginBottom: 22 }}
      />
      <h1
        id="roots-error-title"
        style={{ margin: "0 0 10px", fontSize: 22, lineHeight: 1.35, fontWeight: 800 }}
      >
        {copy.title}
      </h1>
      <p
        id="roots-error-description"
        style={{ margin: "0 0 26px", maxWidth: 320, color: "var(--text2)", fontSize: 14, lineHeight: 1.65 }}
      >
        {copy.body}
      </p>
      <div style={{ width: "100%", maxWidth: 320, display: "grid", gap: 10 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            width: "100%",
            minHeight: 48,
            padding: "12px 16px",
            border: "none",
            borderRadius: 14,
            background: "var(--sage-action)",
            color: "var(--on-sage-action)",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {copy.retry}
        </button>
        <button
          type="button"
          onClick={() => window.location.assign("/")}
          style={{
            width: "100%",
            minHeight: 48,
            padding: "12px 16px",
            border: "1px solid var(--border)",
            borderRadius: 14,
            background: "var(--bg2)",
            color: "var(--text2)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {copy.home}
        </button>
      </div>
    </main>
  );
}
