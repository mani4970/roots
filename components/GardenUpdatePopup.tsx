"use client";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";

const BADGES = [
  { name: "Love", fruit: "🍎", desc: "사랑" },
  { name: "Peace", fruit: "🍉", desc: "화평" },
  { name: "Joy", fruit: "🍌", desc: "희락" },
  { name: "Goodness", fruit: "🍊", desc: "양선" },
  { name: "Kindness", fruit: "🍒", desc: "자비" },
  { name: "Patience", fruit: "🍍", desc: "오래참음" },
  { name: "Faithfulness", fruit: "🍇", desc: "충성" },
  { name: "Gentleness", fruit: "🍋", desc: "온유" },
  { name: "Self-Control", fruit: "🍓", desc: "절제" },
];

interface GardenUpdatePopupProps {
  show: boolean;
  type: "garden" | "badge";
  streakDays: number;
  badgeIndex?: number;
  onClose: () => void;
}

function getStageMessage(streakDays: number, lang: "ko" | "de" = "ko") {
  // cycleDay: 현재 100일 주기 내 일수 (1~100)
  const cycleDay = streakDays === 0 ? 0 : ((streakDays - 1) % 100) + 1;
  const stage = Math.ceil(cycleDay / 10); // 1~10

  const messages_ko: Record<number, { title: string; desc: string; emoji: string }> = {
    1:  { emoji: "🌱", title: "씨앗이 뿌려졌어요!", desc: "겨자씨 한 알이 땅에 심겨졌어요.\n말씀이 마음 깊이 뿌리내리기 시작해요." },
    2:  { emoji: "🌿", title: "새싹이 돋아났어요!", desc: "작은 싹이 흙을 뚫고 올라왔어요.\n하나님 앞에 날마다 나아오고 있어요." },
    3:  { emoji: "🌲", title: "묘목이 자라고 있어요!", desc: "뿌리가 단단히 내리고 줄기가 세워졌어요.\n말씀이 삶에 스며들고 있어요." },
    4:  { emoji: "🌳", title: "가지가 뻗어나갔어요!", desc: "가지가 사방으로 뻗어나가고 있어요.\n믿음이 삶의 구석구석에 닿고 있어요." },
    5:  { emoji: "🌴", title: "나무가 무럭무럭 자라요!", desc: "든든한 나무로 자라고 있어요.\n폭풍 속에서도 흔들리지 않아요." },
    6:  { emoji: "🍃", title: "잎이 풍성해졌어요!", desc: "무성한 잎으로 그늘을 만들고 있어요.\n당신의 신앙이 주변을 덮기 시작해요." },
    7:  { emoji: "🍎", title: "열매를 맺기 시작해요!", desc: "드디어 열매가 맺히기 시작했어요!\n말씀이 삶의 열매로 나타나고 있어요." },
    8:  { emoji: "🐦", title: "새들이 날아왔어요!", desc: "새들이 날아와 가지에 깃들었어요.\n당신의 정원이 생명으로 가득해요." },
    9:  { emoji: "🌺", title: "정원이 거의 완성돼요!", desc: "아름다운 정원이 거의 완성됐어요.\n100일을 향해 달려가고 있어요!" },
    10: { emoji: "🏆", title: "풍성한 정원 완성!", desc: "100일의 여정을 거의 마쳤어요!\n곧 성령의 열매 배지를 받게 돼요." },
  };
  const messages_de: Record<number, { title: string; desc: string; emoji: string }> = {
    1:  { emoji: "🌱", title: "Ein Samen wurde gesät!", desc: "Ein Senfkorn wurde in die Erde gelegt.\nGottes Wort beginnt, Wurzeln zu schlagen." },
    2:  { emoji: "🌿", title: "Ein Sprössling wächst!", desc: "Ein kleines Grün durchbricht die Erde.\nSie kommen täglich zu Gott." },
    3:  { emoji: "🌲", title: "Der Setzling wächst!", desc: "Die Wurzeln greifen tief, der Stamm steht fest.\nGottes Wort durchdringt Ihr Leben." },
    4:  { emoji: "🌳", title: "Äste breiten sich aus!", desc: "Die Äste strecken sich in alle Richtungen.\nIhr Glaube berührt jeden Bereich Ihres Lebens." },
    5:  { emoji: "🌴", title: "Der Baum wächst kräftig!", desc: "Ein starker Baum entsteht.\nAuch im Sturm bleibt er stehen." },
    6:  { emoji: "🍃", title: "Reichlich Blätter!", desc: "Üppiges Laub spendet Schatten.\nIhr Glaube beginnt, andere zu umhüllen." },
    7:  { emoji: "🍎", title: "Früchte beginnen zu wachsen!", desc: "Endlich zeigen sich die ersten Früchte!\nGottes Wort trägt Frucht in Ihrem Leben." },
    8:  { emoji: "🐦", title: "Vögel kommen!", desc: "Vögel fliegen herbei und nisten in den Ästen.\nIhr Garten ist voller Leben." },
    9:  { emoji: "🌺", title: "Der Garten ist fast fertig!", desc: "Ein wunderschöner Garten entsteht.\n100 Tage sind fast erreicht!" },
    10: { emoji: "🏆", title: "Üppiger Garten vollendet!", desc: "Die 100-Tage-Reise ist fast abgeschlossen!\nBald erhalten Sie die Frucht des Geistes." },
  };

  const messages = lang === "de" ? messages_de : messages_ko;
  return messages[stage] ?? messages[1];
}

