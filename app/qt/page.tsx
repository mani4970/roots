"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { ChevronRight, Loader2, Plus, Settings } from "lucide-react";

const BIBLE_VERSIONS = [
  { id: "kor", label: "개역한글" },
  { id: "kor_gaeyok", label: "개역개정" },
  { id: "kor_easy", label: "쉬운성경" },
  { id: "kjv", label: "KJV" },
  { id: "niv", label: "NIV" },
];

export default function QTPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [todayDone, setTodayDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("kor_gaeyok");

  useEffect(() => {
    const saved = localStorage.getItem("bible_version");
    if (saved) setSelectedVersion(saved);
    load();
  }, []);

  function selectVersion(id: string) {
    setSelectedVersion(id);
    localStorage.setItem("bible_version", id);
    setShowVersionPicker(false);
  }

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const today = new Date().toISOString().split("T")[0];
    const { data: tqt } = await supabase.from("qt_records").select("id").eq("user_id", user.id).eq("date", today).maybeSingle();
    setTodayDone(!!tqt);
    const { data } = await supabase.from("qt_records").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    if (data) setRecords(data);
    setLoading(false);
  }

  const currentVersionLabel = BIBLE_VERSIONS.find(v => v.id === selectedVersion)?.label ?? "개역개정";

  return (
    <div className="page">
      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>큐티</h1>
          <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>말씀과 함께하는 조용한 시간</p>
        </div>
        {/* 성경 버전 선택 버튼 */}
        <button onClick={() => setShowVersionPicker(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "var(--text2)", cursor: "pointer" }}>
          <Settings size={12} style={{ color: "var(--sage)" }} />
          {currentVersionLabel}
        </button>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {todayDone ? (
          <div className="card-sage" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--sage-dark)" }}>오늘 큐티 완료!</p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>말씀 앞에 앉은 당신, 수고했어요</p>
            </div>
          </div>
        ) : (
          <button onClick={() => router.push(`/qt/write?version=${selectedVersion}`)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={18} /> 오늘 큐티 시작하기
          </button>
        )}
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <div className="sec-label">지난 큐티 기록</div>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📖</p>
            <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 큐티 기록이 없어요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {records.map(r => (
              <button key={r.id} onClick={() => router.push(`/qt/record?id=${r.id}`)} className="qt-record-item" style={{ width: "100%", textAlign: "left", cursor: "pointer" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>
                    {new Date(r.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: 3 }}>{r.bible_ref}</p>
                  {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.4 }}>"{r.key_verse.slice(0, 45)}..."</p>}
                </div>
                <ChevronRight size={16} style={{ color: "var(--text3)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 성경 버전 선택 모달 */}
      {showVersionPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,43,40,0.5)", zIndex: 40, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--white)", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>성경 버전 선택</h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>선택한 버전이 큐티 기본으로 저장돼요</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {BIBLE_VERSIONS.map(v => (
                <button key={v.id} onClick={() => selectVersion(v.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, border: `1px solid ${selectedVersion === v.id ? "var(--sage)" : "var(--border)"}`, background: selectedVersion === v.id ? "var(--sage-light)" : "var(--white)", cursor: "pointer" }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: selectedVersion === v.id ? "var(--sage-dark)" : "var(--text)" }}>{v.label}</span>
                  {selectedVersion === v.id && <span style={{ fontSize: 12, color: "var(--sage)", fontWeight: 600 }}>✓ 선택됨</span>}
                </button>
              ))}
            </div>
            <button className="btn-outline" onClick={() => setShowVersionPicker(false)} style={{ marginTop: 14 }}>닫기</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
