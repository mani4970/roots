"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type TextareaHTMLAttributes,
} from "react";
import { Capacitor } from "@capacitor/core";

type CursorStableTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

const APPLE_EDITOR_STATE_SYNC_DELAY_MS = 120;
const HANGUL_TEXT_PATTERN = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;

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

    // While the user is editing, the native textarea is the only authority for
    // both its value and caret. In particular, never replay an older React value
    // or selection during WebKit/Korean IME composition or an autosave render.
    if (isActive) return;

    if (element.value !== value) element.value = value;
    lastEmittedValueRef.current = value;
    pendingAppleValueRef.current = value;
  }, [value]);

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
      if (nextValue === lastEmittedValueRef.current) return;

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

    const handleBeforeInput = (event: Event) => {
      const inputEvent = event as InputEvent;
      const replacementText = inputEvent.data ?? "";
      const hasHangulContext =
        HANGUL_TEXT_PATTERN.test(replacementText) ||
        HANGUL_TEXT_PATTERN.test(element.value);

      // The captured Mac/iPad incident contained no React value write, focus
      // loss, or textarea remount. WebKit instead emitted cancelable
      // insertReplacementText events for Korean writing suggestions and moved
      // the caret to the end of the replacement range. Normal typing, IME
      // composition, paste, deletion, line breaks, and English-only replacement
      // suggestions remain unchanged.
      if (
        inputEvent.inputType === "insertReplacementText" &&
        hasHangulContext &&
        !inputEvent.isComposing &&
        event.cancelable
      ) {
        event.preventDefault();
      }
    };

    const handleNativeInput = (event: Event) => {
      pendingAppleValueRef.current = element.value;
      onInputRef.current?.(
        event as unknown as FormEvent<HTMLTextAreaElement>,
      );

      const inputEvent = event as InputEvent;
      if (!isComposing && !inputEvent.isComposing) scheduleValueSync();
    };

    const handleCompositionStart = () => {
      isComposing = true;
      cancelScheduledSync();
    };

    const handleCompositionEnd = () => {
      isComposing = false;
      pendingAppleValueRef.current = element.value;
      scheduleValueSync();
    };

    const handleBlur = () => {
      pendingAppleValueRef.current = element.value;
      flushPendingValue();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      pendingAppleValueRef.current = element.value;
      flushPendingValue();
    };

    element.addEventListener("beforeinput", handleBeforeInput);
    element.addEventListener("input", handleNativeInput);
    element.addEventListener("compositionstart", handleCompositionStart);
    element.addEventListener("compositionend", handleCompositionEnd);
    element.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelScheduledSync();
      element.removeEventListener("beforeinput", handleBeforeInput);
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
