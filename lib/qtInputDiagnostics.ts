import { Capacitor } from "@capacitor/core";

const BUILD_ID = "roots-ime-check-20260908-v1";
const MAX_EVENTS = 200;
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
};

export type QTInputDiagnosticReport = {
  environment: QTInputDiagnosticEnvironment;
  field: { tag: "input" | "textarea"; cursorStability: "apple-isolated" | "unrecognized" | null; connectedAtStop: boolean };
  durationMs: number;
  totalEvents: number;
  droppedEvents: number;
  mutations: { childList: number; characterData: number; valueAttribute: number };
  events: QTInputDiagnosticEvent[];
};

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
  const mutations = { childList: 0, characterData: 0, valueAttribute: 0 };
  let totalEvents = 0;
  let stoppedReport: QTInputDiagnosticReport | null = null;

  const record = (type: string, event?: Event, changes?: { childListMutations: number; characterDataMutations: number; valueAttributeMutations: number }) => {
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
    });
    totalEvents += 1;
    if (events.length > MAX_EVENTS) events.shift();
  };
  const fieldEvents = ["beforeinput", "input", "compositionstart", "compositionupdate", "compositionend", "focus", "blur"];
  const onFieldEvent = (event: Event) => record(event.type, event);
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
  for (const type of fieldEvents) field.addEventListener(type, onFieldEvent);
  win.addEventListener("focus", onWindowFocus);
  win.addEventListener("blur", onWindowBlur);

  return {
    stop() {
      if (stoppedReport) return stoppedReport;
      onMutations(observer.takeRecords());
      observer.disconnect();
      for (const type of fieldEvents) field.removeEventListener(type, onFieldEvent);
      win.removeEventListener("focus", onWindowFocus);
      win.removeEventListener("blur", onWindowBlur);
      stoppedReport = {
        environment,
        field: { ...fieldInfo, connectedAtStop: field.isConnected },
        durationMs: elapsed(),
        totalEvents,
        droppedEvents: totalEvents - events.length,
        mutations: { ...mutations },
        events: events.slice(),
      };
      return stoppedReport;
    },
  };
}
