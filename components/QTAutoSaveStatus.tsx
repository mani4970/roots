"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { Loader2, Save } from "lucide-react";

export type QTAutoSaveStatusValue = "idle" | "saving" | "saved" | "error";

export type QTAutoSaveStatusHandle = {
  setStatus: (status: QTAutoSaveStatusValue, savedAt?: string) => void;
};

type QTAutoSaveStatusProps = {
  initialStatus?: QTAutoSaveStatusValue;
  initialSavedAt?: string;
  isEditMode: boolean;
  visible: boolean;
  idleText: string;
  savingText: string;
  savedText: string;
  savedWithTimeText: string;
  errorText: string;
  editModeText: string;
};

type QTAutoSaveStatusState = {
  status: QTAutoSaveStatusValue;
  savedAt: string;
};

/**
 * Keeps auto-save feedback state outside the large QT writer component.
 *
 * On WebKit/macOS and iPadOS, re-rendering a large controlled textarea tree
 * while Korean IME composition is active can reset the live DOM selection to
 * the last committed React value. Auto-save status changes are visual-only, so
 * they must not trigger a re-render of the writer and its active textarea.
 */
const QTAutoSaveStatus = forwardRef<QTAutoSaveStatusHandle, QTAutoSaveStatusProps>(
  function QTAutoSaveStatus(
    {
      initialStatus = "idle",
      initialSavedAt = "",
      isEditMode,
      visible,
      idleText,
      savingText,
      savedText,
      savedWithTimeText,
      errorText,
      editModeText,
    },
    ref,
  ) {
    const [state, setState] = useState<QTAutoSaveStatusState>({
      status: initialStatus,
      savedAt: initialSavedAt,
    });

    useImperativeHandle(ref, () => ({
      setStatus(nextStatus, nextSavedAt) {
        setState(current => {
          const savedAt = nextSavedAt ?? current.savedAt;
          if (current.status === nextStatus && current.savedAt === savedAt) {
            return current;
          }
          return { status: nextStatus, savedAt };
        });
      },
    }), []);

    if (!visible) return null;

    if (isEditMode) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 18, color: "var(--text-muted-readable)", fontSize: 11 }}>
          <Save size={12} />
          <span>{editModeText}</span>
        </div>
      );
    }

    const statusText = state.status === "saving"
      ? savingText
      : state.status === "saved"
        ? (state.savedAt ? savedWithTimeText.replace("{time}", state.savedAt) : savedText)
        : state.status === "error"
          ? errorText
          : idleText;

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 18, color: state.status === "error" ? "var(--terra-dark)" : "var(--text-muted-readable)", fontSize: 11 }}>
        {state.status === "saving" ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
        <span>{statusText}</span>
      </div>
    );
  },
);

QTAutoSaveStatus.displayName = "QTAutoSaveStatus";

export default QTAutoSaveStatus;
