"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import CursorStableTextarea from "@/components/CursorStableTextarea";
import { copyText } from "@/lib/nativeShare";
import { startQTInputDiagnostics, type QTInputDiagnosticReport } from "@/lib/qtInputDiagnostics";

type Mode = "plain-textarea" | "roots-editor";
type Recording = ReturnType<typeof startQTInputDiagnostics>;
type Trial = { mode: Mode; userObservedDuplication: boolean; diagnostics: QTInputDiagnosticReport };
const LABELS: Record<Mode, string> = { "plain-textarea": "A · 일반 입력칸", "roots-editor": "B · 묵상 입력 방식" };
const buttonStyle: CSSProperties = { padding: "10px 14px", font: "inherit", cursor: "pointer" };
const fieldStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: 12, font: "inherit", fontSize: 18, lineHeight: 1.7, resize: "vertical" };

/** Each trial has its own temporary value. Nothing reaches the reflection writer. */
function TrialField({ mode, onReady }: { mode: Mode; onReady: (recording: Recording) => void }) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const [testValue, setTestValue] = useState("");
  useEffect(() => {
    const scope = scopeRef.current;
    const field = scope?.querySelector("textarea");
    if (!scope || !field) return;
    const recording = startQTInputDiagnostics(field, { scope });
    onReady(recording);
    field.focus();
    return () => { recording.stop(); };
  }, [onReady]);

  return <div ref={scopeRef}>
    {mode === "plain-textarea"
      ? <textarea aria-label={LABELS[mode]} className="textarea-field" rows={6} autoCorrect="off" spellCheck={false} style={fieldStyle} />
      : <CursorStableTextarea aria-label={LABELS[mode]} className="textarea-field" rows={6} value={testValue} onValueChange={setTestValue} style={fieldStyle} />}
  </div>;
}

/** Explicit comparison only; no database, draft storage, navigation, or persistent settings. */
export default function QTInputComparisonPanel({ onClose }: { onClose: () => void }) {
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [showReport, setShowReport] = useState(false);
  const recordingRef = useRef<Recording | null>(null);
  const activeModeRef = useRef<Mode | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef((recording: Recording) => { recordingRef.current = recording; });

  useEffect(() => {
    dialogRef.current?.focus();
    return () => { recordingRef.current?.stop(); recordingRef.current = null; };
  }, []);

  const start = (mode: Mode) => {
    if (activeModeRef.current) return;
    setCopyStatus("");
    setShowReport(false);
    activeModeRef.current = mode;
    setActiveMode(mode);
  };
  const finish = (userObservedDuplication: boolean) => {
    const recording = recordingRef.current;
    const mode = activeModeRef.current;
    if (!recording || !mode) return;
    // Freeze before the button takes focus or the example field is removed.
    const diagnostics = recording.stop();
    recordingRef.current = null;
    activeModeRef.current = null;
    setTrials(previous => [...previous, { mode, userObservedDuplication, diagnostics }]);
    setActiveMode(null);
    dialogRef.current?.focus();
  };
  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || event.isDefaultPrevented()) return;
    const dialog = dialogRef.current;
    const controls = dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), textarea:not([disabled]), pre[tabindex]");
    if (!dialog || !controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
      event.preventDefault(); first.focus();
    }
  };
  const report = { kind: "roots-ime-comparison", version: 1, exampleTextIncluded: false, trials };

  return <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "#0008", display: "grid", placeItems: "center", padding: 12 }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="맥 예문 입력 비교 점검" tabIndex={-1} onKeyDown={trapTab}
      style={{ width: "100%", maxWidth: 680, maxHeight: "90dvh", overflowY: "auto", boxSizing: "border-box", padding: 20, borderRadius: 16, background: "var(--surface-card)", color: "var(--text)", fontSize: 14, lineHeight: 1.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong>맥 예문 입력 비교 점검</strong>
        {!activeMode && <button type="button" style={buttonStyle} onClick={onClose}>닫기</button>}
      </div>
      <p>아래 예문만 평소 속도로 직접 입력해보세요. 중간에 지우고 다시 작성해도 됩니다.</p>
      <p style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, fontSize: 18 }}>이렇게 작성하다가 지우고 다시 이렇게 작성합니다.</p>
      <p>이 입력칸은 묵상 기록과 연결되지 않습니다. 예문 내용도 결과에 포함하지 않습니다.</p>
      {activeMode ? <>
        <p><strong>{LABELS[activeMode]} · 기록 중</strong></p>
        <TrialField mode={activeMode} onReady={readyRef.current} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={buttonStyle} onPointerDown={() => finish(true)} onClick={() => finish(true)}>중복 발생 · 기록 끝내기</button>
          <button type="button" style={buttonStyle} onPointerDown={() => finish(false)} onClick={() => finish(false)}>이번에는 이상 없이 마치기</button>
        </div>
      </> : <>
        <p>A와 B에서 각각 같은 예문을 작성해주세요. 잠깐 증상이 없었다고 해결된 것으로 판단하지는 않습니다.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={buttonStyle} onClick={() => start("plain-textarea")}>{LABELS["plain-textarea"]} 시작</button>
          <button type="button" style={buttonStyle} onClick={() => start("roots-editor")}>{LABELS["roots-editor"]} 시작</button>
        </div>
        {trials.length > 0 && <>
          <ul>{trials.map((trial, index) => <li key={index}>{index + 1}. {LABELS[trial.mode]} · {trial.userObservedDuplication ? "중복 현상 발견" : "이번 점검에서 발견하지 못함"} · {Math.round(trial.diagnostics.durationMs / 1000)}초</li>)}</ul>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle} onClick={async () => {
              const copied = await copyText(JSON.stringify(report, null, 2));
              setCopyStatus(copied ? "복사했습니다. 결과를 보내주세요." : "아래 결과를 직접 선택해 복사해주세요.");
              if (!copied) setShowReport(true);
            }}>비교 결과 복사</button>
            <button type="button" style={buttonStyle} onClick={() => setShowReport(previous => !previous)}>결과 보기</button>
          </div>
          {copyStatus && <p role="status">{copyStatus}</p>}
          {showReport && <pre tabIndex={0} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", userSelect: "text", WebkitUserSelect: "text", fontSize: 11 }}>{JSON.stringify(report, null, 2)}</pre>}
        </>}
      </>}
    </div>
  </div>;
}
