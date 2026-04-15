"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const EMOTIONS = [
  {
    category: "기쁨 & 감사",
    color: "rgba(232,197,71,0.15)",
    border: "rgba(232,197,71,0.3)",
    labelColor: "rgba(180,140,30,0.9)",
    items: [
      { id: "grateful", label: "감사해요", img: "/emotion_grateful.png" },
      { id: "joyful", label: "기뻐요", img: "/emotion_joyful.png" },
      { id: "peaceful", label: "평안해요", img: "/emotion_peaceful.png" },
      { id: "excited", label: "설레요", img: "/emotion_excited.png" },
      { id: "full", label: "충만해요", img: "/emotion_full.png" },
    ],
  },
  {
    category: "은혜 & 영적 갈망",
    color: "rgba(122,157,122,0.12)",
    border: "rgba(122,157,122,0.3)",
    labelColor: "var(--sage-dark)",
    items: [
      { id: "grace", label: "은혜받았어요", img: "/emotion_grace.png" },
      { id: "hungry", label: "말씀이 고파요", img: "/emotion_hungry.png" },
      { id: "mission", label: "사명감이 생겨요", img: "/emotion_mission.png" },
      { id: "repent", label: "회개해요", img: "/emotion_repent.png" },
      { id: "renew", label: "새로워지고 싶어요", img: "/emotion_renew.png" },
    ],
  },
  {
    category: "힘듦 & 지침",
    color: "rgba(100,120,180,0.1)",
    border: "rgba(100,120,180,0.25)",
    labelColor: "rgba(80,100,160,0.9)",
    items: [
      { id: "tired", label: "힘들어요", img: "/emotion_tired.png" },
      { id: "exhausted", label: "지쳐요", img: "/emotion_exhausted.png" },
      { id: "lonely", label: "외로워요", img: "/emotion_lonely.png" },
      { id: "sad", label: "슬퍼요", img: "/emotion_sad.png" },
      { id: "anxious", label: "불안해요", img: "/emotion_anxious.png" },
    ],
  },
  {
    category: "흔들림 & 메마름",
    color: "rgba(180,120,80,0.1)",
    border: "rgba(180,120,80,0.25)",
    labelColor: "rgba(150,90,50,0.9)",
    items: [
      { id: "doubt", label: "의심돼요", img: "/emotion_doubt.png" },
      { id: "dry", label: "메말랐어요", img: "/emotion_dry.png" },
      { id: "angry", label: "화가나요", img: "/emotion_angry.png" },
      { id: "far", label: "하나님이 멀게 느껴져요", img: "/emotion_far.png" },
    ],
  },
  {
    category: "오늘의 기도",
    color: "rgba(122,157,122,0.08)",
    border: "rgba(122,157,122,0.2)",
    labelColor: "var(--sage-dark)",
    items: [
      { id: "family", label: "가정을 위해", img: "/emotion_family.png" },
      { id: "work", label: "직장·학업을 위해", img: "/emotion_work.png" },
      { id: "relation", label: "관계를 위해", img: "/emotion_relation.png" },
      { id: "health", label: "건강을 위해", img: "/emotion_health.png" },
      { id: "future", label: "미래를 위해", img: "/emotion_future.png" },
    ],
  },
];

export default function CheckinPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const selectedItem = EMOTIONS.flatMap(g => g.items).find(e => e.id === selected);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 140 }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13, color: "var(--text3)" }}>돌아가기</span>
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>오늘 마음이<br />어때요?</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}>하나를 선택하면 말씀을 드릴게요</p>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {EMOTIONS.map(group => (
          <div key={group.category} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: group.labelColor, letterSpacing: "0.5px", flexShrink: 0 }}>
                {group.category}
              </p>
              <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {group.items.map(item => {
                const on = selected === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    style={{
                      background: on ? group.color : "var(--bg2)",
                      border: `1.5px solid ${on ? group.border : "var(--border)"}`,
                      borderRadius: 16,
                      padding: "12px 6px 10px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      transform: on ? "scale(1.04)" : "scale(1)",
                    }}
                  >
                    <div style={{ width: 48, height: 48, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={item.img} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: on ? 700 : 500, display: "block", color: on ? group.labelColor : "var(--text2)", lineHeight: 1.3, wordBreak: "keep-all" }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && selectedItem && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "var(--bg2)", borderTop: "1px solid var(--border)", padding: "14px 16px 28px", zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 14px", background: "var(--bg3)", borderRadius: 12 }}>
            <img src={selectedItem.img} alt={selectedItem.label} style={{ width: 32, height: 32, objectFit: "contain" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{selectedItem.label}</span>
          </div>
          <button className="btn-sage" onClick={() => router.push(`/checkin/result?emotions=${selected}`)}>
            말씀 받기 →
          </button>
        </div>
      )}
    </div>
  );
}
