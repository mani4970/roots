"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { t, type Lang } from "@/lib/i18n";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { usePrayerModalViewport } from "@/lib/usePrayerModalViewport";
import { savePrayerTestimony, type PrayerTestimonyTarget, type PrayerTestimonyAttempt } from "@/lib/savePrayerTestimony";
import PrayerTestimonyForm from "./PrayerTestimonyForm";

type Props = {
  prayer: PrayerTestimonyTarget;
  userId: string;
  lang: Lang;
  onClose: () => void;
  onSaved: () => void;
  onAwarded: (keys: readonly string[], owner: string) => void;
  savingRef: MutableRefObject<boolean>;
};

export default function CommunityPrayerTestimonyDialog({ prayer, userId, lang, onClose, onSaved, onAwarded, savingRef }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const retry = useRef<PrayerTestimonyAttempt | undefined>(undefined);
  const overlay = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const closing = useRef(false);
  const callbacks = useRef({ onClose, onSaved, onAwarded });
  callbacks.current = { onClose, onSaved, onAwarded };

  function close() {
    if (savingRef.current || closing.current) return;
    closing.current = true;
    callbacks.current.onClose();
  }

  usePrayerModalViewport(overlay, true);
  useAndroidBackHandler(() => { close(); return true; });
  useEffect(() => {
    mounted.current = true;
    const dialog = overlay.current;
    const previousFocus = document.activeElement;
    dialog?.focus({ preventScroll: true });
    function handleKey(event: KeyboardEvent) {
      if (event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === "Tab" && dialog) {
        const fields = dialog.querySelectorAll<HTMLElement>("textarea, button:not(:disabled)");
        const first = fields[0];
        const last = fields[fields.length - 1];
        const focus = document.activeElement;
        const outside = focus === dialog || !dialog.contains(focus);
        if (event.shiftKey && (outside || focus === first)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (outside || focus === last)) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      mounted.current = false;
      savingRef.current = false;
      document.removeEventListener("keydown", handleKey);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [savingRef]);

  async function save() {
    if (!text.trim() || savingRef.current || closing.current) return;
    savingRef.current = true;
    setSaving(true);
    setFailed(false);
    try {
      const result = await savePrayerTestimony({ prayer, testimony: text, userId, source: "prayer_popup", previousAttempt: retry.current });
      if (!mounted.current) return;
      retry.current = result.attempt;
      if (!result.ok) {
        setFailed(true);
        return;
      }
      savingRef.current = false;
      closing.current = true;
      try {
        if (result.awardedBadges.length) callbacks.current.onAwarded(result.awardedBadges, userId);
      } finally {
        callbacks.current.onSaved();
      }
    } catch (error) {
      console.warn("기도 응답 처리 중 오류가 발생했어요:", error);
      if (mounted.current && !closing.current) setFailed(true);
    } finally {
      if (mounted.current) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  return createPortal(
    <PrayerTestimonyForm lang={lang} text={text} onTextChange={setText} saving={saving}
      onCancel={close} onSave={save} error={failed ? t("prayer_error_answered", lang) : undefined}
      overlayRef={overlay} dismissOnBackdrop />,
    document.body,
  );
}
