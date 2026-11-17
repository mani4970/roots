"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getDateLocale, getLocalDateString, getShiftedLocalDateString, parseLocalDateString } from "@/lib/date";
import { useChallengeLocalDate } from "@/lib/useChallengeLocalDate";
import {
  deleteGratitudeEntry, getGratitudeEntry, listGratitudeEntries, readGratitudeEntryCache, saveGratitudeEntry,
  MAX_GRATITUDE_ITEMS, MAX_GRATITUDE_ITEM_LENGTH, type GratitudeEntry,
} from "@/lib/gratitude";
import {
  listGratitudeDrafts, readGratitudeDraft, removeGratitudeDraft, writeGratitudeDraft,
  type GratitudeDraft,
} from "@/lib/gratitudeDraft";
import { getGratitudeText } from "@/lib/gratitudeText";
import HomeHubDialog from "./HomeHubDialog";
import CursorStableInput from "./CursorStableInput";
import styles from "./HomeGratitudeDialog.module.css";

type Props = { open: boolean; userId: string; lang: Lang; onClose: () => void; onEntriesChange?: () => void };
const PAGE_SIZE = 20;
type BackActionRef = MutableRefObject<(() => boolean) | null>;

// The dialog owns the native registration. Inner layers delegate through refs,
// so their priority never depends on React's parent/child mount order.
function useGratitudeBackAction(target: BackActionRef, handle: () => boolean) {
  const latest = useRef(handle);
  latest.current = handle;
  useLayoutEffect(() => {
    const action = () => latest.current();
    target.current = action;
    return () => { if (target.current === action) target.current = null; };
  }, [target]);
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

function initialEditorState(userId: string, date: string) {
  const cached = readGratitudeEntryCache(userId, date);
  const storedDraft = readGratitudeDraft(userId, date);
  const remote = cached ? cached.entry : storedDraft?.base ?? null;
  const alreadySaved = !!cached && !!storedDraft && !!remote && sameItems(storedDraft.items, remote.items);
  const draft = alreadySaved ? null : storedDraft;
  const conflict = !!cached && !!draft && !sameVersion(draft.base, remote);
  return {
    ready: !!cached || !!draft, remote, draft, conflict,
    base: draft ? draft.base : remote,
    items: draft?.items.length ? draft.items : remote?.items.length ? remote.items : [""],
    viewing: !!cached && !!remote && !draft,
  };
}

function singleLine(value: string) {
  // Only the editor presentation changes. An untouched older multi-line item
  // keeps its original value when saved again.
  return value.replace(/\r\n|\r|\n/g, " ");
}

function GratitudeItems({ items }: { items: string[] }) {
  return <ol className={styles.items}>{items.filter(value => value.trim())
    .map((item, index) => <li key={index}>{item}</li>)}</ol>;
}

type EditorVisit = { view: "read" | "edit"; canBackToSaved: boolean };

type EditorProps = {
  userId: string;
  date: string;
  lang: Lang;
  onBusyChange: (busy: boolean) => void;
  onSaved?: (entry: GratitudeEntry) => void;
  backAction: BackActionRef;
  preferredView?: EditorVisit;
  onViewChange: (view: EditorVisit) => void;
};

function GratitudeEditor({ userId, date, lang, onBusyChange, onSaved, backAction, preferredView, onViewChange }: EditorProps) {
  const text = getGratitudeText(lang);
  const restoredVisit = useRef(preferredView).current;
  const viewPreferenceRef = useRef<"read" | "edit" | null>(restoredVisit?.view ?? null);
  const editLayerRef = useRef(restoredVisit?.canBackToSaved ?? false);
  const [initial] = useState(() => initialEditorState(userId, date));
  const [items, setItems] = useState<string[]>(initial.items);
  const [base, setBase] = useState<GratitudeEntry | null>(initial.base);
  const [savedEntry, setSavedEntry] = useState<GratitudeEntry | null>(initial.remote);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">(initial.ready ? "ready" : "loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"saved" | "loadError" | "saveError" | "authError" | "conflict" | "">(initial.conflict ? "conflict" : "");
  const [conflict, setConflict] = useState(initial.conflict);
  const [confirmReload, setConfirmReload] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [viewing, setViewing] = useState(restoredVisit?.view === "edit" ? false : restoredVisit?.view === "read" ? !!initial.remote : initial.viewing);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const focusEditRef = useRef(false);
  const itemsRef = useRef<string[]>(initial.items);
  const baseRef = useRef<GratitudeEntry | null>(initial.base);
  const contentReadyRef = useRef(initial.ready);
  const editingRef = useRef(false);
  const rowKeysRef = useRef<number[]>(initial.items.map((_, index) => index));
  const nextRowKeyRef = useRef(initial.items.length);
  const focusRowRef = useRef<number | null>(null);
  const draftRef = useRef<GratitudeDraft | null>(initial.draft);
  const editedHereRef = useRef(false);
  const id = useId();

  const load = useCallback(async (discardDraft = false, force = false) => {
    const request = ++requestRef.current;
    const discardedSnapshot = discardDraft ? draftRef.current : null;
    if (discardDraft) viewPreferenceRef.current = "read";
    if (!contentReadyRef.current || discardDraft) setPhase("loading");
    if (discardDraft || !contentReadyRef.current) setMessage("");
    try {
      const remote = await getGratitudeEntry(userId, date, { force });
      if (!mountedRef.current || request !== requestRef.current) return;
      setSavedEntry(remote);
      const draft = discardDraft ? null : editedHereRef.current ? draftRef.current : readGratitudeDraft(userId, date);
      // A response can be lost after a successful write. Recognize its content
      // on reopen instead of trapping that already-saved draft in a conflict.
      const alreadySaved = !!draft && !!remote && sameItems(draft.items, remote.items);
      if (discardDraft) removeGratitudeDraft(userId, date, discardedSnapshot);
      else if (alreadySaved) removeGratitudeDraft(userId, date, draft);
      const activeDraft = alreadySaved ? null : draft;
      const editorHasFocus = !!editorRef.current?.contains(document.activeElement);
      if (!discardDraft && (editedHereRef.current || editingRef.current || editorHasFocus)) {
        // A warm background check must not replace an active input or its caret.
        // Reconcile its revision while retaining the current unsaved buffer.
        if (alreadySaved) {
          draftRef.current = null;
          editedHereRef.current = false;
          baseRef.current = remote;
          setBase(remote);
        }
        const hasConflict = !alreadySaved && !sameVersion(activeDraft ? activeDraft.base : baseRef.current, remote);
        setConflict(hasConflict);
        setMessage(hasConflict ? "conflict" : "");
        contentReadyRef.current = true;
        setPhase("ready");
        return;
      }
      draftRef.current = activeDraft;
      editedHereRef.current = false;
      editingRef.current = false;
      const hasConflict = !!activeDraft && !sameVersion(activeDraft.base, remote);
      baseRef.current = activeDraft ? activeDraft.base : remote;
      setBase(baseRef.current);
      const nextItems = activeDraft?.items.length ? activeDraft.items : remote?.items.length ? remote.items : [""];
      itemsRef.current = nextItems;
      rowKeysRef.current = nextItems.map(() => nextRowKeyRef.current++);
      setItems(nextItems);
      const preferred = viewPreferenceRef.current;
      const nextViewing = !!remote && (preferred === "read" || (preferred !== "edit" && !activeDraft));
      if (nextViewing) editLayerRef.current = false;
      setViewing(nextViewing);
      setConflict(hasConflict);
      setMessage(hasConflict ? "conflict" : "");
      setConfirmReload(false);
      contentReadyRef.current = true;
      setPhase("ready");
    } catch (error) {
      if (!mountedRef.current || request !== requestRef.current) return;
      if (!contentReadyRef.current) setPhase("error");
      else setPhase("ready");
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
    if (phase === "ready") onViewChange({ view: viewing ? "read" : "edit", canBackToSaved: editLayerRef.current });
  }, [phase, viewing, onViewChange]);

  useEffect(() => {
    const index = focusRowRef.current;
    if (index === null) return;
    focusRowRef.current = null;
    editorRef.current?.querySelectorAll<HTMLInputElement>("[data-gratitude-input]")[index]?.focus({ preventScroll: false });
  }, [items.length, viewing]);

  useEffect(() => {
    if (!focusEditRef.current || !viewing || saving) return;
    focusEditRef.current = false;
    editButtonRef.current?.focus({ preventScroll: true });
  }, [viewing, saving]);

  useGratitudeBackAction(backAction, () => {
    if (busyRef.current) return true;
    if (confirmReload) { setConfirmReload(false); return true; }
    if (phase === "ready" && !viewing && savedEntry && editLayerRef.current) {
      // Keep the edit buffer and its draft; this returns to the saved record,
      // never presents unsaved writing as if it had already been saved.
      editingRef.current = false;
      viewPreferenceRef.current = "read";
      editLayerRef.current = false;
      focusEditRef.current = true;
      setViewing(true);
      return true;
    }
    return false;
  });

  const retainItems = (next: string[]) => {
    editingRef.current = true;
    itemsRef.current = next;
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

  const changeItems = (next: string[]) => {
    retainItems(next);
    setItems(next);
  };

  const updateInput = (rowKey: number, value: string, commit: boolean) => {
    // Rows retain their input while earlier rows are removed. Resolve delayed
    // Apple callbacks by that same identity so they cannot edit another row.
    const index = rowKeysRef.current.indexOf(rowKey);
    const current = itemsRef.current;
    if (index < 0 || current[index] === undefined) return;
    const next = current.map((item, itemIndex) => itemIndex === index
      ? value === singleLine(item) ? item : value : item);
    // CursorStableInput defers Apple React updates while IME owns the caret.
    // Back up the native input immediately so closing during that delay is safe.
    if (commit) changeItems(next);
    else retainItems(next);
  };

  const save = async () => {
    const savingItems = [...itemsRef.current];
    if (phase !== "ready" || busyRef.current || conflict || !savingItems.some(value => value.trim())) return;
    busyRef.current = true;
    setSaving(true);
    setMessage("");
    // Retain input before starting any remote mutation, including timed-out saves.
    const savingDraft = { date, items: savingItems, base, savedAt: Date.now() };
    draftRef.current = savingDraft;
    editedHereRef.current = true;
    setStorageAvailable(writeGratitudeDraft(userId, savingDraft));
    try {
      const saved = await saveGratitudeEntry(userId, date, savingItems, base);
      removeGratitudeDraft(userId, date, savingDraft);
      draftRef.current = null;
      editedHereRef.current = false;
      if (!mountedRef.current) return;
      baseRef.current = saved;
      setBase(saved);
      setSavedEntry(saved);
      editingRef.current = false;
      viewPreferenceRef.current = "read";
      editLayerRef.current = false;
      itemsRef.current = saved.items;
      rowKeysRef.current = saved.items.map(() => nextRowKeyRef.current++);
      setItems(saved.items);
      focusEditRef.current = true;
      setViewing(true);
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

  if (phase === "ready" && viewing && savedEntry) return <article className={styles.card} data-gratitude-read={date}>
    <GratitudeItems items={savedEntry.items} />
    {(message === "loadError" || message === "authError") && <div>
      <p className={styles.error} role="alert">{text[message]}</p>
      <button type="button" className={styles.button} onClick={() => void load(false, true)}>{text.retry}</button>
    </div>}
    <div className={styles.actions}>
      <button ref={editButtonRef} type="button" className={styles.button} disabled={saving} onClick={() => {
        if (!draftRef.current) {
          baseRef.current = savedEntry;
          setBase(savedEntry);
          itemsRef.current = savedEntry.items;
          rowKeysRef.current = savedEntry.items.map(() => nextRowKeyRef.current++);
          setItems(savedEntry.items);
          setConflict(false);
          setMessage("");
        }
        editingRef.current = true;
        viewPreferenceRef.current = "edit";
        editLayerRef.current = true;
        focusRowRef.current = 0;
        setViewing(false);
      }}>{text.edit}</button>
    </div>
  </article>;

  return <div ref={editorRef} className={styles.editor} data-gratitude-editor={date} aria-busy={phase === "loading" || saving}>
    {phase === "loading" ? <p role="status" className={styles.notice}>{text.loading}</p> : phase === "error" ? <>
      <p role="alert" className={styles.error}>{text[message === "authError" ? "authError" : "loadError"]}</p>
      <button type="button" className={styles.button} onClick={() => void load(false, true)}>{text.retry}</button>
    </> : <form onSubmit={event => event.preventDefault()}>
      <div className={styles.fields}>
        {items.map((value, index) => {
          const rowKey = rowKeysRef.current[index];
          return <div key={rowKey} className={styles.row} data-gratitude-row={index + 1}>
            <span className={styles.number} aria-hidden="true">{index + 1}.</span>
            <label htmlFor={`${id}-${index}`} className={styles.srOnly}>{text.itemLabel(index + 1)}</label>
            <CursorStableInput id={`${id}-${index}`} data-gratitude-input
              className={styles.input} value={singleLine(value)} maxLength={MAX_GRATITUDE_ITEM_LENGTH}
              placeholder={text.placeholder} disabled={saving}
              onValueChange={next => updateInput(rowKey, next, true)}
              onInput={event => updateInput(rowKey, event.currentTarget.value, false)}
              onKeyDown={event => {
                // Let Korean IME finish composing; normal Enter must not save
                // the whole day implicitly. Saving always uses the Save button.
                if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) event.preventDefault();
              }} />
            {index === items.length - 1 && items.length < MAX_GRATITUDE_ITEMS ? <button type="button"
              className={styles.rowAction} aria-label={text.addItem} disabled={saving}
              onClick={() => {
                focusRowRef.current = itemsRef.current.length;
                rowKeysRef.current.push(nextRowKeyRef.current++);
                changeItems([...itemsRef.current, ""]);
              }}>
              <Plus size={18} aria-hidden="true" />
            </button> : <button type="button" className={styles.rowAction} aria-label={text.removeItem(index + 1)} disabled={saving}
              onClick={() => {
                focusRowRef.current = Math.max(0, index - 1);
                rowKeysRef.current.splice(index, 1);
                changeItems(itemsRef.current.filter((_, itemIndex) => itemIndex !== index));
              }}><Trash2 size={17} aria-hidden="true" /></button>}
          </div>;
        })}
      </div>
      {items.length >= MAX_GRATITUDE_ITEMS && <p className={styles.notice}>{text.maxItems}</p>}
      {!storageAvailable && <p className={styles.notice} role="status">{text.storageUnavailable}</p>}
      {message && <p className={`${styles.notice} ${message === "saved" ? styles.success : styles.error}`}
        role={message === "saved" ? "status" : "alert"}>{text[message]}</p>}
      {conflict && <div className={styles.confirm}>
        {confirmReload ? <>
          <p className={styles.notice}>{text.discardConfirm}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => setConfirmReload(false)}>{text.cancel}</button>
            <button type="button" className={styles.button} onClick={() => void load(true, true)}>{text.reload}</button>
          </div>
        </> : <button type="button" className={styles.button} onClick={() => setConfirmReload(true)}>{text.reload}</button>}
      </div>}
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void save()}
        disabled={saving || conflict || !items.some(value => value.trim())}>{saving ? text.saving : text.save}</button>
    </form>}
  </div>;
}

type HistoryProps = { userId: string; today: string; lang: Lang; onBusyChange: (busy: boolean) => void; onEntriesChange?: () => void; backAction: BackActionRef };

function GratitudeHistory({ userId, today, lang, onBusyChange, onEntriesChange, backAction }: HistoryProps) {
  const text = getGratitudeText(lang);
  const dates = useMemo(() => {
    const locale = getDateLocale(lang);
    const options = { weekday: "long", month: "long", day: "numeric" } as const;
    return {
      short: new Intl.DateTimeFormat(locale, options),
      full: new Intl.DateTimeFormat(locale, { ...options, year: "numeric" }),
    };
  }, [lang]);
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [drafts, setDrafts] = useState<GratitudeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<"loadError" | "deleteError" | "authError" | "conflict" | "">("");
  const [deleteDate, setDeleteDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef(0);
  const mountedRef = useRef(false);
  const loadingRef = useRef(false);
  const busyRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const failedMoreRef = useRef(false);
  const deleteButtonsRef = useRef(new Map<string, HTMLButtonElement>());

  useGratitudeBackAction(backAction, () => {
    if (busyRef.current) return true;
    if (!deleteDate) return false;
    setDeleteDate(null);
    deleteButtonsRef.current.get(deleteDate)?.focus({ preventScroll: true });
    return true;
  });

  const syncDrafts = useCallback(() => setDrafts(listGratitudeDrafts(userId).filter(draft => draft.date <= today)), [userId, today]);
  const load = useCallback(async (more = false) => {
    if (loadingRef.current || busyRef.current) return;
    loadingRef.current = true;
    failedMoreRef.current = more;
    const request = ++requestRef.current;
    setLoading(true);
    setError("");
    syncDrafts();
    try {
      const before = more && cursorRef.current ? cursorRef.current : getShiftedLocalDateString(1, parseLocalDateString(today));
      const rows = await listGratitudeEntries(userId, before, PAGE_SIZE);
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

  const remove = async (date: string, entry?: GratitudeEntry, draft?: GratitudeDraft) => {
    if (busyRef.current || loadingRef.current) return;
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
      if (entry) onEntriesChange?.();
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
      <button type="button" className={styles.button} disabled={loading || busy}
        onClick={() => { setDeleteDate(null); void load(error === "loadError" && failedMoreRef.current); }}>{text.retry}</button>
    </div>}
    {!loading && !error && cards.length === 0 && <p className={styles.empty}>{text.emptyHistory}</p>}
    <div className={styles.list}>
      {cards.map(([date, { entry, draft }]) => {
        const day = parseLocalDateString(date);
        const fullDate = dates.full.format(day);
        const dateLabel = date.slice(0, 4) === today.slice(0, 4) ? dates.short.format(day) : fullDate;
        return <article key={date} className={styles.historyCard} data-gratitude-date={date}>
          <header className={styles.historyHeader}>
            <div className={styles.historyDateGroup}>
              <time className={styles.historyDate} dateTime={date}>{dateLabel}</time>
              {draft && <span className={styles.draft}>{text.draftLabel}</span>}
            </div>
            <button type="button" className={styles.deleteAction} data-gratitude-delete={date}
              ref={node => { if (node) deleteButtonsRef.current.set(date, node); else deleteButtonsRef.current.delete(date); }}
              aria-label={`${entry ? text.delete : text.discardDraft}: ${fullDate}`}
              aria-expanded={deleteDate === date} disabled={busy || loading}
              onClick={() => setDeleteDate(date)}><Trash2 size={18} aria-hidden="true" /></button>
          </header>
          <div className={styles.historyBody}>
            <GratitudeItems items={draft?.items ?? entry?.items ?? []} />
            {deleteDate === date && <div className={styles.confirm}>
              <p className={styles.notice}>{entry ? text.deleteConfirm : text.discardDraftConfirm}</p>
              <div className={styles.actions}>
                <button type="button" className={styles.button} disabled={busy || loading} onClick={() => setDeleteDate(null)}>{text.cancel}</button>
                <button type="button" className={`${styles.button} ${styles.danger}`} disabled={busy || loading}
                  onClick={() => void remove(date, entry, draft)}>{text.delete}</button>
              </div>
            </div>}
          </div>
        </article>;
      })}
    </div>
    {loading && <p className={styles.notice} role="status">{text.loading}</p>}
    {hasMore && !error && <button type="button" className={`${styles.button} ${styles.loadMore}`}
      disabled={loading || busy} onClick={() => void load(true)}>{text.loadMore}</button>}
  </div>;
}

type GratitudeRoute = { id: number; tab: "today" | "history"; date: string };

function GratitudeBody({ userId, lang, onBusyChange, onEntriesChange, backAction }: {
  userId: string; lang: Lang; onBusyChange: (busy: boolean) => void; onEntriesChange?: () => void; backAction: BackActionRef;
}) {
  const text = getGratitudeText(lang);
  const currentDate = useChallengeLocalDate() || getLocalDateString();
  const [routes, setRoutes] = useState<GratitudeRoute[]>(() => [{ id: 0, tab: "today", date: getLocalDateString() }]);
  const routesRef = useRef(routes);
  const nextRouteId = useRef(1);
  const editorViewsRef = useRef(new Map<number, EditorVisit>());
  const route = routes[routes.length - 1];
  const tab = route.tab;
  const editorDate = route.date;
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const childBackAction = useRef<(() => boolean) | null>(null);
  const id = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusTabRef = useRef<"today" | "history" | null>(null);
  const updateBusy = useCallback((value: boolean) => { busyRef.current = value; setBusy(value); onBusyChange(value); }, [onBusyChange]);
  const tabs = [{ value: "today" as const, label: text.todayTab }, { value: "history" as const, label: text.historyTab }];

  const navigate = (nextTab: GratitudeRoute["tab"]) => {
    if (busyRef.current) return;
    const previous = routesRef.current[routesRef.current.length - 1];
    if (previous.tab === nextTab && (nextTab === "history" || previous.date === currentDate)) return;
    const next = [...routesRef.current, { id: nextRouteId.current++, tab: nextTab, date: currentDate }];
    routesRef.current = next;
    setRoutes(next);
  };

  useGratitudeBackAction(backAction, () => {
    if (childBackAction.current?.()) return true;
    if (busyRef.current) return true;
    const previous = routesRef.current;
    if (previous.length <= 1) return false;
    const next = previous.slice(0, -1);
    editorViewsRef.current.delete(previous[previous.length - 1].id);
    routesRef.current = next;
    focusTabRef.current = next[next.length - 1].tab;
    setRoutes(next);
    return true;
  });

  useEffect(() => {
    if (!focusTabRef.current) return;
    tabRefs.current[focusTabRef.current === "today" ? 0 : 1]?.focus({ preventScroll: true });
    focusTabRef.current = null;
  }, [routes]);

  return <div lang={lang}>
    <p className={styles.intro}>{text.description}</p>
    <div role="tablist" aria-label={text.title} className={styles.tabs}>
      {tabs.map(({ value, label }, index) => <button key={value} ref={node => { tabRefs.current[index] = node; }}
        type="button" role="tab" id={`${id}-tab-${value}`} aria-controls={`${id}-panel-${value}`}
        aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} disabled={busy} className={styles.tab}
        onClick={() => navigate(value)}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || busy) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : index === 0 ? 1 : 0;
          navigate(tabs[next].value);
          tabRefs.current[next]?.focus();
        }}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel-${tab}`} aria-labelledby={`${id}-tab-${tab}`} className={styles.panel}>
      {tab === "today" ? <>
        {editorDate !== currentDate && <div>
          <p className={styles.notice} role="status">{text.olderDraftNotice}</p>
          <button type="button" className={styles.button} disabled={busy} onClick={() => navigate("today")}>{text.goToday}</button>
        </div>}
        <GratitudeEditor key={editorDate} userId={userId} date={editorDate} lang={lang} onBusyChange={updateBusy}
          onSaved={onEntriesChange} backAction={childBackAction} preferredView={editorViewsRef.current.get(route.id)}
          onViewChange={view => editorViewsRef.current.set(route.id, view)} />
      </> : <GratitudeHistory userId={userId} today={currentDate} lang={lang} onBusyChange={updateBusy} onEntriesChange={onEntriesChange} backAction={childBackAction} />}
    </div>
  </div>;
}

export default function HomeGratitudeDialog({ open, userId, lang, onClose, onEntriesChange }: Props) {
  const text = getGratitudeText(lang);
  const [busy, setBusy] = useState(false);
  const backAction = useRef<(() => boolean) | null>(null);
  useEffect(() => { setBusy(false); }, [userId, open]);
  return <HomeHubDialog open={open} title={text.title} closeLabel={text.close} hideTitle busy={busy} onClose={onClose}
    onAndroidBack={() => backAction.current?.() ?? false} backdropVariant="prayer">
    <GratitudeBody key={userId} userId={userId} lang={lang} onBusyChange={setBusy} onEntriesChange={onEntriesChange} backAction={backAction} />
  </HomeHubDialog>;
}
