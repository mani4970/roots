"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/nativeShare";
import QTInputComparisonPanel from "@/components/QTInputComparisonPanel";
import {
  startQTInputDiagnostics,
  isQTInputDiagnosticEditor,
  type QTInputDiagnosticReport,
} from "@/lib/qtInputDiagnostics";

type Editor = HTMLInputElement | HTMLTextAreaElement;
type Recording = ReturnType<typeof startQTInputDiagnostics>;

/** Temporary, explicitly activated observation. No writer props or callbacks. */
export default function QTInputDiagnosticPanel() {
  const recordingRef = useRef<Recording | null>(null);
  const lastEditorRef = useRef<Editor | null>(null);
  const [recording, setRecording] = useState(false);
  const [report, setReport] = useState<QTInputDiagnosticReport | null>(null);
  const [message, setMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [comparing, setComparing] = useState(false);
  const comparingRef = useRef(false);

  useEffect(() => {
    const rememberEditor = () => {
      if (isQTInputDiagnosticEditor(document.activeElement)) lastEditorRef.current = document.activeElement;
    };
    const toggle = () => {
      if (comparingRef.current) return;
      if (recordingRef.current) {
        const result = recordingRef.current.stop();
        recordingRef.current = null;
        setRecording(false);
        setReport(result);
        setCopyStatus("");
        return;
      }
      rememberEditor();
      const field = lastEditorRef.current;
      if (!isQTInputDiagnosticEditor(field)) {
        setMessage("묵상 입력칸을 한 번 누른 뒤 다시 시작해주세요.");
        return;
      }
      setMessage("");
      setReport(null);
      setCopyStatus("");
      recordingRef.current = startQTInputDiagnostics(field);
      setRecording(true);
    };
    const onShortcut = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || event.code !== "Digit9" ||
          !event.metaKey || !event.shiftKey || event.altKey || event.ctrlKey) return;
      event.preventDefault();
      toggle();
    };
    // Pointer fallback for native app builds that reserve Command shortcuts.
    // Only a deliberate triple-click on the page heading activates this tool.
    const onHeadingClick = (event: MouseEvent) => {
      if (event.detail !== 3 || !(event.target instanceof Element)) return;
      const heading = event.target.closest("h1");
      if (heading?.closest(".roots-qt-phase2a")) toggle();
    };
    document.addEventListener("focusin", rememberEditor);
    document.addEventListener("keydown", onShortcut);
    document.addEventListener("click", onHeadingClick);
    return () => {
      document.removeEventListener("focusin", rememberEditor);
      document.removeEventListener("keydown", onShortcut);
      document.removeEventListener("click", onHeadingClick);
      recordingRef.current?.stop();
      recordingRef.current = null;
      lastEditorRef.current = null;
    };
  }, []);

  const stop = () => {
    if (!recordingRef.current) return;
    // Freeze the trace before the Stop button takes focus.
    const result = recordingRef.current.stop();
    recordingRef.current = null;
    setRecording(false);
    setReport(result);
    setCopyStatus("");
  };

  if (comparing) return <QTInputComparisonPanel onClose={() => {
    comparingRef.current = false;
    setComparing(false);
  }} />;

  if (recording) {
    return (
      <aside aria-label="입력 점검" style={{ position: "fixed", bottom: 8, right: 8, zIndex: 1000, padding: "8px 12px", borderRadius: 12, background: "var(--surface-card)", color: "var(--text)", border: "1px solid var(--border)", boxShadow: "0 2px 12px #0002", fontSize: 12 }}>
        <div style={{ marginBottom: 4 }}>입력 점검 중 · 작성 단계가 바뀌어도 계속 기록합니다.</div>
        <button type="button" onPointerDown={stop} onClick={stop} style={{ font: "inherit", color: "inherit", background: "none", border: 0, textDecoration: "underline", cursor: "pointer" }}>종료하고 결과 보기</button>
      </aside>
    );
  }

  if (!report && !message) return null;

  return (
    <aside aria-label="입력 점검 결과" style={{ position: "fixed", inset: "8px", zIndex: 1000, margin: "auto", maxWidth: 620, maxHeight: "80dvh", overflowY: "auto", padding: 20, borderRadius: 16, background: "var(--surface-card)", color: "var(--text)", border: "1px solid var(--border)", boxShadow: "0 4px 30px #0004" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <strong>맥 입력 점검 결과</strong>
        <button type="button" onClick={() => { setReport(null); setMessage(""); }} style={{ padding: "8px 12px", font: "inherit", cursor: "pointer" }}>닫기</button>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.6 }}>{message || "입력 상태와 이벤트 순서만 담았습니다. 묵상 문장은 포함하지 않습니다. 결과를 복사해 보내주세요."}</p>
      <button type="button" onClick={() => {
        comparingRef.current = true;
        setComparing(true);
      }} style={{ padding: "10px 16px", font: "inherit", cursor: "pointer", marginBottom: 8 }}>예문으로 비교 점검</button>
      {report && <p style={{ fontSize: 13, lineHeight: 1.6 }}>
        점검 시간 {Math.floor(report.durationMs / 60000)}분 {Math.floor(report.durationMs / 1000) % 60}초 · 입력칸 {report.fields.length}개<br />
        최근 {report.events.length.toLocaleString()}건과 전체 누적 횟수를 담았습니다.
      </p>}
      {report && <button type="button" onClick={async () => {
        const copied = await copyText(JSON.stringify(report, null, 2));
        setCopyStatus(copied ? "복사했습니다." : "아래 결과를 직접 선택해 복사해주세요.");
      }} style={{ padding: "10px 16px", font: "inherit", cursor: "pointer" }}>결과 복사</button>}
      {copyStatus && <p role="status" style={{ fontSize: 13 }}>{copyStatus}</p>}
      {report && <pre tabIndex={0} aria-label="복사할 입력 점검 결과" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", userSelect: "text", WebkitUserSelect: "text", fontSize: 11, lineHeight: 1.5 }}>{JSON.stringify(report, null, 2)}</pre>}
    </aside>
  );
}
