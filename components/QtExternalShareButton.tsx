"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { copyText } from "@/lib/nativeShare";
import { formatQtPhotoShareText, isQtPhotoRecord, prepareQtPhotoFile, shareQtRecord, type QtShareRecord, type QtShareResult } from "@/lib/qtShare";
import type { Lang } from "@/lib/i18n";

const COPY = {
  ko: { share: "공유하기", preparing: "사진을 준비하고 있어요.", prepareFailed: "사진을 준비하지 못했어요. 공유하기를 눌러 다시 시도해주세요.", copied: "묵상을 복사했어요. 원하는 앱에 붙여넣어주세요.", downloadedCopied: "사진 다운로드를 시작하고 메모를 복사했어요. 원하는 앱에 사진을 첨부하고 붙여넣어주세요.", downloaded: "사진 다운로드를 시작했어요. 원하는 앱에서 첨부해주세요.", failed: "공유창을 열지 못했어요. 다시 시도해주세요.", update: "이 앱 버전에서는 사진을 첨부할 수 없어요. 앱을 업데이트하거나 웹에서 공유해주세요.", caption: "메모가 함께 전달되지 않았다면 복사해 붙여넣어주세요.", copyMemo: "메모 복사", memoCopied: "메모를 복사했어요.", copyFailed: "복사하지 못했어요. 다시 시도해주세요." },
  en: { share: "Share", preparing: "Preparing photo…", prepareFailed: "The photo could not be prepared. Tap Share to try again.", copied: "Reflection copied. Paste it into your preferred app.", downloadedCopied: "Photo download started and memo copied. Attach the photo and paste the memo in your preferred app.", downloaded: "Photo download started. Attach it in your preferred app.", failed: "The share sheet could not be opened. Please try again.", update: "This app version cannot attach photos. Update the app or share from the website.", caption: "If the memo was not included, copy and paste it.", copyMemo: "Copy memo", memoCopied: "Memo copied.", copyFailed: "Could not copy. Please try again." },
  de: { share: "Teilen", preparing: "Foto wird vorbereitet…", prepareFailed: "Das Foto konnte nicht vorbereitet werden. Tippe zum erneuten Versuch auf Teilen.", copied: "Stille Zeit kopiert. Füge sie in der gewünschten App ein.", downloadedCopied: "Foto-Download gestartet und Notiz kopiert. Hänge das Foto in der gewünschten App an und füge die Notiz ein.", downloaded: "Foto-Download gestartet. Hänge es in der gewünschten App an.", failed: "Das Teilen-Menü konnte nicht geöffnet werden. Bitte versuche es erneut.", update: "Diese App-Version kann keine Fotos anhängen. Aktualisiere die App oder teile über die Webseite.", caption: "Falls die Notiz fehlt, kopiere sie und füge sie ein.", copyMemo: "Notiz kopieren", memoCopied: "Notiz kopiert.", copyFailed: "Kopieren fehlgeschlagen. Bitte versuche es erneut." },
  fr: { share: "Partager", preparing: "Préparation de la photo…", prepareFailed: "La photo n’a pas pu être préparée. Appuyez sur Partager pour réessayer.", copied: "Méditation copiée. Collez-la dans l’application de votre choix.", downloadedCopied: "Téléchargement de la photo lancé et note copiée. Joignez la photo et collez la note dans l’application de votre choix.", downloaded: "Téléchargement de la photo lancé. Joignez-la dans l’application de votre choix.", failed: "Le menu de partage n’a pas pu s’ouvrir. Veuillez réessayer.", update: "Cette version ne permet pas de joindre des photos. Mettez l’application à jour ou partagez depuis le site.", caption: "Si la note n’a pas été incluse, copiez-la et collez-la.", copyMemo: "Copier la note", memoCopied: "Note copiée.", copyFailed: "La copie a échoué. Veuillez réessayer." },
  es: { share: "Compartir", preparing: "Preparando la foto…", prepareFailed: "No se pudo preparar la foto. Pulsa Compartir para volver a intentarlo.", copied: "Meditación copiada. Pégala en la aplicación que prefieras.", downloadedCopied: "Se inició la descarga de la foto y se copió la nota. Adjunta la foto y pega la nota en la aplicación que prefieras.", downloaded: "Se inició la descarga de la foto. Adjúntala en la aplicación que prefieras.", failed: "No se pudo abrir el menú para compartir. Inténtalo de nuevo.", update: "Esta versión no permite adjuntar fotos. Actualiza la aplicación o comparte desde la web.", caption: "Si no se incluyó la nota, cópiala y pégala.", copyMemo: "Copiar nota", memoCopied: "Nota copiada.", copyFailed: "No se pudo copiar. Inténtalo de nuevo." },
} satisfies Record<Lang, Record<string, string>>;

