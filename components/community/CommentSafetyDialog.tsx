"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Flag, EyeOff, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { limitQtCommentInput, type QtComment } from "@/lib/qtComments";
import { COMMENT_REPORT_REASONS, reportQtComment, setQtCommentHidden, type CommentReportReason, type CommentSafetyAction } from "@/lib/qtCommentSafety";
import { getQtCommentSafetyText } from "@/lib/qtCommentSafetyText";
import styles from "./CommentSafety.module.css";

export default function CommentSafetyDialog({ lang, comment, onClose, onChange }: {
  lang: Lang; comment: QtComment; onClose: () => void; onChange: (action: CommentSafetyAction) => void;
}) {
  const text = getQtCommentSafetyText(lang);
  const [phase, setPhase] = useState<"menu" | "hide" | "report" | "receipt">("menu");
  const [reason, setReason] = useState<CommentReportReason | "">("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [faith, setFaith] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;

  function close() { if (!busy.current) closeRef.current(); }
  useAndroidBackHandler(() => { close(); return true; });
  useEffect(() => {
    const previous = document.activeElement;
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); if (!busy.current) closeRef.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary') ?? [])
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown, true);
    return () => { document.removeEventListener("keydown", keydown, true); if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
  }, [phase]);

  async function act(event?: FormEvent) {
    event?.preventDefault();
    if (busy.current || (phase === "report" && (!reason || !faith))) return;
    busy.current = true; setPending(true); setError(false);
    try {
      if (phase === "report" && reason) {
        const id = await reportQtComment(createClient(), { commentId: comment.id, reason, details, name, email, goodFaith: faith, lang });
        setReceipt(id); setPhase("receipt"); onChange({ kind: "report", commentId: comment.id, authorId: comment.author_id });
      } else if (phase === "hide") {
        await setQtCommentHidden(createClient(), comment.id, true);
        onChange({ kind: "hide", commentId: comment.id, authorId: comment.author_id }); closeRef.current();
      }
    } catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  }

  const title = phase === "report" ? text.report : phase === "receipt" ? text.received : phase === "hide" ? text.hidePrompt : text.menu;
  return createPortal(<div className={`${styles.overlay}${phase === "menu" ? ` ${styles.menuOverlay}` : ""}`} onPointerDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={panel} tabIndex={-1} className={`${styles.panel}${phase === "menu" ? ` ${styles.menuPanel}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="qt-comment-safety-title">
      <div className={styles.header}><h2 id="qt-comment-safety-title" className={styles.title}>{title}</h2>
        {phase !== "menu" && <button type="button" className={styles.close} aria-label={text.close} disabled={pending} onClick={close}><X size={20} aria-hidden="true" /></button>}
      </div>
      {phase === "menu" && <>
        <div className={styles.menu}>
          <button type="button" className={`${styles.button} ${styles.danger}`} onClick={() => setPhase("report")}><Flag size={17} aria-hidden="true" />{text.report}</button>
          <button type="button" className={styles.button} onClick={() => setPhase("hide")}><EyeOff size={17} aria-hidden="true" />{text.hide}</button>
        </div>
        <button type="button" className={`btn-outline ${styles.menuCancel}`} onClick={close}>{text.cancel}</button>
      </>}
      {phase === "hide" && <>
        <p className={styles.copy}>{text.hideInfo}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} disabled={pending} onClick={() => { setPhase("menu"); setError(false); }}>{text.cancel}</button>
          <button type="button" className={`${styles.button} ${styles.primary}`} disabled={pending} onClick={() => void act()}>{pending ? text.saving : text.hide}</button>
        </div>
      </>}
      {phase === "report" && <form onSubmit={event => void act(event)}>
        <p className={styles.copy}>{text.reportInfo}</p>
        <label className={styles.label}>{text.reason}<select required value={reason} disabled={pending} className={styles.field} onChange={event => setReason(event.target.value as CommentReportReason | "")}>
          <option value="" disabled>{text.choose}</option>{COMMENT_REPORT_REASONS.map(value => <option key={value} value={value}>{text.reasons[value]}</option>)}
        </select></label>
        <label className={styles.label}>{text.details}<textarea rows={3} className={styles.field} value={details} maxLength={2000} disabled={pending} onChange={event => setDetails(limitQtCommentInput(event.target.value, 1000))} /></label>
        <details><summary className={styles.copy}>{text.contact}</summary>
          <label className={styles.label}>{text.name}<input className={styles.field} autoComplete="name" value={name} maxLength={100} disabled={pending} onChange={event => setName(event.target.value)} /></label>
          <label className={styles.label}>{text.email}<input className={styles.field} type="email" autoComplete="email" value={email} maxLength={254} disabled={pending} onChange={event => setEmail(event.target.value)} /></label>
        </details>
        <label className={styles.faith}><input type="checkbox" required checked={faith} disabled={pending} onChange={event => setFaith(event.target.checked)} /><span>{text.faith}</span></label>
        <div className={styles.actions}>
          <button type="button" className={styles.button} disabled={pending} onClick={() => { setPhase("menu"); setError(false); }}>{text.cancel}</button>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={pending || !reason || !faith}>{pending ? text.saving : text.report}</button>
        </div>
      </form>}
      {phase === "receipt" && <>
        <p className={styles.copy}>{text.receiptInfo}</p><p className={styles.meta}>{text.receipt}: {receipt}</p>
        <div className={styles.actions}>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={close}>{text.confirm}</button></div>
      </>}
      {error && <p role="alert" className={styles.error}>{text.error}</p>}
    </div>
  </div>, document.body);
}
