"use client";

import {
  useLayoutEffect,
  useRef,
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

function isNativeAppleTabletRuntime() {
  if (typeof window === "undefined") return false;

  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
      return false;
    }

    const shortestScreenSide = Math.min(
      window.screen?.width || window.innerWidth,
      window.screen?.height || window.innerHeight,
    );

    return shortestScreenSide >= 768;
  } catch {
    return false;
  }
}

/**
 * Textarea that keeps the active caret/selection stable across unrelated
 * parent renders (for example, autosave status changes).
 *
 * The live DOM value is left untouched while the user types, and every input is
 * still sent to the caller immediately. This keeps Roots' existing
 * draft/local-backup/Supabase save flow unchanged without letting a parent
 * render rewrite the active textarea value on WebKit.
 */
export default function CursorStableTextarea({
  value,
  onValueChange,
  onInput,
  ...props
}: CursorStableTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastEmittedValueRef = useRef(value);
  const protectNativeAppleTabletCaret = isNativeAppleTabletRuntime();

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
  }, [value]);

  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    emitValue(event.currentTarget);
    onInput?.(event);
  };

  // React 18 writes a supplied textarea defaultValue back to the DOM during
  // updates. Do not supply that prop in the native Apple tablet runtime: the
  // layout effect above initializes/synchronizes the unfocused element, while
  // the active WebKit editor remains completely untouched during typing.
  const initialValueProps = protectNativeAppleTabletCaret
    ? {}
    : { defaultValue: value };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      {...initialValueProps}
      onInput={handleInput}
    />
  );
}