type Props = { record: QtShareRecord; lang: Lang; photoUrl?: string | null; style?: CSSProperties; disabled?: boolean };

/** Both logos describe example share targets. One button opens the OS chooser. */
export default function QtExternalShareButton({ record, lang, photoUrl, style, disabled = false }: Props) {
  const labels = COPY[lang];
  const isPhoto = isQtPhotoRecord(record);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(isPhoto);
  const [photoError, setPhotoError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [result, setResult] = useState<QtShareResult | "memo-copied" | "copy-failed" | null>(null);
  const busyRef = useRef(false);
  const fileRef = useRef<{ key: string; file: File } | null>(null);
  const photoPath = record.photo_path;
  const date = record.date;
  const photoKey = JSON.stringify([record.id, date, photoPath, photoUrl, lang]);

  useEffect(() => {
    const abort = new AbortController();
    fileRef.current = null;
    setPhotoFile(null); setPhotoError(false); setResult(null);
    setPreparing(isPhoto);
    if (!isPhoto) return () => abort.abort();
    async function prepare() {
      async function signedPhoto() {
        if (!photoPath) throw new Error("QT_PHOTO_UNAVAILABLE");
        const { data, error } = await createClient().storage.from("qt-photos").createSignedUrl(photoPath, 60 * 60);
        if (error || !data?.signedUrl) throw new Error("QT_PHOTO_UNAVAILABLE");
        return prepareQtPhotoFile(data.signedUrl, date, lang, abort.signal);
      }
      try {
        let file: File;
        if (photoUrl) {
          try { file = await prepareQtPhotoFile(photoUrl, date, lang, abort.signal); }
          catch (error) { if (abort.signal.aborted) throw error; file = await signedPhoto(); }
        } else file = await signedPhoto();
        if (!abort.signal.aborted) { fileRef.current = { key: photoKey, file }; setPhotoFile(file); }
      } catch {
        if (!abort.signal.aborted) setPhotoError(true);
      } finally {
        if (!abort.signal.aborted) setPreparing(false);
      }
    }
    void prepare();
    return () => abort.abort();
  }, [isPhoto, date, photoPath, photoUrl, lang, photoKey, retry]);

  async function share() {
    if (disabled || busyRef.current || preparing) return;
    if (isPhoto && fileRef.current?.key !== photoKey) { setRetry((value) => value + 1); return; }
    busyRef.current = true; setSharing(true); setResult(null);
    try {
      const outcome = await shareQtRecord({ record, lang, photoFile: fileRef.current?.file });
      setResult(outcome === "cancelled" ? null : outcome);
    } catch { setResult("failed"); }
    finally { busyRef.current = false; setSharing(false); }
  }

  const hasMemo = isPhoto && !!(record.photo_caption || record.meditation)?.trim();
  const message = photoError ? labels.prepareFailed
    : preparing ? labels.preparing
    : result === "copied" ? labels.copied
    : result === "photo-downloaded-and-copied" ? labels.downloadedCopied
    : result === "photo-downloaded" ? labels.downloaded
    : result === "native-update-required" ? labels.update
    : result === "failed" ? labels.failed
    : result === "memo-copied" ? labels.memoCopied
    : result === "copy-failed" ? labels.copyFailed
    : result === "shared" && hasMemo ? labels.caption : null;

  return <div style={{ width: "100%", ...style }}>
    <button type="button" className="btn-outline" onClick={() => void share()} disabled={disabled || preparing || sharing}
      style={{ width: "100%", minHeight: 44, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, whiteSpace: "normal" }}>
      {(preparing || sharing) ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {/* Original official resource files, scaled without recoloring/cropping. */}
        <img src="/share/kakaotalk.svg" alt="" width={24} height={24} style={{ objectFit: "contain", display: "block" }} />
        <img src="/share/whatsapp.svg" alt="" width={24} height={24} style={{ objectFit: "contain", display: "block" }} />
      </span>}
      <span>{labels.share}</span>
    </button>
    {message && <p role="status" aria-live="polite" style={{ margin: "8px 0 0", color: "var(--text2)", fontSize: 12, lineHeight: 1.55, overflowWrap: "anywhere" }}>{message}</p>}
    {hasMemo && photoFile && (result === "shared" || result === "photo-downloaded" || result === "copy-failed") && <button type="button" className="btn-text"
      onClick={async () => setResult(await copyText(formatQtPhotoShareText(record, lang)) ? "memo-copied" : "copy-failed")}
      style={{ marginTop: 4, padding: "6px 8px", minHeight: 44, fontSize: 12, color: "var(--sage)", background: "transparent", border: 0, cursor: "pointer" }}>{labels.copyMemo}</button>}
  </div>;
}
