import type { ReactNode, RefObject } from "react";
import { ArrowRight, BookOpen, ChevronDown, History, Loader2, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getBibleCopyrightInfo } from "@/lib/bibleCopyright";
import { getWordCardText, getRecallDescription } from "@/lib/wordCardText";
import { canShowRecallWord, getRecallMode, isDisplayableRecall, getRecallDecisionItems, type HeldWordBlock, type RecallRecord } from "@/lib/wordCardRecord";
import styles from "./WordCards.module.css";

/** Only the signature and X stay at the top. Headings travel with their text. */
export function WordCardBrandRow({ closeButton }: { closeButton?: ReactNode }) {
  return <div className={styles.brandRow}>
    <img className={styles.brand} src="/word-card-signature.svg" alt="Christian Roots" width={113} height={30} draggable={false} />
    {closeButton}
  </div>;
}

export function WordCardHeading({ lang, kind, description }: {
  lang: Lang; kind: "today" | "recall"; description?: string;
}) {
  const text = getWordCardText(lang);
  return <header className={styles.contentHeading}>
    <h2 id={kind === "recall" ? "roots-recall-title" : "roots-today-word-title"} className={`${styles.title} ${kind === "today" ? styles.todayTitle : ""}`}>
      {kind === "today" ? text.todayTitle : text.recall}
    </h2>
    {description && <p className={styles.description}>{description}</p>}
  </header>;
}

/** Kept for the today-card loading/error shell, not for the ready card layout. */
export function WordCardHeader({ lang, kind, description, closeButton }: {
  lang: Lang; kind: "today" | "recall"; description?: string; closeButton?: ReactNode;
}) {
  return <div className={styles.header}>
    <WordCardBrandRow closeButton={closeButton} />
    <WordCardHeading lang={lang} kind={kind} description={description} />
  </div>;
}

export function WordCardCopyright({ translationId }: { translationId: number | null }) {
  const info = translationId ? getBibleCopyrightInfo(translationId) : null;
  if (!info) return null;
  return <p className={styles.copyright}>
    {info.notice}
    {info.url && <> <a href={info.url} target="_blank" rel="noreferrer noopener">{info.linkLabel ?? info.url}</a></>}
  </p>;
}

export function TodayWordCard({ lang, verse, reference, translationId, variant = "page", cardRef, onClose, footer, celebration }: {
  lang: Lang; verse: string; reference: string; translationId: number | null;
  variant?: "page" | "popup"; cardRef?: RefObject<HTMLDivElement>; onClose?: () => void; footer?: ReactNode; celebration?: ReactNode;
}) {
  const popup = variant === "popup";
  return <div ref={cardRef} lang={lang} className={`${styles.card} ${popup ? styles.modalCard : styles.todayCard}`}
    role={popup ? "dialog" : undefined} aria-modal={popup ? true : undefined} aria-labelledby="roots-today-word-title"
    tabIndex={popup ? -1 : undefined} data-word-card="today">
    <WordCardBrandRow closeButton={onClose && <button type="button" className={styles.close}
      onClick={onClose} aria-label={getWordCardText(lang).close}><X size={20} /></button>} />
    <div className={styles.scrollBody} tabIndex={0} role="region" aria-label={getWordCardText(lang).todayTitle} data-today-word-scroll>
      <div className={styles.bodyContent} data-word-card-content>
        <WordCardHeading lang={lang} kind="today" />
        <p className={`${styles.verse} ${verse.length > 180 ? styles.longText : ""}`}>{verse}</p>
        <p className={`${styles.reference} ${styles.todayReference}`}>{reference}</p>
      </div>
      <WordCardCopyright translationId={translationId} />
    </div>
    {footer && <footer className={`${styles.footer} ${styles.modalFooter}`}>{footer}</footer>}
    {celebration}
  </div>;
}

export function RecallWordCardContent({ lang, record, blocks, sourceNote, sourceContext, photo }: {
  lang: Lang; record: RecallRecord; blocks: HeldWordBlock[]; sourceNote?: string; sourceContext?: string; photo?: ReactNode;
}) {
  const text = getWordCardText(lang);
  const mode = getRecallMode(record);
  if (mode === "photo") return <>{photo}</>;
  const hasKeyVerse = canShowRecallWord(record);
  const decisions = getRecallDecisionItems(record.decision);
  const hasDecision = decisions.length > 0;
  return <>
    {hasKeyVerse && blocks.map((block, index) => <div key={index} className={styles.verseBlock}>
      {block.reference && <p className={styles.reference}>{block.reference}</p>}
      <p className={`${styles.verse} ${styles.recallVerse} ${block.text.length > 180 ? styles.recallLongText : ""}`}>{block.text}</p>
    </div>)}
    {hasKeyVerse && sourceContext && <p className={styles.sourceNote}>{text.passage}: {sourceContext}</p>}
    {hasKeyVerse && sourceNote && <p className={styles.sourceNote} role="status">{sourceNote}</p>}
    {hasDecision && <>
      {hasKeyVerse && <hr className={styles.rule} />}
      <h3 className={styles.decisionTitle}>{text.decision}</h3>
      <ol className={styles.decisionList} data-recall-decisions>
        {decisions.map((decision, index) => <li key={index} className={styles.decision}>{decision}</li>)}
      </ol>
    </>}
    <hr className={styles.rule} />
    <p className={styles.encouragement}>{text.encouragement}</p>
  </>;
}

