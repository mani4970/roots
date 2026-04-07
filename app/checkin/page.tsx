"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const EMOTIONS = [
  { category: "기쁨 & 평안", items: [
    { id: "grateful", label: "감사해요", icon: "🙏", sub: "은혜가 넘쳐요" },
    { id: "joyful", label: "기뻐요", icon: "😊", sub: "마음이 밝아요" },
    { id: "peaceful", label: "평안해요", icon: "😌", sub: "고요한 마음" },
  ]},
  { category: "힘듦 & 고난", items: [
    { id: "tired", label: "힘들어요", icon: "😔", sub: "지쳐있어요" },
    { id: "anxious", label: "불안해요", icon: "😰", sub: "두려움이 있어요" },
    { id: "lonely", label: "외로워요", icon: "🌧️", sub: "혼자인 느낌" },
    { id: "sad", label: "슬퍼요", icon: "😢", sub: "마음이 아파요" },
    { id: "angry", label: "화가 나요", icon: "😤", sub: "억울해요" },
    { id: "exhausted", label: "탈진했어요", icon: "😴", sub: "번아웃이에요" },
    { id: "sick", label: "아파요", icon: "🤒", sub: "몸이 힘들어요" },
  ]},
  { category: "신앙 & 영적 상태", items: [
    { id: "grace", label: "은혜받았어요", icon: "✨", sub: "하나님이 느껴져요" },
    { id: "repent", label: "회개해요", icon: "💧", sub: "돌이키고 싶어요" },
    { id: "doubt", label: "의심돼요", icon: "🤔", sub: "믿음이 흔들려요" },
    { id: "dry", label: "메말랐어요", icon: "🏜️", sub: "영적으로 건조해요" },
    { id: "hungry", label: "말씀이 고파요", icon: "📖", sub: "깊이 파고 싶어요" },
    { id: "mission", label: "사명감이요", icon: "🔥", sub: "뭔가 하고 싶어요" },
  ]},
  { category: "관계 & 상황", items: [
    { id: "family", label: "가정 때문에", icon: "👨‍👩‍👧", sub: "가족이 힘들어요" },
    { id: "work", label: "직장 때문에", icon: "💼", sub: "일이 힘들어요" },
    { id: "relation", label: "관계 때문에", icon: "💔", sub: "누군가와 힘들어요" },
    { id: "health", label: "건강 때문에", icon: "🏥", sub: "몸이 힘들어요" },
    { id: "money", label: "경제 때문에", icon: "😓", sub: "재정이 힘들어요" },
    { id: "future", label: "미래 때문에", icon: "🌫️", sub: "앞이 안 보여요" },
  ]},
];

export default function CheckinPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 120 }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13, color: "var(--text3)" }}>돌아가기</span>
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>오늘 마음이<br />어때요?</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}>여러 개 선택해도 좋아요</p>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {EMOTIONS.map(group => (
          <div key={group.category} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>{group.category}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
              {group.items.map(item => {
                const on = selected.includes(item.id);
                return (
                  <button key={item.id} onClick={() => toggle(item.id)} style={{ background: on ? "var(--sage-light)" : "var(--bg2)", border: `1px solid ${on ? "rgba(122,157,122,0.5)" : "var(--border)"}`, borderRadius: 14, padding: "10px 6px 9px", textAlign: "center", cursor: "pointer", transition: "all 0.12s" }}>
                    <span style={{ fontSize: 20, display: "block", marginBottom: 4 }}>{item.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, display: "block", color: on ? "var(--sage-dark)" : "var(--text)" }}>{item.label}</span>
                    <span style={{ fontSize: 8, color: "var(--text3)", display: "block", marginTop: 2 }}>{item.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selected.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "var(--bg2)", borderTop: "1px solid var(--border)", padding: 16, zIndex: 50 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {selected.map(id => {
              const item = EMOTIONS.flatMap(g => g.items).find(e => e.id === id);
              return item ? (
                <span key={id} style={{ background: "var(--sage-light)", color: "var(--sage-dark)", fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                  {item.icon} {item.label}
                </span>
              ) : null;
            })}
          </div>
          <button className="btn-sage" onClick={() => router.push(`/checkin/result?emotions=${selected.join(",")}`)}>
            말씀 받기 →
          </button>
        </div>
      )}
    </div>
  );
}
