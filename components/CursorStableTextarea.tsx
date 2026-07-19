"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type TextareaHTMLAttributes,
} from "react";
import { Capacitor } from "@capacitor/core";
import { copyText } from "@/lib/nativeShare";

type CursorStableTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

const APPLE_EDITOR_STATE_SYNC_DELAY_MS = 120;
const APPLE_CURSOR_DIAGNOSTIC_BUTTON_ID = "roots-apple-cursor-diagnostic";

type CursorDiagnosticDetail = Record<
  string,
  string | number | boolean | null
>;

type CursorDiagnosticEntry = {
  atMs: number;
  event: string;
  mountId: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  valueLength: number;
  active: boolean;
  connected: boolean;
  composing: boolean;
  detail?: CursorDiagnosticDetail;
};

type CursorDiagnosticStore = {
  sessionStartedAt: string;
  runtime: CursorDiagnosticDetail;
  nextMountId: number;
  entries: CursorDiagnosticEntry[];
};

type CursorDiagnosticWindow = Window & {
  __rootsAppleCursorDiagnostic?: CursorDiagnosticStore;
};

type CursorDiagnosticCapture = (
  event: string,
  detail?: CursorDiagnosticDetail,
) => void;

function getCapacitorRuntimeDetail(): CursorDiagnosticDetail {
  try {
    return {
      capacitorNative: Capacitor.isNativePlatform(),
      capacitorPlatform: Capacitor.getPlatform(),
    };
  } catch {
    return {
      capacitorNative: false,
      capacitorPlatform: "unavailable",
    };
  }
}

function getAppleCursorRuntimeDetail(
  protectedRuntime: boolean,
): CursorDiagnosticDetail {
  if (typeof window === "undefined") return {};

  return {
    protectedRuntime,
    userAgent: window.navigator.userAgent || "",
    platform: window.navigator.platform || "",
    maxTouchPoints: window.navigator.maxTouchPoints || 0,
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    ...getCapacitorRuntimeDetail(),
  };
}

function isAppleDesktopOrTabletRuntime() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";

  // Keep Roots' already-stable iPhone/mobile editor path completely unchanged.
  if (/iPhone|iPod/i.test(userAgent) || /iPhone|iPod/i.test(platform)) {
    return false;
  }

  const shortestScreenSide = Math.min(
    window.screen?.width || window.innerWidth,
    window.screen?.height || window.innerHeight,
  );
  const isTouchCapableMac =
    /Mac/i.test(platform) && window.navigator.maxTouchPoints > 1;

  // Also protect iPhones using a desktop-style Mac user agent.
  if (isTouchCapableMac && shortestScreenSide < 700) return false;

  // iPadOS can identify itself either as iPad or as a touch-capable Mac.
  const isIPad =
    /iPad/i.test(userAgent) ||
    /iPad/i.test(platform) ||
    isTouchCapableMac;
  const isMac =
    /Macintosh|Mac OS X/i.test(userAgent) || /Mac/i.test(platform);

  if (isIPad || isMac) return true;

  // Native iPad builds can expose a reduced user agent. Screen size is only a
  // fallback after the explicit iPhone exclusion above.
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
      return false;
    }

    return shortestScreenSide >= 700;
  } catch {
    return false;
  }
}

/**
 * Textarea that keeps the active caret/selection stable across unrelated
 * parent renders (for example, autosave status changes).
 *
 * On Mac/iPad WebKit, the native DOM editor is isolated from React input
 * re-renders while the user is typing. The latest text is forwarded after IME
 * composition settles (and immediately on blur), so autosave still receives it
 * without replaying an older WebKit selection. Other devices retain Roots'
 * existing input path unchanged.
 */
