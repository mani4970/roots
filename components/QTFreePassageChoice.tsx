"use client";

import { BookOpen, ChevronRight } from "lucide-react";

import type { Lang } from "@/lib/i18n";

type ChoiceText = {
  title: string;
  description: string;
  next: string;
  continueLabel: string;
  chooseNewLabel: string;
};

const TEXT: Record<Lang, ChoiceText> = {
  ko: {
    title: "어제 본문을 이어서 묵상할까요?",
    description: "어제 {previous} 말씀으로 묵상했어요.",
    next: "이어가면 {next}부터 시작해요.",
    continueLabel: "어제 본문 이어서 하기",
    chooseNewLabel: "새로 본문 정하기",
  },
  de: {
    title: "Mit dem gestrigen Bibeltext fortfahren?",
    description: "Gestern haben Sie über {previous} nachgedacht.",
    next: "Sie können bei {next} weiterlesen.",
    continueLabel: "Gestrigen Text fortsetzen",
    chooseNewLabel: "Neuen Bibeltext auswählen",
  },
  en: {
    title: "Continue from yesterday’s passage?",
    description: "Yesterday you reflected on {previous}.",
    next: "You can continue from {next}.",
    continueLabel: "Continue yesterday’s passage",
    chooseNewLabel: "Choose a new passage",
  },
  fr: {
    title: "Continuer le passage d’hier ?",
    description: "Hier, vous avez médité sur {previous}.",
    next: "Vous pouvez continuer à partir de {next}.",
    continueLabel: "Continuer le passage d’hier",
    chooseNewLabel: "Choisir un nouveau passage",
  },
  es: {
    title: "¿Continuar con el pasaje de ayer?",
    description: "Ayer meditaste en {previous}.",
    next: "Puedes continuar desde {next}.",
    continueLabel: "Continuar el pasaje de ayer",
    chooseNewLabel: "Elegir un pasaje nuevo",
  },
};

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export default function QTFreePassageChoice({
  lang,
  previousReference,
  nextReference,
  onContinue,
  onChooseNew,
}: {
  lang: Lang;
  previousReference: string;
  nextReference: string;
  onContinue: () => void;
  onChooseNew: () => void;
}) {
  const copy = TEXT[lang] ?? TEXT.ko;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qt-free-passage-choice-title"
      aria-describedby="qt-free-passage-choice-description qt-free-passage-choice-next"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "var(--overlay-sheet)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="roots-elevation-sheet"
        style={{
          width: "100%",
          maxWidth: 430,
          background: "var(--qt-sheet-surface)",
          border: "1px solid var(--qt-option-border)",
          borderRadius: 24,
          padding: "26px 22px 22px",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            margin: "0 auto 16px",
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--qt-sage-text)",
            background: "var(--qt-sage-surface)",
            border: "1px solid var(--qt-sage-border)",
          }}
        >
          <BookOpen size={25} />
        </div>

        <h2
          id="qt-free-passage-choice-title"
          style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}
        >
          {copy.title}
        </h2>
        <p id="qt-free-passage-choice-description" style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, marginBottom: 4 }}>
          {fill(copy.description, { previous: previousReference })}
        </p>
        <p id="qt-free-passage-choice-next" style={{ fontSize: 12, color: "var(--text-muted-readable)", lineHeight: 1.6, marginBottom: 22 }}>
          {fill(copy.next, { next: nextReference })}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            type="button"
            className="btn-sage"
            onClick={onContinue}
            autoFocus
            style={{ minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {copy.continueLabel}<ChevronRight size={17} />
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={onChooseNew}
            style={{ minHeight: 48 }}
          >
            {copy.chooseNewLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
