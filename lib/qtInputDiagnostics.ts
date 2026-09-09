import { Capacitor } from "@capacitor/core";

const BUILD_ID = "roots-ime-check-20260909-v4";
const MAX_EVENTS = 2000;
const FIELD_EVENTS = ["beforeinput", "input", "compositionstart", "compositionupdate", "compositionend", "focus", "blur"];

export type QTInputDiagnosticPhase = "sync-scheduled" | "sync-fired" | "value-forwarded" | "react-commit" | "inactive-value-write";
export type QTInputDiagnosticDetails = { compositionActive?: boolean; delayMs?: number; forwardedValueLength?: number; propValueLength?: number };
const DIAGNOSTIC_PHASES = new Set<QTInputDiagnosticPhase>([
  "sync-scheduled", "sync-fired", "value-forwarded", "react-commit", "inactive-value-write",
]);
type DiagnosticSubscriber = (phase: QTInputDiagnosticPhase, details: QTInputDiagnosticDetails) => void;
const diagnosticSubscribers = new WeakMap<HTMLInputElement | HTMLTextAreaElement, Set<DiagnosticSubscriber>>();
const INPUT_TYPES = new Set([
  "insertText", "insertCompositionText", "insertFromComposition", "insertReplacementText",
  "insertLineBreak", "insertParagraph", "insertFromPaste", "insertFromPasteAsQuotation",
  "insertFromDrop", "insertTranspose", "insertFromYank", "insertLink",
  "deleteCompositionText", "deleteByComposition", "deleteContentBackward", "deleteContentForward",
  "deleteWordBackward", "deleteWordForward", "deleteSoftLineBackward", "deleteSoftLineForward",
  "deleteHardLineBackward", "deleteHardLineForward", "deleteEntireSoftLine", "deleteContent",
  "deleteByCut", "deleteByDrag", "historyUndo", "historyRedo",
]);

export type QTInputDiagnosticEnvironment = {
  buildId: string;
  userAgent: string | null;
  platform: string | null;
  maxTouchPoints: number | null;
  native: { isNative: boolean | null; platform: string | null };
  screen: { width: number | null; height: number | null; innerWidth: number | null; innerHeight: number | null };
  htmlFlags: { nativeApp: string | null; nativePlatform: string | null; nativeFormFactor: string | null; nativeIOSDevice: string | null };
};

export type QTInputDiagnosticEvent = {
  type: string;
  elapsedMs: number;
  fieldId: number | null;
  inputType: string | null;
  isComposing: boolean | null;
  isTrusted: boolean | null;
  keyKind?: "ordinary" | "delete" | "navigation" | "modifier" | "other";
  valueLength: number | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  focused: boolean;
  deleteKey?: "backspace" | "delete";
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  childListMutations?: number;
  characterDataMutations?: number;
  valueAttributeMutations?: number;
  compositionActive?: boolean;
  delayMs?: number;
  forwardedValueLength?: number;
  propValueLength?: number;
};

type Editor = HTMLInputElement | HTMLTextAreaElement;
type FieldInfo = {
  fieldId: number;
  tag: "input" | "textarea";
  cursorStability: "apple-isolated" | "unrecognized" | null;
  firstObservedMs: number;
  lastEventElapsedMs: number;
  lastInputElapsedMs: number | null;
  lastDetachObservedMs: number | null;
  connectedAtStop: boolean;
  totalEvents: number;
  eventCounts: Record<string, number>;
};

export type QTInputDiagnosticReport = {
  environment: QTInputDiagnosticEnvironment;
  trackingScope: "visited-writer-fields" | "explicit-test-scope";
  eventPhase: "document-capture";
  retention: { maxEvents: number; retainedFromElapsedMs: number | null };
  fields: FieldInfo[];
  durationMs: number;
  lastInputElapsedMs: number | null;
  totalEvents: number;
  droppedEvents: number;
  eventCounts: Record<string, number>;
  mutations: { childList: number; characterData: number; valueAttribute: number };
  events: QTInputDiagnosticEvent[];
};

function isWritableDiagnosticField(element: Element | null): element is Editor {
  return (element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement && element.type === "text")) &&
    element.isConnected && element.matches(".textarea-field, .input-field") &&
    !element.readOnly && !element.disabled;
}

