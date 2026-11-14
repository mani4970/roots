"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getDateLocale, getLocalDateString, parseLocalDateString } from "@/lib/date";
import { useChallengeLocalDate } from "@/lib/useChallengeLocalDate";
import {
  deleteGratitudeEntry, getGratitudeEntry, listGratitudeEntries, saveGratitudeEntry,
  MAX_GRATITUDE_ITEMS, MAX_GRATITUDE_ITEM_LENGTH, type GratitudeEntry,
} from "@/lib/gratitude";
import {
  listGratitudeDrafts, readGratitudeDraft, removeGratitudeDraft, writeGratitudeDraft,
  type GratitudeDraft,
} from "@/lib/gratitudeDraft";
import { getGratitudeText } from "@/lib/gratitudeText";
import HomeHubDialog from "./HomeHubDialog";
import styles from "./HomeGratitudeDialog.module.css";

type Props = { open: boolean; userId: string; lang: Lang; onClose: () => void };
const PAGE_SIZE = 20;

function readableDate(date: string, lang: Lang) {
  return new Intl.DateTimeFormat(getDateLocale(lang), { year: "numeric", month: "long", day: "numeric" })
    .format(parseLocalDateString(date));
}

function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error ? String(error.code) : "";
}

function sameItems(left: string[], right: string[]) {
  return JSON.stringify(left.map(value => value.trim()).filter(Boolean))
    === JSON.stringify(right.map(value => value.trim()).filter(Boolean));
}

function sameVersion(left: GratitudeEntry | null, right: GratitudeEntry | null) {
  return left === null ? right === null : right !== null && left.id === right.id && left.revision === right.revision;
}

type EditorProps = {
  userId: string;
  date: string;
  lang: Lang;
  onBusyChange: (busy: boolean) => void;
  onSaved?: (entry: GratitudeEntry) => void;
  onCancel?: () => void;
};

