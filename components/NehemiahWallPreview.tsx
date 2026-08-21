"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import RewardMapAction from "@/components/RewardMapAction";
import NehemiahWallAction, { NEHEMIAH_ACTION_LAYOUT } from "@/components/NehemiahWallAction";
import {
  NEHEMIAH_WALL_STAGES,
  getNehemiahStageProgress,
  getNehemiahWallBackground,
  getNehemiahWallStage,
  normalizeNehemiahDay,
} from "@/lib/nehemiahWall";
import type { RootsAvatarType } from "@/lib/avatar";

const VIEWPORT_WIDTHS = [320, 390, 430, 520] as const;

export default function NehemiahWallPreview() {
  const [day, setDay] = useState(19);
  const [isNight, setIsNight] = useState(false);
  const [avatarType, setAvatarType] = useState<RootsAvatarType>("rootsman");
  const [previewWidth, setPreviewWidth] = useState<(typeof VIEWPORT_WIDTHS)[number]>(390);
  const [runToken, setRunToken] = useState(1);
  const [showGuides, setShowGuides] = useState(true);
  const [transparentCheck, setTransparentCheck] = useState(false);
  const [showPeaceArkReference, setShowPeaceArkReference] = useState(true);

  const normalizedDay = normalizeNehemiahDay(day);
  const stage = useMemo(() => getNehemiahWallStage(normalizedDay), [normalizedDay]);
  const progress = useMemo(() => getNehemiahStageProgress(normalizedDay), [normalizedDay]);
  const background = getNehemiahWallBackground(normalizedDay, isNight);
  const referenceBackground = `/images/reward-maps/peace-ark/backgrounds/ark_stage08_${isNight ? "evening" : "morning"}.webp`;

  function replay() {
    setRunToken(value => value + 1);
  }

  function selectDay(nextDay: number) {
    setDay(normalizeNehemiahDay(nextDay));
    setRunToken(value => value + 1);
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "20px 14px 64px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <header style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "var(--terra-dark)", fontWeight: 900, letterSpacing: ".08em", marginBottom: 6 }}>
            DEV PREVIEW · 아직 201–300일 production 연결 전
          </div>
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.3 }}>느헤미야 성벽 중수 맵 프리뷰</h1>
          <p style={{ margin: "8px 0 0", color: "var(--text3)", fontSize: 13, lineHeight: 1.7 }}>
            화평의 방주에서 실제 사용 중인 걷기 시트와 크기(프레임 폭 38px)를 기준으로 맞췄습니다. 11–15일과 16–18일 이동 장면만 오른쪽에서 들어와 왼쪽으로 통과하고, 나머지 액션은 오른쪽에서 등장해 같은 위치에서 동작한 뒤 다시 오른쪽으로 퇴장합니다.
          </p>
        </header>

        <section style={panelStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            <Control label="느헤미야 Day">
              <input
                type="number"
                min={1}
                max={100}
                value={day}
                onChange={event => selectDay(Number(event.target.value))}
                style={inputStyle}
              />
            </Control>
            <Control label="캐릭터">
              <div style={segmentedStyle}>
                <Segment active={avatarType === "rootsman"} onClick={() => { setAvatarType("rootsman"); replay(); }}>Rootsman</Segment>
                <Segment active={avatarType === "rootswoman"} onClick={() => { setAvatarType("rootswoman"); replay(); }}>Rootswoman</Segment>
              </div>
            </Control>
            <Control label="시간대">
              <div style={segmentedStyle}>
                <Segment active={!isNight} onClick={() => { setIsNight(false); replay(); }}>오전</Segment>
                <Segment active={isNight} onClick={() => { setIsNight(true); replay(); }}>저녁</Segment>
              </div>
            </Control>
            <Control label="카드 폭">
              <select value={previewWidth} onChange={event => setPreviewWidth(Number(event.target.value) as typeof previewWidth)} style={inputStyle}>
                {VIEWPORT_WIDTHS.map(width => <option key={width} value={width}>{width}px</option>)}
              </select>
            </Control>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <Toggle active={showGuides} onClick={() => setShowGuides(value => !value)}>기준선 {showGuides ? "ON" : "OFF"}</Toggle>
            <Toggle active={transparentCheck} onClick={() => setTransparentCheck(value => !value)}>투명 배경 검사 {transparentCheck ? "ON" : "OFF"}</Toggle>
            <Toggle active={showPeaceArkReference} onClick={() => setShowPeaceArkReference(value => !value)}>화평의 방주 비교 {showPeaceArkReference ? "ON" : "OFF"}</Toggle>
            <button type="button" onClick={replay} style={primaryButtonStyle}>동작 다시 재생</button>
          </div>
        </section>

        <section style={{ ...panelStyle, marginTop: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {NEHEMIAH_WALL_STAGES.map(item => (
              <button
                key={item.stageNumber}
                type="button"
                onClick={() => selectDay(item.startDay)}
                style={{
                  border: stage.stageNumber === item.stageNumber ? "1px solid var(--sage-dark)" : "1px solid var(--border)",
                  background: stage.stageNumber === item.stageNumber ? "var(--sage-light)" : "var(--bg2)",
                  color: "var(--text)",
                  borderRadius: 999,
                  padding: "6px 9px",
                  fontSize: 11,
                  fontWeight: 750,
                  cursor: "pointer",
                }}
              >
                {item.startDay === item.endDay ? `${item.startDay}일` : `${item.startDay}–${item.endDay}일`}
              </button>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 16 }}>
          <div style={{ width: "100%", maxWidth: previewWidth, margin: "0 auto" }}>
            <PreviewMeta
              title={`느헤미야 ${normalizedDay}일 · 누적 ${200 + normalizedDay}일`}
              sub={`Stage ${stage.stageNumber} · ${stage.label} · ${progress.current}/${progress.total}`}
            />
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16 / 9", background: transparentCheck ? checkerboardBackground : "#6c5947", boxShadow: "0 12px 34px rgba(0,0,0,.18)" }}>
              {!transparentCheck && (
                <img
                  src={background}
                  alt={`Nehemiah stage ${stage.stageNumber}`}
                  draggable={false}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }}
                />
              )}
              <NehemiahWallAction
                trigger
                action={stage.action}
                avatarType={avatarType}
                replayToken={`${normalizedDay}-${avatarType}-${isNight}-${runToken}`}
                showGuides={showGuides}
              />
              {!transparentCheck && (
                <div style={{ position: "absolute", top: 9, left: 9, zIndex: 20, padding: "3px 8px", borderRadius: 999, background: "rgba(26,28,30,.7)", color: "#fff", fontSize: 9, fontWeight: 800 }}>
                  {stage.label}
                </div>
              )}
            </div>
          </div>
        </section>

        {showPeaceArkReference && (
          <section style={{ marginTop: 22 }}>
            <div style={{ width: "100%", maxWidth: previewWidth, margin: "0 auto" }}>
              <PreviewMeta title="화평의 방주 실제 크기 기준" sub="현재 production arkHammer 동작 그대로 · 걷기 프레임 폭 38px" />
              <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16 / 9", background: "#6c5947", boxShadow: "0 12px 34px rgba(0,0,0,.14)" }}>
                <img src={referenceBackground} alt="Peace Ark reference" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }} />
                {showGuides && (
                  <>
                    <div style={{ position: "absolute", left: NEHEMIAH_ACTION_LAYOUT.actionLeft, top: 0, bottom: 0, borderLeft: "1px dashed rgba(224,89,72,.8)", zIndex: 9 }} />
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: NEHEMIAH_ACTION_LAYOUT.groundBottom, borderTop: "1px dashed rgba(75,129,224,.9)", zIndex: 9 }} />
                  </>
                )}
                <RewardMapAction key={`ark-reference-${avatarType}-${isNight}-${runToken}`} trigger action="arkHammer" avatarType={avatarType} />
              </div>
            </div>
          </section>
        )}

        <section style={{ ...panelStyle, marginTop: 22 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>이번 프리뷰에서 고정한 기준</h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text3)", fontSize: 12, lineHeight: 1.8 }}>
            <li>일반 액션은 오른쪽 바깥 104% → 공통 액션 위치 57% → 다시 오른쪽 104%로 퇴장</li>
            <li>11–15일 일반 걷기와 16–18일 등불 걷기만 오른쪽 104% → 왼쪽 -12%로 통과</li>
            <li>공통 지면 기준 bottom 7%, 각 시트의 투명 여백 차이만 px 단위로 보정</li>
            <li>일반 걷기는 새로 만들지 않고 화평의 방주 production 걷기 시트를 그대로 사용</li>
            <li>70일과 71–80일 모두 제공된 4프레임 wave 사용</li>
            <li>1–7일과 8–10일 배경이 같은 것은 의도된 구성</li>
            <li>등불 걷기 시트는 흰색 matte/fill 잔여 픽셀을 제거해 투명 배경을 정리</li>
            <li>301일부터는 아직 새 맵으로 연결하지 않음</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function PreviewMeta({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "end", marginBottom: 7 }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <span style={{ fontSize: 10, color: "var(--text3)", textAlign: "right" }}>{sub}</span>
    </div>
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 800 }}>{label}</span>
      {children}
    </label>
  );
}

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, border: "none", background: active ? "var(--sage)" : "transparent", color: active ? "var(--bg)" : "var(--text3)", borderRadius: 10, padding: "8px 7px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
      {children}
    </button>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ border: `1px solid ${active ? "var(--sage-dark)" : "var(--border)"}`, background: active ? "var(--sage-light)" : "var(--bg2)", color: "var(--text)", borderRadius: 12, padding: "8px 10px", fontSize: 11, fontWeight: 750, cursor: "pointer" }}>
      {children}
    </button>
  );
}

const panelStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 18,
  background: "var(--bg2)",
  padding: 14,
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  borderRadius: 10,
  padding: "8px 9px",
  fontSize: 12,
};

const segmentedStyle: CSSProperties = {
  display: "flex",
  gap: 3,
  padding: 3,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  borderRadius: 12,
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  background: "var(--sage)",
  color: "var(--bg)",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 850,
  cursor: "pointer",
};

const checkerboardBackground = "repeating-conic-gradient(#d9d9d9 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px";