/** Match only writable reflection fields; never collect other forms or dialog inputs. */
export function isQTInputDiagnosticEditor(element: Element | null): element is Editor {
  return isWritableDiagnosticField(element) && element.closest(".roots-qt-phase2a") !== null;
}

/** No field properties are read unless this field has an explicitly active capture. */
export function noteQTInputDiagnostic(field: HTMLInputElement | HTMLTextAreaElement, phase: QTInputDiagnosticPhase, details?: QTInputDiagnosticDetails): void {
  const subscribers = diagnosticSubscribers.get(field);
  if (!subscribers || !DIAGNOSTIC_PHASES.has(phase)) return;
  const safeDetails: QTInputDiagnosticDetails = {};
  if (typeof details?.compositionActive === "boolean") safeDetails.compositionActive = details.compositionActive;
  if (typeof details?.delayMs === "number" && Number.isFinite(details.delayMs) && details.delayMs >= 0) safeDetails.delayMs = details.delayMs;
  for (const key of ["forwardedValueLength", "propValueLength"] as const) {
    const length = details?.[key];
    if (typeof length === "number" && Number.isInteger(length) && length >= 0) safeDetails[key] = length;
  }
  for (const subscriber of subscribers) subscriber(phase, safeDetails);
}

/** Runtime metadata only. This does not read URLs, storage, or reflection text. */
export function captureQTInputEnvironment(): QTInputDiagnosticEnvironment {
  const win = typeof window === "undefined" ? null : window;
  const flag = (name: string, accepted: string[]) => {
    const value = win?.document.documentElement.getAttribute(name) ?? null;
    return value !== null && accepted.includes(value) ? value : null;
  };
  const native: QTInputDiagnosticEnvironment["native"] = { isNative: null, platform: null };
  try {
    native.isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    native.platform = ["ios", "android", "web"].includes(platform) ? platform : "unrecognized";
  } catch { /* Keep unknown metadata unknown; never retain exception messages. */ }
  return {
    buildId: BUILD_ID,
    userAgent: win?.navigator.userAgent ?? null,
    platform: win?.navigator.platform ?? null,
    maxTouchPoints: win?.navigator.maxTouchPoints ?? null,
    native,
    screen: {
      width: win?.screen.width ?? null,
      height: win?.screen.height ?? null,
      innerWidth: win?.innerWidth ?? null,
      innerHeight: win?.innerHeight ?? null,
    },
    htmlFlags: {
      nativeApp: flag("data-native-app", ["true", "false"]),
      nativePlatform: flag("data-native-platform", ["ios", "android", "web"]),
      nativeFormFactor: flag("data-native-form-factor", ["phone", "tablet"]),
      nativeIOSDevice: flag("data-native-ios-device", ["ipad", "mac"]),
    },
  };
}

