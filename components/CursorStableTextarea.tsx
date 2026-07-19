"use client";

import {
  useLayoutEffect,
  useRef,
  type FormEvent,
  type TextareaHTMLAttributes,
} from "react";

type CursorStableTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

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

  return (
    <textarea
      {...props}
      ref={textareaRef}
      defaultValue={value}
      onInput={handleInput}
    />
  );
}
