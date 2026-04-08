"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Celebration from "@/components/Celebration";
import { createClient } from "@/lib/supabase";
import { ChevronRight, Loader2, Plus, Settings, ChevronDown } from "lucide-react";

const BIBLE_VERSIONS = [
  { id: "kor", label: "개역한글" },
  { id: "kjv", label: "KJV" },
];

export default function QTPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [todayDone, setTodayDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("kor");
  const [expandedYear, setExpandedYear] = useState<number | null>(new Date().getFullYear());

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
    const { data } = await supabase.from("qt_records").select("*").eq("user_id", user.id).order("date", { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  }

  // 연도별 그룹핑
  const byYear = records.reduce((acc, r) => {
    const year = new Date(r.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(r);
    return acc;
  }, {} as Record<number, any[]>);
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  const currentVersionLabel = BIBLE_VERSIONS.find(v => v.id === selectedVersion)?.label ?? "개역한글";

  return (
    <div className="page">
      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>큐티</h1>
          <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>말씀과 함께하는 조용한 시간</p>
        </div>
        <button onClick={() => setShowVersionPicker(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "var(--text2)", cursor: "pointer" }}>
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

      {/* 연도별 기록 */}
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
            {years.map(year => (
              <div key={year}>
                {/* 연도 헤더 — 클릭해서 열기/닫기 */}
                <button
                  onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: expandedYear === year ? "14px 14px 0 0" : 14, cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--sage-dark)" }}>{year}년</span>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{byYear[year].length}개</span>
                  </div>
                  <ChevronDown size={16} style={{ color: "var(--text3)", transform: expandedYear === year ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>

                {/* 해당 연도 기록 목록 */}
                {expandedYear === year && (
                  <div style={{ borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
                    {byYear[year].map((r: any, idx: number) => (
                      <button
                        key={r.id}
                        onClick={() => router.push(`/qt/record?id=${r.id}`)}
                        style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: "12px 14px", background: "var(--bg)", borderTop: idx > 0 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 10 }}
                      >
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>
                            {new Date(r.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                          </p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: 3 }}>{r.bible_ref}</p>
                          {r.key_verse && <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.4 }}>"{r.key_verse.slice(0, 40)}..."</p>}
                        </div>
                        <ChevronRight size={16} style={{ color: "var(--text3)", flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 성경 버전 선택 모달 */}
      {showVersionPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>성경 버전 선택</h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>무료로 사용 가능한 버전이에요</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {BIBLE_VERSIONS.map(v => (
                <button key={v.id} onClick={() => selectVersion(v.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, border: `1px solid ${selectedVersion === v.id ? "var(--sage)" : "var(--border)"}`, background: selectedVersion === v.id ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer" }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: selectedVersion === v.id ? "var(--sage-dark)" : "var(--text)" }}>{v.label}</span>
                  {selectedVersion === v.id && <span style={{ fontSize: 12, color: "var(--sage)", fontWeight: 600 }}>✓ 선택됨</span>}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12, lineHeight: 1.5 }}>개역개정은 저작권 문제로 제공이 어려워요.</p>
            <button className="btn-outline" onClick={() => setShowVersionPicker(false)} style={{ marginTop: 14 }}>닫기</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
