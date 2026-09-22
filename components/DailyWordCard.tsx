"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, Loader2, Share2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getBibleCopyrightInfo } from "@/lib/bibleCopyright";
import { getLocalDateString } from "@/lib/date";
import { getWordCardText } from "@/lib/wordCardText";
import { createWordCardImage } from "@/lib/wordCardImage";
import { hasNativeWordCardExport, saveWordCardImage, shareWordCardImage, wordCardExportErrorCode } from "@/lib/wordCardNativeExport";
import { TodayWordCard } from "./WordCard";
import WordCardBurst from "./WordCardBurst";
import styles from "./WordCards.module.css";

type Props = { lang: Lang; verse: string; reference: string; translationId: number | null;
  variant?: "page" | "popup"; cardRef?: RefObject<HTMLDivElement>; onClose?: () => void; celebrate?: boolean;
};

export default function DailyWordCard({ lang, verse, reference, translationId, variant = "page", cardRef, onClose, celebrate = false }: Props) {
  const text = getWordCardText(lang);
  const contentKey = JSON.stringify([lang, verse, reference, translationId, text.todayTitle]);
  const [prepared, setPrepared] = useState<{ key: string; file: File } | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [notice, setNotice] = useState("");
  const [needsAppUpdate, setNeedsAppUpdate] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(false);
  const latestKey = useRef(contentKey);
  latestKey.current = contentKey;
  const file = prepared?.key === contentKey ? prepared.file : null;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    setPrepared(null); setImageFailed(false); setNotice("");
    const missingBridge = Capacitor.isNativePlatform() && !hasNativeWordCardExport();
    setNeedsAppUpdate(missingBridge);
    if (missingBridge) return () => { cancelled = true; };
    const copyright = translationId ? getBibleCopyrightInfo(translationId) : null;
    createWordCardImage({ title: text.todayTitle, verse, reference, copyright: copyright?.notice ?? "", attributionUrl: copyright?.url })
      .then(blob => {
        if (cancelled) return;
        setPrepared({ key: contentKey, file: new File([blob], `Christian-Roots-${getLocalDateString()}-${lang}.png`, { type: "image/png" }) });
      }).catch(() => { if (!cancelled) setImageFailed(true); });
    return () => { cancelled = true; };
  }, [contentKey, lang, verse, reference, translationId, retryNonce, text.todayTitle]);

  async function runExport(action: "save" | "share") {
    if (busyRef.current) return;
    if (needsAppUpdate) { setNotice(text.nativeImageHelp); return; }
    if (!file) return;
    busyRef.current = true; setBusy(action); setNotice("");
    const key = contentKey;
    const showNotice = (value: string) => { if (mounted.current && latestKey.current === key) setNotice(value); };
    try {
      if (action === "save") {
        const result = await saveWordCardImage(file);
        if (result !== "cancelled") showNotice(result === "photos" ? text.savedPhotos : result === "files" ? text.savedFiles : text.downloadStarted);
      } else {
        // Prepared image; the web share path invokes navigator.share on this tap.
        await shareWordCardImage(file, text.todayTitle);
      }
    } catch (error) {
      const code = wordCardExportErrorCode(error);
      if (code !== "CANCELLED") showNotice(code === "NATIVE_UPDATE_REQUIRED" ? text.nativeImageHelp
        : code === "PHOTO_PERMISSION_DENIED" ? text.photoPermissionHelp
        : code === "SHARE_UNAVAILABLE" ? text.imageShareUnavailable
        : action === "save" ? text.saveError : text.shareError);
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  const preparing = !file && !imageFailed && !needsAppUpdate;
  const actions = <>
    <div className={styles.exportActions}>
      <button type="button" className={styles.action} disabled={preparing || imageFailed || Boolean(busy) || needsAppUpdate} onClick={() => void runExport("save")}>
        {preparing || busy === "save" ? <Loader2 size={17} className="spin" aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}<span>{text.save}</span>
      </button>
      <button type="button" className={`${styles.action} ${styles.secondaryAction}`} disabled={preparing || imageFailed || Boolean(busy) || needsAppUpdate} onClick={() => void runExport("share")}>
        {busy === "share" ? <Loader2 size={17} className="spin" aria-hidden="true" /> : <Share2 size={17} aria-hidden="true" />}<span>{text.share}</span>
      </button>
    </div>
    {(preparing || imageFailed || needsAppUpdate || notice || busy === "save") && <div className={styles.exportNotice} role="status">
      {notice || (needsAppUpdate ? text.nativeImageHelp : imageFailed ? text.imageError : busy === "save" ? text.savingImage : text.preparingImage)}
      {imageFailed && <button type="button" className={styles.exportRetry} onClick={() => setRetryNonce(value => value + 1)}>{text.retry}</button>}
    </div>}
  </>;
  if (variant === "popup") return <TodayWordCard lang={lang} verse={verse} reference={reference} translationId={translationId}
    variant="popup" cardRef={cardRef} onClose={onClose} footer={actions} celebration={celebrate ? <WordCardBurst /> : undefined} />;
  return <div className={styles.todayWrap} lang={lang}>
    <TodayWordCard lang={lang} verse={verse} reference={reference} translationId={translationId}
      cardRef={cardRef} celebration={celebrate ? <WordCardBurst /> : undefined} />
    {actions}
  </div>;
}
