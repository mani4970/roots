"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CompositionEvent,
  type FormEvent,
  type SyntheticEvent,
  type TextareaHTMLAttributes,
} from "react";

type SelectionState = {
  start: number;
  end: number;
  direction: "forward" | "backward" | "none";
};

type CursorStableTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Controlled textarea that keeps the active caret/selection stable across
 * unrelated parent renders (for example, autosave status changes).
 *
 * It does not own or persist the text. The caller remains the single source of
 * truth, so Roots' existing draft/local-backup/Supabase save flow is unchanged.
 */
export default function CursorStableTextarea({
  value,
  onValueChange,
  onSelect,
  onInput,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: CursorStableTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposingRef = useRef(false);
  const lastEmittedValueRef = useRef(value);
  const selectionRef = useRef<SelectionState>({
    start: value.length,
    end: value.length,
    direction: "none",
  });

  useEffect(() => {
    lastEmittedValueRef.current = value;
  }, [value]);

  const rememberSelection = (element: HTMLTextAreaElement) => {
    if (typeof document !== "undefined" && document.activeElement !== element) return;

    selectionRef.current = {
      start: element.selectionStart ?? 0,
      end: element.selectionEnd ?? element.selectionStart ?? 0,
      direction: element.selectionDirection ?? "none",
    };
  };

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element || isComposingRef.current) return;
    if (typeof document !== "undefined" && document.activeElement !== element) return;

    const max = element.value.length;
    const start = Math.min(selectionRef.current.start, max);
    const end = Math.min(Math.max(selectionRef.current.end, start), max);

    if (
      element.selectionStart !== start ||
      element.selectionEnd !== end ||
      element.selectionDirection !== selectionRef.current.direction
    ) {
      try {
        element.setSelectionRange(start, end, selectionRef.current.direction);
      } catch {
        // Selection APIs can be unavailable while an IME/browser is finalizing input.
      }
    }
  });

  const handleSelect = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    rememberSelection(event.currentTarget);
    onSelect?.(event);
  };

  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    rememberSelection(event.currentTarget);
    onInput?.(event);
  };

  const handleCompositionStart = (event: CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = true;
    rememberSelection(event.currentTarget);
    onCompositionStart?.(event);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    rememberSelection(event.currentTarget);

    const finalValue = event.currentTarget.value;
    if (finalValue !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = finalValue;
      onValueChange(finalValue);
    }

    onCompositionEnd?.(event);
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      onChange={(event) => {
        rememberSelection(event.currentTarget);
        lastEmittedValueRef.current = event.currentTarget.value;
        onValueChange(event.currentTarget.value);
      }}
      onSelect={handleSelect}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
}
