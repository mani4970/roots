import { Capacitor } from "@capacitor/core";

const BUILD_ID = "roots-ime-check-20260908-v2";
const MAX_EVENTS = 200;
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
  inputType: string | null;
  isComposing: boolean | null;
  valueLength: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  focused: boolean;
  childListMutations?: number;
  characterDataMutations?: number;
  valueAttributeMutations?: number;
  compositionActive?: boolean;
  delayMs?: number;
  forwardedValueLength?: number;
  propValueLength?: number;
};

export type QTInputDiagnosticReport = {
  environment: QTInputDiagnosticEnvironment;
  field: { tag: "input" | "textarea"; cursorStability: "apple-isolated" | "unrecognized" | null; connectedAtStop: boolean };
  durationMs: number;
  totalEvents: number;
  droppedEvents: number;
  eventCounts: Record<string, number>;
  mutations: { childList: number; characterData: number; valueAttribute: number };
  events: QTInputDiagnosticEvent[];
};

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

/** Local, metadata-only observation. No setters, React updates, persistence, or network calls. */
export function startQTInputDiagnostics(field: HTMLInputElement | HTMLTextAreaElement): { stop(): QTInputDiagnosticReport } {
  const doc = field.ownerDocument;
  const win = doc.defaultView ?? window;
  const startedAt = win.performance.now();
  const elapsed = () => Math.round((win.performance.now() - startedAt) * 10) / 10;
  const environment = captureQTInputEnvironment();
  const marker = field.getAttribute("data-cursor-stability");
  const fieldInfo: Omit<QTInputDiagnosticReport["field"], "connectedAtStop"> = {
    tag: field.tagName.toLowerCase() === "textarea" ? "textarea" : "input",
    cursorStability: marker === "apple-isolated" ? marker : marker === null ? null : "unrecognized",
  };
  const events: QTInputDiagnosticEvent[] = [];
  const eventCounts: Record<string, number> = {};
  for (const type of [...FIELD_EVENTS, ...DIAGNOSTIC_PHASES, "window-focus", "window-blur", "dom-mutation"]) eventCounts[type] = 0;
  const mutations = { childList: 0, characterData: 0, valueAttribute: 0 };
  let totalEvents = 0;
  let stoppedReport: QTInputDiagnosticReport | null = null;

  const record = (type: string, event?: Event, changes?: { childListMutations: number; characterDataMutations: number; valueAttributeMutations: number }, details?: QTInputDiagnosticDetails) => {
    if (stoppedReport) return;
    const input = event as InputEvent | undefined;
    const inputType = input?.inputType;
    events.push({
      type,
      elapsedMs: elapsed(),
      inputType: typeof inputType === "string" && inputType !== "" ? INPUT_TYPES.has(inputType) ? inputType : "unrecognized" : null,
      isComposing: typeof input?.isComposing === "boolean" ? input.isComposing : null,
      valueLength: field.value.length,
      selectionStart: field.selectionStart,
      selectionEnd: field.selectionEnd,
      focused: doc.activeElement === field,
      ...changes,
      ...details,
    });
    totalEvents += 1;
    eventCounts[type] = (eventCounts[type] ?? 0) + 1;
    if (events.length > MAX_EVENTS) events.shift();
  };
  const onFieldEvent = (event: Event) => record(event.type, event);
  const onDiagnostic: DiagnosticSubscriber = (phase, details) => record(phase, undefined, undefined, details);
  const onWindowFocus = (event: Event) => record("window-focus", event);
  const onWindowBlur = (event: Event) => record("window-blur", event);
  const onMutations = (records: MutationRecord[]) => {
    if (stoppedReport) return;
    let childListMutations = 0;
    let characterDataMutations = 0;
    let valueAttributeMutations = 0;
    for (const mutation of records) {
      if (mutation.type === "childList") childListMutations += 1;
      if (mutation.type === "characterData") characterDataMutations += 1;
      if (mutation.type === "attributes" && mutation.attributeName === "value") valueAttributeMutations += 1;
    }
    if (!childListMutations && !characterDataMutations && !valueAttributeMutations) return;
    mutations.childList += childListMutations;
    mutations.characterData += characterDataMutations;
    mutations.valueAttribute += valueAttributeMutations;
    record("dom-mutation", undefined, { childListMutations, characterDataMutations, valueAttributeMutations });
  };
  const observer = new MutationObserver(onMutations);
  observer.observe(field, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["value"] });
  for (const type of FIELD_EVENTS) field.addEventListener(type, onFieldEvent);
  win.addEventListener("focus", onWindowFocus);
  win.addEventListener("blur", onWindowBlur);
  const subscribers = diagnosticSubscribers.get(field) ?? new Set<DiagnosticSubscriber>();
  diagnosticSubscribers.set(field, subscribers);
  subscribers.add(onDiagnostic);

  return {
    stop() {
      if (stoppedReport) return stoppedReport;
      subscribers.delete(onDiagnostic);
      if (subscribers.size === 0) diagnosticSubscribers.delete(field);
      onMutations(observer.takeRecords());
      observer.disconnect();
      for (const type of FIELD_EVENTS) field.removeEventListener(type, onFieldEvent);
      win.removeEventListener("focus", onWindowFocus);
      win.removeEventListener("blur", onWindowBlur);
      stoppedReport = {
        environment,
        field: { ...fieldInfo, connectedAtStop: field.isConnected },
        durationMs: elapsed(),
        totalEvents,
        droppedEvents: totalEvents - events.length,
        eventCounts: { ...eventCounts },
        mutations: { ...mutations },
        events: events.slice(),
      };
      return stoppedReport;
    },
  };
}