export default function GardenUpdatePopup({ show, type, streakDays, badgeIndex = 0, onClose }: GardenUpdatePopupProps) {
  const lang = useLang();
  if (!show) return null;
  const badge = BADGES[badgeIndex % BADGES.length];
  const isBadge = type === "badge";
  const stageMsg = getStageMessage(streakDays, lang);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 101,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "rgba(26,28,30,0.88)", backdropFilter: "blur(10px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg2)", borderRadius: 28,
          border: `1px solid ${isBadge ? "rgba(232,197,71,0.5)" : "var(--border)"}`,
          padding: "32px 28px 24px",
          margin: "0 28px", maxWidth: 340, width: "100%",
          textAlign: "center",
          boxShadow: isBadge ? "0 0 40px rgba(232,197,71,0.2)" : "none",
        }}
      >
        {isBadge ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏅</div>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(232,197,71,0.15)",
              border: "3px solid rgba(232,197,71,0.6)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", gap: 2,
            }}>
              <span style={{ fontSize: 32 }}>{badge.fruit}</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(232,197,71,0.9)", letterSpacing: 0.5 }}>
                {badge.name.toUpperCase()}
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              성령의 열매 획득! 🎉
            </h2>
            <div style={{
              padding: "12px 16px", background: "rgba(232,197,71,0.1)",
              borderRadius: 14, border: "1px solid rgba(232,197,71,0.3)", marginBottom: 8,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,197,71,0.95)", marginBottom: 4 }}>
                {badge.name} — {badge.desc}
              </p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                100일 동안 말씀에 뿌리내린 당신에게{"\n"}하나님이 주시는 열매예요!
              </p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
              프로필에서 확인할 수 있어요 ✨
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 56, marginBottom: 14 }}>{stageMsg.emoji}</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
              {stageMsg.title}
            </h2>
            <div style={{
              padding: "12px 14px", background: "var(--sage-light)",
              borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 8,
            }}>
              <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {stageMsg.desc}
              </p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
              정원이 업데이트됐어요! {streakDays}일째 🔥
            </p>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "13px",
            background: isBadge ? "rgba(232,197,71,0.9)" : "var(--sage)",
            color: isBadge ? "#1a1c1e" : "var(--bg)",
            border: "none", borderRadius: 14,
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          {isBadge ? t("badge_check_btn", lang) : t("garden_check_btn", lang)}
        </button>
      </div>
    </div>
  );
}