export default function CursorStableTextarea({
  value,
  onValueChange,
  onInput,
  ...props
}: CursorStableTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastEmittedValueRef = useRef(value);
  const pendingAppleValueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const onInputRef = useRef(onInput);
  const diagnosticCaptureRef = useRef<CursorDiagnosticCapture | null>(null);
  const [protectAppleDesktopOrTabletCaret, setProtectAppleDesktopOrTabletCaret] =
    useState(false);

  onValueChangeRef.current = onValueChange;
  onInputRef.current = onInput;

  // Keep server output and the first hydration render identical. Apple-only
  // isolation is enabled in a layout effect before the user can begin typing.
  useLayoutEffect(() => {
    if (isAppleDesktopOrTabletRuntime()) {
      setProtectAppleDesktopOrTabletCaret(true);
    }
  }, []);

  const emitValue = (element: HTMLTextAreaElement) => {
    const nextValue = element.value;
    if (nextValue === lastEmittedValueRef.current) return;

    lastEmittedValueRef.current = nextValue;
    onValueChange(nextValue);
  };

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    const isActive =
      typeof document !== "undefined" && document.activeElement === element;

    diagnosticCaptureRef.current?.("react-value-effect", {
      incomingValueLength: value.length,
      domValueLength: element.value.length,
      valuesMatch: element.value === value,
      skippedBecauseActive: isActive,
    });

    // While the user is editing, the native textarea is the only authority for
    // both its value and caret. In particular, never replay an older React value
    // or selection during WebKit/Korean IME composition or an autosave render.
    if (isActive) return;

    if (element.value !== value) {
      diagnosticCaptureRef.current?.("react-value-write", {
        incomingValueLength: value.length,
        domValueLength: element.value.length,
      });
      element.value = value;
    }
    lastEmittedValueRef.current = value;
    pendingAppleValueRef.current = value;
  }, [value]);

  // Temporary Apple-only telemetry for the cursor incident. It observes native
  // events and DOM identity without writing the textarea value or selection.
  // The copied report lets us distinguish a WebKit/IME selection change from a
  // React value replay, focus loss, or textarea remount. iPhone/Android never
  // enter this effect because the same runtime gate protects it.
  useLayoutEffect(() => {
    if (!protectAppleDesktopOrTabletCaret) return;

    const element = textareaRef.current;
    if (!element) return;

    const diagnosticWindow = window as CursorDiagnosticWindow;
    const store = diagnosticWindow.__rootsAppleCursorDiagnostic ?? {
      sessionStartedAt: new Date().toISOString(),
      runtime: getAppleCursorRuntimeDetail(true),
      nextMountId: 0,
      entries: [],
    };
    diagnosticWindow.__rootsAppleCursorDiagnostic = store;

    const mountId = ++store.nextMountId;
    let isComposing = false;
    let lastObservedSelection = element.selectionStart;
    let lastIntentionalSelectionAt = -Infinity;

    const updateDiagnosticButton = (anomaly = false) => {
      const button = document.getElementById(
        APPLE_CURSOR_DIAGNOSTIC_BUTTON_ID,
      ) as HTMLButtonElement | null;
      if (!button) return;

      button.textContent = anomaly
        ? "커서 이동 감지 · 진단 복사"
        : "커서 진단 복사 · ON";
      button.style.background = anomaly ? "#9f3f37" : "#315f42";
    };

    const capture: CursorDiagnosticCapture = (event, detail) => {
      const now = window.performance.now();
      const selectionStart = element.selectionStart;
      const selectionEnd = element.selectionEnd;
      const active = document.activeElement === element;
      const isCollapsed = selectionStart === selectionEnd;
      const movedBackwardUnexpectedly =
        active &&
        !isComposing &&
        isCollapsed &&
        selectionStart !== null &&
        lastObservedSelection !== null &&
        lastObservedSelection - selectionStart >= 2 &&
        now - lastIntentionalSelectionAt > 500;

      store.entries.push({
        atMs: Math.round(now * 10) / 10,
        event,
        mountId,
        selectionStart,
        selectionEnd,
        valueLength: element.value.length,
        active,
        connected: element.isConnected,
        composing: isComposing,
        detail,
      });
      if (store.entries.length > 240) {
        store.entries.splice(0, store.entries.length - 240);
      }

      if (selectionStart !== null) lastObservedSelection = selectionStart;
      if (movedBackwardUnexpectedly) updateDiagnosticButton(true);
    };
    diagnosticCaptureRef.current = capture;

    const ensureDiagnosticButton = () => {
      let button = document.getElementById(
        APPLE_CURSOR_DIAGNOSTIC_BUTTON_ID,
      ) as HTMLButtonElement | null;

      if (!button) {
        button = document.createElement("button");
        button.id = APPLE_CURSOR_DIAGNOSTIC_BUTTON_ID;
        button.type = "button";
        button.setAttribute("aria-label", "Apple 커서 진단 기록 복사");
        Object.assign(button.style, {
          position: "fixed",
          top: "calc(env(safe-area-inset-top, 0px) + 70px)",
          right: "10px",
          zIndex: "2147483647",
          border: "0",
          borderRadius: "999px",
          padding: "7px 10px",
          background: "#315f42",
          color: "#fff",
          fontSize: "11px",
          fontWeight: "700",
          lineHeight: "1.2",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          cursor: "pointer",
        });
        document.body.appendChild(button);
      }

      button.onclick = async () => {
        capture("diagnostic-copy-click");
        const report = JSON.stringify(
          {
            sessionStartedAt: store.sessionStartedAt,
            copiedAt: new Date().toISOString(),
            runtime: store.runtime,
            entries: store.entries,
          },
          null,
          2,
        );

        const copied = await copyText(report);
        button!.textContent = copied
          ? "진단 복사됨"
          : "복사 실패 · 다시 눌러주세요";
      };
      updateDiagnosticButton(false);
    };

    const captureInputEvent = (event: Event) => {
      const inputEvent = event as InputEvent;
      capture(event.type, {
        inputType: inputEvent.inputType || "",
        eventIsComposing: Boolean(inputEvent.isComposing),
        data: inputEvent.data ?? "",
      });

      window.requestAnimationFrame(() => {
        capture(`${event.type}-animation-frame`);
      });
    };
    const handleFocus = () => {
      ensureDiagnosticButton();
      capture("focus");
    };
    const handleBlur = () => capture("blur");
    const handleCompositionStart = () => {
      isComposing = true;
      capture("compositionstart");
    };
    const handleCompositionUpdate = (event: CompositionEvent) => {
      capture("compositionupdate", { data: event.data || "" });
    };
    const handleCompositionEnd = (event: CompositionEvent) => {
      capture("compositionend", { data: event.data || "" });
      isComposing = false;
      window.requestAnimationFrame(() => capture("compositionend-animation-frame"));
    };
    const handlePointerDown = () => {
      lastIntentionalSelectionAt = window.performance.now();
      capture("pointerdown");
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.startsWith("Arrow") ||
        event.key === "Home" ||
        event.key === "End" ||
        event.key === "PageUp" ||
        event.key === "PageDown"
      ) {
        lastIntentionalSelectionAt = window.performance.now();
      }
      capture("keydown", {
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      });
    };
    const handleSelectionChange = () => {
      if (document.activeElement === element) capture("selectionchange");
    };
    const handleVisibilityChange = () => {
      capture("visibilitychange", { visibilityState: document.visibilityState });
    };

    element.addEventListener("beforeinput", captureInputEvent);
    element.addEventListener("input", captureInputEvent);
    element.addEventListener("focus", handleFocus);
    element.addEventListener("blur", handleBlur);
    element.addEventListener("compositionstart", handleCompositionStart);
    element.addEventListener("compositionupdate", handleCompositionUpdate);
    element.addEventListener("compositionend", handleCompositionEnd);
    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("keydown", handleKeyDown);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    capture("diagnostic-mounted", {
      initialValueMatchesProp: element.value === value,
    });
    if (document.activeElement === element) ensureDiagnosticButton();

    return () => {
      capture("diagnostic-unmounted");
      if (diagnosticCaptureRef.current === capture) {
        diagnosticCaptureRef.current = null;
      }
      element.removeEventListener("beforeinput", captureInputEvent);
      element.removeEventListener("input", captureInputEvent);
      element.removeEventListener("focus", handleFocus);
      element.removeEventListener("blur", handleBlur);
      element.removeEventListener("compositionstart", handleCompositionStart);
      element.removeEventListener("compositionupdate", handleCompositionUpdate);
      element.removeEventListener("compositionend", handleCompositionEnd);
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [protectAppleDesktopOrTabletCaret]);

  useLayoutEffect(() => {
    if (!protectAppleDesktopOrTabletCaret) return;

    const element = textareaRef.current;
    if (!element) return;

    let isComposing = false;
    let syncTimer: number | null = null;

    const cancelScheduledSync = () => {
      if (syncTimer === null) return;
      window.clearTimeout(syncTimer);
      syncTimer = null;
    };

    const flushPendingValue = () => {
      cancelScheduledSync();

      const nextValue = pendingAppleValueRef.current;
      if (nextValue === lastEmittedValueRef.current) {
        diagnosticCaptureRef.current?.("apple-flush-skipped-same-value");
        return;
      }

      diagnosticCaptureRef.current?.("apple-flush-parent-value", {
        emittedValueLength: nextValue.length,
      });
      lastEmittedValueRef.current = nextValue;
      onValueChangeRef.current(nextValue);
    };

    const scheduleValueSync = () => {
      cancelScheduledSync();
      syncTimer = window.setTimeout(
        flushPendingValue,
        APPLE_EDITOR_STATE_SYNC_DELAY_MS,
      );
    };

    const handleNativeInput = (event: Event) => {
      pendingAppleValueRef.current = element.value;
      onInputRef.current?.(
        event as unknown as FormEvent<HTMLTextAreaElement>,
      );

      const inputEvent = event as InputEvent;
      diagnosticCaptureRef.current?.("apple-native-input-handler", {
        inputType: inputEvent.inputType || "",
        eventIsComposing: Boolean(inputEvent.isComposing),
      });
      if (!isComposing && !inputEvent.isComposing) scheduleValueSync();
    };

    const handleCompositionStart = () => {
      isComposing = true;
      diagnosticCaptureRef.current?.("apple-native-composition-start");
      cancelScheduledSync();
    };

    const handleCompositionEnd = () => {
      isComposing = false;
      pendingAppleValueRef.current = element.value;
      diagnosticCaptureRef.current?.("apple-native-composition-end");
      scheduleValueSync();
    };

    const handleBlur = () => {
      pendingAppleValueRef.current = element.value;
      diagnosticCaptureRef.current?.("apple-native-blur-flush");
      flushPendingValue();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      pendingAppleValueRef.current = element.value;
      flushPendingValue();
    };

    element.addEventListener("input", handleNativeInput);
    element.addEventListener("compositionstart", handleCompositionStart);
    element.addEventListener("compositionend", handleCompositionEnd);
    element.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelScheduledSync();
      element.removeEventListener("input", handleNativeInput);
      element.removeEventListener("compositionstart", handleCompositionStart);
      element.removeEventListener("compositionend", handleCompositionEnd);
      element.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [protectAppleDesktopOrTabletCaret]);

  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    emitValue(event.currentTarget);
    onInput?.(event);
  };

  // React 18 writes a supplied textarea defaultValue back to the DOM during
  // updates. Mac/iPad therefore receive neither a React value prop nor a React
  // input handler while editing. Mobile retains the exact existing props.
  const editorProps = protectAppleDesktopOrTabletCaret
    ? {}
    : { defaultValue: value, onInput: handleInput };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      {...editorProps}
      data-cursor-stability={
        protectAppleDesktopOrTabletCaret ? "apple-isolated" : undefined
      }
    />
  );
}