/** Local observation only. No input setters, React updates, persistence, or network calls. */
export function startQTInputDiagnostics(field: Editor, options?: { scope?: HTMLElement }): { stop(): QTInputDiagnosticReport } {
  const scope = options?.scope;
  const eligible = (element: Element | null): element is Editor =>
    isWritableDiagnosticField(element) && (scope ? scope.contains(element) : element.closest(".roots-qt-phase2a") !== null);
  const doc = field.ownerDocument;
  const win = doc.defaultView ?? window;
  const startedAt = win.performance.now();
  const elapsed = () => Math.round((win.performance.now() - startedAt) * 10) / 10;
  const environment = captureQTInputEnvironment();
  const fields: FieldInfo[] = [];
  const knownFields = new WeakMap<Editor, FieldInfo>();
  const bindings = new Map<Editor, { info: FieldInfo; subscriber: DiagnosticSubscriber }>();
  // A bounded ring keeps the recent trace without shifting an array on every keystroke.
  const events = new Array<QTInputDiagnosticEvent>(MAX_EVENTS);
  const eventCounts: Record<string, number> = {};
  for (const type of [...FIELD_EVENTS, ...DIAGNOSTIC_PHASES, "keydown", "keyup", "field-registered", "field-activated", "field-detached-observed", "window-focus", "window-blur", "document-hidden", "document-visible", "dom-mutation"]) eventCounts[type] = 0;
  const mutations = { childList: 0, characterData: 0, valueAttribute: 0 };
  let totalEvents = 0;
  let lastFieldId: number | null = null;
  let lastInputElapsedMs: number | null = null;
  let stoppedReport: QTInputDiagnosticReport | null = null;

  const record = (type: string, editor: Editor | null, event?: Event, extra?: Partial<QTInputDiagnosticEvent>) => {
    if (stoppedReport) return;
    const info = editor ? bindings.get(editor)?.info : undefined;
    // A comparison field can enable Apple isolation just after initial mount.
    // Refresh the allowlisted marker when the actual editor processes input/commits.
    if (info && editor && (type === "input" || type === "react-commit")) {
      const marker = editor.getAttribute("data-cursor-stability");
      info.cursorStability = marker === "apple-isolated" ? marker : marker === null ? null : "unrecognized";
    }
    const input = event as InputEvent | undefined;
    const inputType = input?.inputType;
    const time = elapsed();
    events[totalEvents % MAX_EVENTS] = {
      type,
      elapsedMs: time,
      fieldId: info?.fieldId ?? null,
      inputType: typeof inputType === "string" && inputType !== "" ? INPUT_TYPES.has(inputType) ? inputType : "unrecognized" : null,
      isComposing: typeof input?.isComposing === "boolean" ? input.isComposing : null,
      isTrusted: event ? event.isTrusted : null,
      valueLength: editor ? editor.value.length : null,
      selectionStart: editor?.selectionStart ?? null,
      selectionEnd: editor?.selectionEnd ?? null,
      focused: editor !== null && doc.activeElement === editor,
      ...extra,
    };
    totalEvents += 1;
    eventCounts[type] = (eventCounts[type] ?? 0) + 1;
    if (type === "input") lastInputElapsedMs = time;
    if (info) {
      info.lastEventElapsedMs = time;
      info.totalEvents += 1;
      info.eventCounts[type] = (info.eventCounts[type] ?? 0) + 1;
      if (type === "input") info.lastInputElapsedMs = time;
    }
  };

  const attach = (editor: Editor) => {
    if (bindings.has(editor)) return;
    let info = knownFields.get(editor);
    if (!info) {
      const marker = editor.getAttribute("data-cursor-stability");
      info = {
        fieldId: fields.length + 1,
        tag: editor.tagName.toLowerCase() === "textarea" ? "textarea" : "input",
        cursorStability: marker === "apple-isolated" ? marker : marker === null ? null : "unrecognized",
        firstObservedMs: elapsed(), lastEventElapsedMs: elapsed(), lastInputElapsedMs: null,
        lastDetachObservedMs: null, connectedAtStop: true, totalEvents: 0, eventCounts: {},
      };
      knownFields.set(editor, info);
      fields.push(info);
    }
    info.connectedAtStop = true;
    const subscriber: DiagnosticSubscriber = (phase, details) => {
      if (eligible(editor)) record(phase, editor, undefined, details);
    };
    const subscribers = diagnosticSubscribers.get(editor) ?? new Set<DiagnosticSubscriber>();
    diagnosticSubscribers.set(editor, subscribers);
    subscribers.add(subscriber);
    bindings.set(editor, { info, subscriber });
    record("field-registered", editor);
  };
  const activate = (editor: Editor) => {
    attach(editor);
    const id = bindings.get(editor)!.info.fieldId;
    if (id !== lastFieldId) {
      lastFieldId = id;
      record("field-activated", editor);
    }
  };
  const unsubscribe = (editor: Editor, subscriber: DiagnosticSubscriber) => {
    const subscribers = diagnosticSubscribers.get(editor);
    subscribers?.delete(subscriber);
    if (subscribers?.size === 0) diagnosticSubscribers.delete(editor);
  };
  const releaseDetached = () => {
    for (const [editor, binding] of bindings) {
      binding.info.connectedAtStop = editor.isConnected;
      if (editor.isConnected) continue;
      // This is when removal was observed, not an exact native removal timestamp.
      binding.info.lastDetachObservedMs = elapsed();
      record("field-detached-observed", editor);
      unsubscribe(editor, binding.subscriber);
      bindings.delete(editor);
    }
  };

  const onFieldEvent = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element) || !eligible(target)) return;
    let keyDetails: Partial<QTInputDiagnosticEvent> | undefined;
    if (event.type === "keydown" || event.type === "keyup") {
      const key = event as KeyboardEvent;
      // Keep only a category/count for ordinary keys, never key/code/data text.
      // Keydown can arrive after input with native Korean IMEs; do not infer ordering.
      const deletion = key.key === "Backspace" || key.key === "Delete";
      const navigation = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(key.key);
      const modifier = ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(key.key);
      keyDetails = {
        keyKind: deletion ? "delete" : navigation ? "navigation" : modifier ? "modifier" :
          key.key.length === 1 || key.key === "Process" || key.key === "Unidentified" ? "ordinary" : "other",
        repeat: key.repeat, altKey: key.altKey, ctrlKey: key.ctrlKey,
        metaKey: key.metaKey, shiftKey: key.shiftKey,
      };
      if (deletion) keyDetails.deleteKey = key.key === "Backspace" ? "backspace" : "delete";
    }
    // Capture runs before editor input/blur handlers, including their sync notes.
    if (event.type === "blur") attach(target);
    else activate(target);
    record(event.type, target, event, keyDetails);
  };
  const activeEditor = () => {
    const active = doc.activeElement;
    if (!eligible(active)) return null;
    attach(active);
    return active;
  };
  const onWindowFocus = () => record("window-focus", activeEditor());
  const onWindowBlur = () => record("window-blur", activeEditor());
  const onVisibility = () => record(doc.visibilityState === "hidden" ? "document-hidden" : "document-visible", activeEditor());
  const onMutations = (records: MutationRecord[]) => {
    if (stoppedReport) return;
    // Inspect only already visited fields. Never copy DOM text or enumerate new inputs.
    for (const [editor] of bindings) {
      let childListMutations = 0;
      let characterDataMutations = 0;
      let valueAttributeMutations = 0;
      for (const mutation of records) {
        if (mutation.target !== editor && !editor.contains(mutation.target)) continue;
        if (mutation.type === "childList") childListMutations += 1;
        if (mutation.type === "characterData") characterDataMutations += 1;
        if (mutation.type === "attributes" && mutation.attributeName === "value") valueAttributeMutations += 1;
      }
      if (!childListMutations && !characterDataMutations && !valueAttributeMutations) continue;
      mutations.childList += childListMutations;
      mutations.characterData += characterDataMutations;
      mutations.valueAttribute += valueAttributeMutations;
      record("dom-mutation", editor, undefined, { childListMutations, characterDataMutations, valueAttributeMutations });
    }
    releaseDetached();
  };
  const observer = new MutationObserver(onMutations);
  observer.observe(doc.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["value"] });
  const observedEvents = [...FIELD_EVENTS, "keydown", "keyup"];
  for (const type of observedEvents) doc.addEventListener(type, onFieldEvent, true);
  win.addEventListener("focus", onWindowFocus);
  win.addEventListener("blur", onWindowBlur);
  doc.addEventListener("visibilitychange", onVisibility, true);
  if (eligible(field)) activate(field);

  return {
    stop() {
      if (stoppedReport) return stoppedReport;
      onMutations(observer.takeRecords());
      observer.disconnect();
      for (const type of observedEvents) doc.removeEventListener(type, onFieldEvent, true);
      win.removeEventListener("focus", onWindowFocus);
      win.removeEventListener("blur", onWindowBlur);
      doc.removeEventListener("visibilitychange", onVisibility, true);
      for (const [editor, binding] of bindings) unsubscribe(editor, binding.subscriber);
      bindings.clear();
      const count = Math.min(totalEvents, MAX_EVENTS);
      const retainedEvents = Array.from({ length: count }, (_, i) => events[(totalEvents - count + i) % MAX_EVENTS]);
      stoppedReport = {
        environment,
        trackingScope: scope ? "explicit-test-scope" : "visited-writer-fields",
        eventPhase: "document-capture",
        retention: { maxEvents: MAX_EVENTS, retainedFromElapsedMs: retainedEvents[0]?.elapsedMs ?? null },
        fields: fields.map((info) => ({ ...info, eventCounts: { ...info.eventCounts } })),
        durationMs: elapsed(), lastInputElapsedMs,
        totalEvents, droppedEvents: totalEvents - count,
        eventCounts: { ...eventCounts }, mutations: { ...mutations }, events: retainedEvents,
      };
      return stoppedReport;
    },
  };
}
