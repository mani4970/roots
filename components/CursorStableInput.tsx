"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import { Capacitor } from "@capacitor/core";

type CursorStableInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

const APPLE_EDITOR_STATE_SYNC_DELAY_MS = 120;

type PendingAppleValue = {
  value: string;
  onValueChange: (value: string) => void;
};

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
 * Single-line input that keeps the active caret/selection stable across
 * unrelated parent renders such as draft autosave status updates.
 *
 * Mac/iPad WebKit owns the active editor value while the user is typing. The
 * latest value is forwarded after IME composition settles and immediately on
 * blur, matching CursorStableTextarea without changing the iPhone/mobile path.
 */
export default function CursorStableInput({
  value,
  onValueChange,
  onInput,
  type = "text",
  ...props
}: CursorStableInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastEmittedValueRef = useRef(value);
  const pendingAppleValueRef = useRef<PendingAppleValue | null>(null);
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

  const emitValue = (element: HTMLInputElement) => {
    const nextValue = element.value;
    if (nextValue === lastEmittedValueRef.current) return;

    lastEmittedValueRef.current = nextValue;
    onValueChange(nextValue);
  };

  useLayoutEffect(() => {
    const element = inputRef.current;
    if (!element) return;

    const isActive =
      typeof document !== "undefined" && document.activeElement === element;

    // Never replay an older React value or selection while WebKit/Korean IME
    // owns the active editor.
    if (isActive) return;

    if (element.value !== value) element.value = value;
    lastEmittedValueRef.current = value;
    pendingAppleValueRef.current = null;
  }, [value]);

  useLayoutEffect(() => {
    if (!protectAppleDesktopOrTabletCaret) return;

    const element = inputRef.current;
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

      const pendingValue = pendingAppleValueRef.current;
      pendingAppleValueRef.current = null;
      if (!pendingValue || pendingValue.value === lastEmittedValueRef.current) {
        return;
      }

      lastEmittedValueRef.current = pendingValue.value;
      pendingValue.onValueChange(pendingValue.value);
    };

    const rememberPendingValue = () => {
      // Keep the handler that belonged to this exact edit. The same DOM
      // position can render another reflection field after a step change, and
      // a delayed value must never be delivered to that newer field.
      pendingAppleValueRef.current = {
        value: element.value,
        onValueChange: onValueChangeRef.current,
      };
    };

    const scheduleValueSync = () => {
      cancelScheduledSync();
      syncTimer = window.setTimeout(
        flushPendingValue,
        APPLE_EDITOR_STATE_SYNC_DELAY_MS,
      );
    };

    const handleNativeInput = (event: Event) => {
      rememberPendingValue();
      onInputRef.current?.(
        event as unknown as FormEvent<HTMLInputElement>,
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
      rememberPendingValue();
      scheduleValueSync();
    };

    const handleBlur = () => {
      rememberPendingValue();
      flushPendingValue();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      rememberPendingValue();
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

  const handleInput = (event: FormEvent<HTMLInputElement>) => {
    emitValue(event.currentTarget);
    onInput?.(event);
  };

  const editorProps = protectAppleDesktopOrTabletCaret
    ? { autoCorrect: "off", spellCheck: false }
    : { defaultValue: value, onInput: handleInput };

  return (
    <input
      {...props}
      ref={inputRef}
      type={type}
      {...editorProps}
      data-cursor-stability={
        protectAppleDesktopOrTabletCaret ? "apple-isolated" : undefined
      }
    />
  );
}