export function WordCardHomeActions({ lang, status, open, received = false, todayOpen = false, onReceive, onRecall }: {
  lang: Lang; status: "loading" | "ready" | "empty" | "error"; open: boolean;
  received?: boolean; todayOpen?: boolean; onReceive: () => void; onRecall: () => void;
}) {
  const text = getWordCardText(lang);
  // Keep both places stable for missing records, loading and errors alike.
  return <div lang={lang} className={styles.homeButtons} data-word-card-buttons>
    <button type="button" className={styles.homeButton} onClick={onReceive}
      aria-haspopup={received ? "dialog" : undefined} aria-expanded={received ? todayOpen : undefined}>
      <BookOpen className={styles.buttonIcon} size={19} strokeWidth={1.6} aria-hidden="true" />
      <span className={styles.buttonLabel}>{received ? text.received : text.receive}</span>
    </button>
    <button type="button" className={styles.homeButton}
      aria-haspopup="dialog" aria-expanded={open} onClick={onRecall}>
      <History className={styles.buttonIcon} size={19} strokeWidth={1.6} aria-hidden="true" />
      <span className={styles.buttonLabel}>{text.recall}</span>
    </button>
  </div>;
}

export function RecallWordCardView({ lang, date, today, record, status, blocks, sourceNote, sourceContext, photo, cardRef, scrollRef, showScrollHint = false, onClose, onRetry, onView }: {
  lang: Lang; date: string; today: string; record: RecallRecord | null;
  status: "loading" | "ready" | "missing" | "error"; blocks: HeldWordBlock[];
  sourceNote?: string; sourceContext?: string; photo?: ReactNode; cardRef?: RefObject<HTMLDivElement>;
  scrollRef?: RefObject<HTMLDivElement>; showScrollHint?: boolean;
  onClose: () => void; onRetry: () => void; onView: () => void;
}) {
  const text = getWordCardText(lang);
  // Loading is deliberately neutral: show only a spinner until the final
  // record/source state is ready, so no temporary sentence flashes as content.
  if (status === "loading") {
    return <div ref={cardRef} lang={lang} className={`${styles.card} ${styles.loadingCard}`} tabIndex={-1}
      role="dialog" aria-modal="true" aria-label={text.loading} data-word-card-notice="loading">
      <div className={styles.loadingOnly} role="status" aria-label={text.loading}>
        <Loader2 size={24} className="spin" aria-hidden="true" />
      </div>
    </div>;
  }

  // A compact notice, not a 610px Scripture card. Keep fetch failures distinct
  // from a genuinely missing record, and don't call an existing blank record missing.
  if (status !== "ready" || !isDisplayableRecall(record)) {
    const missing = status === "missing" || (status === "ready" && !isDisplayableRecall(record));
    const existing = missing && record && record.is_draft !== true ? record : null;
    const mode = existing ? getRecallMode(existing) : null;
    const missingText = mode === "sunday" || mode === "free" ? text.missingDecision
      : mode === "unknown" ? text.recordAvailable : text.missing;
    return <div ref={cardRef} lang={lang} className={`${styles.card} ${styles.noticeCard}`} tabIndex={-1}
      role="dialog" aria-modal="true" aria-label={text.recall} aria-describedby="roots-recall-notice"
      data-word-card-notice={status}>
      {existing && <div className={styles.noticeCloseRow}>
        <button type="button" className={styles.close} onClick={onClose} aria-label={text.close}><X size={20} /></button>
      </div>}
      <div id="roots-recall-notice" className={styles.noticeBody} role={status === "error" ? "alert" : "status"}>
        <p>{status === "error" ? text.loadError : existing ? missingText : text.emptyTitle}</p>
        {missing && !existing && <p>{text.emptyHint}</p>}
      </div>
      <footer className={styles.noticeFooter}>
        {status === "error" && <button type="button" className={styles.action} onClick={onRetry}>{text.retry}</button>}
        {existing ? <button type="button" className={styles.action} onClick={onView}>
          <span>{text.viewRecord}</span><ArrowRight size={17} aria-hidden="true" />
        </button> : <button type="button" className={`${styles.action} ${status === "error" ? styles.secondaryAction : ""}`} onClick={onClose}>
          {missing ? text.confirm : text.close}
        </button>}
      </footer>
    </div>;
  }
  const mode = getRecallMode(record);
  const hasWord = canShowRecallWord(record);
  const descriptionContent = mode === "photo" ? "photo" : hasWord
    ? (record.decision?.trim() ? "wordAndDecision" : "word") : "decision";
  return <div ref={cardRef} lang={lang} className={`${styles.card} ${styles.modalCard}`} tabIndex={-1}
    role="dialog" aria-modal="true" aria-labelledby="roots-recall-title" data-word-card="recall">
    <WordCardBrandRow closeButton={<button type="button" className={styles.close} onClick={onClose} aria-label={text.close}><X size={20} /></button>} />
    <div className={styles.recallScrollFrame}>
      <div ref={scrollRef} className={styles.scrollBody} tabIndex={0} role="region" aria-label={text.scrollLabel} data-recall-scroll>
        <div className={styles.bodyContent} data-word-card-content>
          <WordCardHeading lang={lang} kind="recall" description={getRecallDescription(date, lang, today, descriptionContent)} />
          <RecallWordCardContent lang={lang} record={record} blocks={blocks} sourceNote={sourceNote} sourceContext={sourceContext} photo={photo} />
        </div>
        {hasWord && <WordCardCopyright translationId={Number(record.bible_version) || null} />}
      </div>
      {showScrollHint && <div className={styles.scrollHint} aria-hidden="true" data-recall-scroll-hint>
        <ChevronDown size={18} strokeWidth={1.8} />
      </div>}
    </div>
    <footer className={styles.footer}>
      <button type="button" className={styles.action} onClick={onView}>
        <span>{text.viewRecord}</span><ArrowRight size={17} aria-hidden="true" />
      </button>
    </footer>
  </div>;
}

export { getRecallDescription };