function GratitudeEditor({ userId, date, lang, onBusyChange, onSaved, onCancel }: EditorProps) {
  const text = getGratitudeText(lang);
  const [items, setItems] = useState<string[]>([""]);
  const [base, setBase] = useState<GratitudeEntry | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"saved" | "loadError" | "saveError" | "authError" | "conflict" | "">("");
  const [conflict, setConflict] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const inputRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const focusRowRef = useRef<number | null>(null);
  const draftRef = useRef<GratitudeDraft | null>(null);
  const editedHereRef = useRef(false);
  const id = useId();

  const load = useCallback(async (discardDraft = false) => {
    const request = ++requestRef.current;
    const discardedSnapshot = discardDraft ? draftRef.current : null;
    setPhase("loading");
    setMessage("");
    try {
      const remote = await getGratitudeEntry(userId, date);
      if (!mountedRef.current || request !== requestRef.current) return;
      const draft = discardDraft ? null : readGratitudeDraft(userId, date);
      // A response can be lost after a successful write. Recognize its content
      // on reopen instead of trapping that already-saved draft in a conflict.
      const alreadySaved = !!draft && !!remote && sameItems(draft.items, remote.items);
      if (discardDraft) removeGratitudeDraft(userId, date, discardedSnapshot);
      else if (alreadySaved) removeGratitudeDraft(userId, date, draft);
      const activeDraft = alreadySaved ? null : draft;
      draftRef.current = activeDraft;
      editedHereRef.current = false;
      const hasConflict = !!activeDraft && !sameVersion(activeDraft.base, remote);
      setBase(activeDraft ? activeDraft.base : remote);
      setItems(activeDraft?.items.length ? activeDraft.items : remote?.items.length ? remote.items : [""]);
      setConflict(hasConflict);
      setMessage(hasConflict ? "conflict" : "");
      setConfirmReload(false);
      setPhase("ready");
    } catch (error) {
      if (!mountedRef.current || request !== requestRef.current) return;
      setPhase("error");
      setMessage(errorCode(error) === "auth" ? "authError" : "loadError");
    }
  }, [userId, date]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      // Preserve this editor's unsaved buffer when navigating away. Successful
      // saves and confirmed discards clear the ref, so cleanup cannot revive them.
      if (editedHereRef.current && draftRef.current && !busyRef.current) {
        writeGratitudeDraft(userId, draftRef.current);
      }
    };
  }, [load, userId]);

  useEffect(() => {
    onBusyChange(saving);
    return () => onBusyChange(false);
  }, [saving, onBusyChange]);

  useEffect(() => {
    const index = focusRowRef.current;
    if (index === null) return;
    focusRowRef.current = null;
    inputRefs.current[index]?.focus({ preventScroll: false });
  }, [items.length]);

  const changeItems = (next: string[]) => {
    setItems(next);
    if (!conflict) setMessage("");
    const isUnchanged = base ? sameItems(next, base.items) : next.every(value => !value.trim());
    if (isUnchanged && !conflict) {
      removeGratitudeDraft(userId, date, draftRef.current);
      draftRef.current = null;
      editedHereRef.current = false;
      return;
    }
    const draft = { date, items: next, base, savedAt: Date.now() };
    draftRef.current = draft;
    editedHereRef.current = true;
    const stored = writeGratitudeDraft(userId, draft);
    setStorageAvailable(stored);
  };

  const save = async () => {
    if (phase !== "ready" || busyRef.current || conflict || !items.some(value => value.trim())) return;
    busyRef.current = true;
    setSaving(true);
    setMessage("");
    // Retain input before starting any remote mutation, including timed-out saves.
    const savingDraft = { date, items, base, savedAt: Date.now() };
    draftRef.current = savingDraft;
    editedHereRef.current = true;
    setStorageAvailable(writeGratitudeDraft(userId, savingDraft));
    try {
      const saved = await saveGratitudeEntry(userId, date, items, base);
      removeGratitudeDraft(userId, date, savingDraft);
      draftRef.current = null;
      editedHereRef.current = false;
      if (!mountedRef.current) return;
      setBase(saved);
      setItems(saved.items);
      setMessage("saved");
      setStorageAvailable(true);
      onSaved?.(saved);
    } catch (error) {
      if (!mountedRef.current) return;
      const code = errorCode(error);
      setConflict(code === "conflict");
      setMessage(code === "conflict" ? "conflict" : code === "auth" ? "authError" : "saveError");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  };

  return <div className={styles.editor} data-gratitude-editor={date} aria-busy={phase === "loading" || saving}>
    <time className={styles.date} dateTime={date}>{readableDate(date, lang)}</time>
    {phase === "loading" ? <p role="status" className={styles.notice}>{text.loading}</p> : phase === "error" ? <>
      <p role="alert" className={styles.error}>{text[message === "authError" ? "authError" : "loadError"]}</p>
      <button type="button" className={styles.button} onClick={() => void load()}>{text.retry}</button>
    </> : <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className={styles.fields}>
        {items.map((value, index) => <div key={index} className={styles.row}>
          <label htmlFor={`${id}-${index}`} className={styles.srOnly}>{text.itemLabel(index + 1)}</label>
          <textarea id={`${id}-${index}`} ref={node => { inputRefs.current[index] = node; }}
            className={styles.input} value={value} rows={2} maxLength={MAX_GRATITUDE_ITEM_LENGTH}
            placeholder={text.placeholder} disabled={saving}
            onChange={event => changeItems(items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
          <button type="button" className={styles.remove} aria-label={text.removeItem(index + 1)}
            disabled={saving || (items.length === 1 && !value)}
            onClick={() => {
              focusRowRef.current = Math.max(0, index - 1);
              changeItems(items.length === 1 ? [""] : items.filter((_, itemIndex) => itemIndex !== index));
            }}><Trash2 size={17} aria-hidden="true" /></button>
        </div>)}
      </div>
      <button type="button" className={styles.add} disabled={saving || items.length >= MAX_GRATITUDE_ITEMS}
        onClick={() => { focusRowRef.current = items.length; changeItems([...items, ""]); }}>
        <Plus size={18} aria-hidden="true" />{text.addItem}
      </button>
      {items.length >= MAX_GRATITUDE_ITEMS && <p className={styles.notice}>{text.maxItems}</p>}
      {!storageAvailable && <p className={styles.notice} role="status">{text.storageUnavailable}</p>}
      {message && <p className={`${styles.notice} ${message === "saved" ? styles.success : styles.error}`}
        role={message === "saved" ? "status" : "alert"}>{text[message]}</p>}
      {conflict && <div className={styles.confirm}>
        {confirmReload ? <>
          <p className={styles.notice}>{text.discardConfirm}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => setConfirmReload(false)}>{text.cancel}</button>
            <button type="button" className={styles.button} onClick={() => void load(true)}>{text.reload}</button>
          </div>
        </> : <button type="button" className={styles.button} onClick={() => setConfirmReload(true)}>{text.reload}</button>}
      </div>}
      <button type="submit" className={`${styles.button} ${styles.primary}`}
        disabled={saving || conflict || !items.some(value => value.trim())}>{saving ? text.saving : text.save}</button>
    </form>}
    {onCancel && <div className={styles.actions}><button type="button" className={styles.button}
      disabled={saving} onClick={onCancel}>{text.close}</button></div>}
  </div>;
}

type HistoryProps = { userId: string; today: string; lang: Lang; onBusyChange: (busy: boolean) => void };

function GratitudeHistory({ userId, today, lang, onBusyChange }: HistoryProps) {
  const text = getGratitudeText(lang);
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [drafts, setDrafts] = useState<GratitudeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<"loadError" | "deleteError" | "authError" | "conflict" | "">("");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [deleteDate, setDeleteDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef(0);
  const mountedRef = useRef(false);
  const loadingRef = useRef(false);
  const busyRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const failedMoreRef = useRef(false);
  const editingDateRef = useRef(editingDate);
  editingDateRef.current = editingDate;

  const syncDrafts = useCallback(() => setDrafts(listGratitudeDrafts(userId).filter(draft => draft.date < today)), [userId, today]);
  const load = useCallback(async (more = false) => {
    if (loadingRef.current || busyRef.current || editingDateRef.current !== null) return;
    loadingRef.current = true;
    failedMoreRef.current = more;
    const request = ++requestRef.current;
    setLoading(true);
    setError("");
    syncDrafts();
    try {
      const rows = await listGratitudeEntries(userId, more && cursorRef.current ? cursorRef.current : today, PAGE_SIZE);
      if (!mountedRef.current || request !== requestRef.current) return;
      cursorRef.current = rows.length ? rows[rows.length - 1].entry_date : cursorRef.current;
      setEntries(previous => more ? [...previous, ...rows.filter(row => !previous.some(item => item.id === row.id))] : rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (reason) {
      if (!mountedRef.current || request !== requestRef.current) return;
      setError(errorCode(reason) === "auth" ? "authError" : "loadError");
    } finally {
      if (request === requestRef.current) {
        loadingRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    }
  }, [userId, today, syncDrafts]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => { mountedRef.current = false; requestRef.current += 1; loadingRef.current = false; };
  }, [load]);
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);

  const changeEditorBusy = useCallback((value: boolean) => { busyRef.current = value; setBusy(value); }, []);
  const closeEditor = () => {
    editingDateRef.current = null;
    setEditingDate(null);
    syncDrafts();
    void load();
  };

  const remove = async (date: string, entry?: GratitudeEntry, draft?: GratitudeDraft) => {
    if (busyRef.current || loadingRef.current || editingDateRef.current !== null) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (entry) await deleteGratitudeEntry(userId, entry);
      if (!mountedRef.current) return;
      removeGratitudeDraft(userId, date, draft ?? null);
      setEntries(previous => previous.filter(item => item.entry_date !== date));
      setDeleteDate(null);
      syncDrafts();
    } catch (reason) {
      if (!mountedRef.current) return;
      const code = errorCode(reason);
      setError(code === "conflict" ? "conflict" : code === "auth" ? "authError" : "deleteError");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const byDate = new Map<string, { entry?: GratitudeEntry; draft?: GratitudeDraft }>();
  entries.forEach(entry => byDate.set(entry.entry_date, { entry }));
  drafts.forEach(draft => byDate.set(draft.date, { ...byDate.get(draft.date), draft }));
  const cards = [...byDate].sort(([left], [right]) => right.localeCompare(left));

  return <div data-gratitude-history aria-busy={loading || busy}>
    {error && <div>
      <p className={styles.error} role="alert">{text[error]}</p>
      <button type="button" className={styles.button} disabled={loading || busy || editingDate !== null}
        onClick={() => { setDeleteDate(null); void load(error === "loadError" && failedMoreRef.current); }}>{text.retry}</button>
    </div>}
    {!loading && !error && cards.length === 0 && <p className={styles.empty}>{text.emptyHistory}</p>}
    <div className={styles.list}>
      {cards.map(([date, { entry, draft }]) => <article key={date} className={styles.card} data-gratitude-date={date}>
        {editingDate === date ? <GratitudeEditor key={date} userId={userId} date={date} lang={lang}
          onBusyChange={changeEditorBusy} onCancel={closeEditor} onSaved={saved => {
            setEntries(previous => [...previous.filter(item => item.entry_date !== saved.entry_date), saved]
              .sort((left, right) => right.entry_date.localeCompare(left.entry_date)));
            syncDrafts();
          }} /> : <>
          <div className={styles.cardHeader}>
            <time className={styles.date} dateTime={date}>{readableDate(date, lang)}</time>
            {draft && <span className={styles.draft}>{text.draftLabel}</span>}
          </div>
          <ul className={styles.items}>{(draft?.items ?? entry?.items ?? []).filter(value => value.trim())
            .map((item, index) => <li key={index}>{item}</li>)}</ul>
          <div className={styles.actions}>
            <button type="button" className={styles.button} disabled={busy || loading || editingDate !== null}
              onClick={() => { setDeleteDate(null); editingDateRef.current = date; setEditingDate(date); }}>{draft ? text.recoverDraft : text.edit}</button>
            <button type="button" className={`${styles.button} ${styles.danger}`} disabled={busy || loading || editingDate !== null}
              onClick={() => setDeleteDate(date)}>{entry ? text.delete : text.discardDraft}</button>
          </div>
          {deleteDate === date && <div className={styles.confirm}>
            <p className={styles.notice}>{entry ? text.deleteConfirm : text.discardDraftConfirm}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.button} disabled={busy || loading} onClick={() => setDeleteDate(null)}>{text.cancel}</button>
              <button type="button" className={`${styles.button} ${styles.danger}`} disabled={busy || loading || editingDate !== null}
                onClick={() => void remove(date, entry, draft)}>{text.delete}</button>
            </div>
          </div>}
        </>}
      </article>)}
    </div>
    {loading && <p className={styles.notice} role="status">{text.loading}</p>}
    {hasMore && !error && <button type="button" className={`${styles.button} ${styles.loadMore}`}
      disabled={loading || busy || editingDate !== null} onClick={() => void load(true)}>{text.loadMore}</button>}
  </div>;
}

function GratitudeBody({ userId, lang, onBusyChange }: { userId: string; lang: Lang; onBusyChange: (busy: boolean) => void }) {
  const text = getGratitudeText(lang);
  const currentDate = useChallengeLocalDate() || getLocalDateString();
  const [editorDate, setEditorDate] = useState(getLocalDateString);
  const [tab, setTab] = useState<"today" | "history">("today");
  const [busy, setBusy] = useState(false);
  const id = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const updateBusy = useCallback((value: boolean) => { setBusy(value); onBusyChange(value); }, [onBusyChange]);
  const tabs = [{ value: "today" as const, label: text.todayTab }, { value: "history" as const, label: text.historyTab }];

  return <div lang={lang}>
    <p className={styles.intro}>{text.description}</p>
    <div role="tablist" aria-label={text.title} className={styles.tabs}>
      {tabs.map(({ value, label }, index) => <button key={value} ref={node => { tabRefs.current[index] = node; }}
        type="button" role="tab" id={`${id}-tab-${value}`} aria-controls={`${id}-panel-${value}`}
        aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} disabled={busy} className={styles.tab}
        onClick={() => { if (value === "today") setEditorDate(currentDate); setTab(value); }}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || busy) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : index === 0 ? 1 : 0;
          if (next === 0) setEditorDate(currentDate);
          setTab(tabs[next].value);
          tabRefs.current[next]?.focus();
        }}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel-${tab}`} aria-labelledby={`${id}-tab-${tab}`} className={styles.panel}>
      {tab === "today" ? <>
        {editorDate !== currentDate && <div>
          <p className={styles.notice} role="status">{text.olderDraftNotice}</p>
          <button type="button" className={styles.button} disabled={busy} onClick={() => setEditorDate(currentDate)}>{text.goToday}</button>
        </div>}
        <GratitudeEditor key={editorDate} userId={userId} date={editorDate} lang={lang} onBusyChange={updateBusy} />
      </> : <GratitudeHistory userId={userId} today={currentDate} lang={lang} onBusyChange={updateBusy} />}
    </div>
  </div>;
}

export default function HomeGratitudeDialog({ open, userId, lang, onClose }: Props) {
  const text = getGratitudeText(lang);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setBusy(false); }, [userId, open]);
  return <HomeHubDialog open={open} title={text.title} closeLabel={text.close} hideTitle busy={busy} onClose={onClose}>
    <GratitudeBody key={userId} userId={userId} lang={lang} onBusyChange={setBusy} />
  </HomeHubDialog>;
}
