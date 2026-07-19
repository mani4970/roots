"use client";

import {
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

  const rememberSelection = (element: HTMLTextAreaElement) => {
    if (typeof document !== "undefined" && document.activeElement !== element) return;

    selectionRef.current = {
      start: element.selectionStart ?? 0,
      end: element.selectionEnd ?? element.selectionStart ?? 0,
      direction: element.selectionDirection ?? "none",
    };
  };

  const emitValue = (element: HTMLTextAreaElement) => {
    const nextValue = element.value;
    if (nextValue === lastEmittedValueRef.current) return;

    lastEmittedValueRef.current = nextValue;
    onValueChange(nextValue);
  };

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element || isComposingRef.current) return;
    if (value === lastEmittedValueRef.current) return;

    const isActive =
      typeof document !== "undefined" && document.activeElement === element;
    const activeSelection = isActive
      ? {
          start: element.selectionStart ?? selectionRef.current.start,
          end: element.selectionEnd ?? selectionRef.current.end,
          direction: element.selectionDirection ?? selectionRef.current.direction,
        }
      : selectionRef.current;

    element.value = value;
    lastEmittedValueRef.current = value;

    if (!isActive) return;

    const max = value.length;
    const start = Math.min(activeSelection.start, max);
    const end = Math.min(Math.max(activeSelection.end, start), max);
    selectionRef.current = {
      start,
      end,
      direction: activeSelection.direction,
    };

    if (
      element.selectionStart !== start ||
      element.selectionEnd !== end ||
      element.selectionDirection !== activeSelection.direction
    ) {
      try {
        element.setSelectionRange(start, end, activeSelection.direction);
      } catch {
        // Selection APIs can be unavailable while an IME/browser is finalizing input.
      }
    }
  }, [value]);

  const handleSelect = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    rememberSelection(event.currentTarget);
    onSelect?.(event);
  };

  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    rememberSelection(event.currentTarget);
    emitValue(event.currentTarget);
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
    emitValue(event.currentTarget);
    onCompositionEnd?.(event);
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      defaultValue={value}
      onSelect={handleSelect}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
}
