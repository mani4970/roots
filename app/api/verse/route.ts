import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 감정별 관련 성경 영역 힌트 (더 정확한 말씀 선택 유도)
const EMOTION_HINTS: Record<string, string> = {
  // 기쁨 & 감사
  grateful: "시편 100편, 데살로니가전서 5:16-18, 골로새서 3:17",
  joyful: "빌립보서 4:4, 시편 16:11, 느헤미야 8:10",
  peaceful: "요한복음 14:27, 빌립보서 4:7, 이사야 26:3",
  excited: "시편 37:4, 잠언 16:9, 로마서 15:13",
  full: "에베소서 3:19, 골로새서 2:10, 요한복음 10:10",
  // 은혜 & 영적 갈망
  grace: "에베소서 2:8-9, 로마서 8:38-39, 시편 103:1-5",
  hungry: "마태복음 5:6, 시편 119:103, 요한복음 6:35",
  mission: "마태복음 28:19-20, 에베소서 2:10, 예레미야 29:11",
  repent: "요한일서 1:9, 시편 51편, 이사야 1:18",
  renew: "고린도후서 5:17, 로마서 12:2, 이사야 43:19",
  // 힘듦 & 지침
  tired: "시편 23편, 마태복음 11:28-30, 이사야 40:31",
  exhausted: "이사야 40:28-31, 시편 62:1, 마태복음 11:28",
  lonely: "시편 139편, 히브리서 13:5, 요한복음 14:18",
  sad: "시편 34:18, 고린도후서 1:3-4, 요한복음 11:35",
  anxious: "빌립보서 4:6-7, 시편 56:3, 마태복음 6:25-34",
  // 흔들림 & 메마름
  doubt: "마가복음 9:24, 야고보서 1:5-6, 히브리서 11:1",
  dry: "이사야 44:3, 요한복음 7:37-38, 시편 42편",
  angry: "에베소서 4:26, 야고보서 1:19-20, 잠언 15:1",
  far: "시편 22:1-2, 시편 42:1-2, 야고보서 4:8",
  // 오늘의 기도
  family: "여호수아 24:15, 골로새서 3:18-21, 시편 127편",
  work: "골로새서 3:23-24, 잠언 16:3, 데살로니가전서 4:11",
  relation: "에베소서 4:32, 골로새서 3:13, 마태복음 5:44",
  health: "시편 103:1-5, 야고보서 5:14-15, 고린도전서 6:19-20",
  future: "예레미야 29:11, 시편 37:4-5, 잠언 3:5-6",
};

export async function POST(req: NextRequest) {
  let lang = "ko";
  try {
    const body = await req.json();
    lang = body.lang ?? "ko";
    const { emotions, prevVerse, prevReference } = body;

    // emotions는 이제 단일 감정 문자열 (단수 선택)
    const emotionId = Array.isArray(emotions) ? emotions[0] : emotions;
    const hints = EMOTION_HINTS[emotionId] || "시편, 잠언, 복음서";

    const avoidClause = prevReference
      ? `
⚠️ 중요: 어제 사용한 말씀은 "${prevReference}"이었어요. 반드시 다른 구절을 선택하세요. 같은 책의 같은 장도 피해주세요.`
      : "";

    const isDE = lang === "de";
    const isEN = lang === "en";
    const prompt = isDE
      ? `Sie sind ein geistlicher Begleiter für christliches Wachstum.${avoidClause}

Heutige Gefühlslage des Nutzers: ${emotionId}
Empfohlene Bibelstellen: ${hints || "Psalmen, Sprüche, Evangelien"}

Bitte befolgen Sie diese Anweisungen genau:

1. **Bibelvers**: Wählen Sie einen Vers, der genau zur heutigen Emotion passt. Zitieren Sie ihn korrekt auf Deutsch (Luther 2017 oder Einheitsübersetzung).

2. **Referenz**: Geben Sie die Referenz korrekt an.

Wichtig:
- Geben Sie nur **einen** Vers und **eine** Referenz zurück.
- Keine Erklärung.
- Kein Vorsatz.
- Kein zusätzlicher Text.

Antworten Sie NUR im JSON-Format:
{"verse":"Bibelvers","reference":"Buch Kapitel:Vers"}`
      : isEN
      ? `You are a spiritual guide helping Christian growth.${avoidClause}

User's emotion today: ${emotionId}
Suggested Bible passages: ${hints || "Psalms, Proverbs, Gospels"}

Follow these instructions exactly:

1. **Bible verse**: Choose a verse that resonates with today's emotion. Quote it accurately (ESV or NIV).

2. **Reference**: Provide the verse reference correctly.

Important:
- Return only **one** verse and **one** reference.
- No explanation.
- No recommendation or resolution.
- No extra text.

Respond ONLY in JSON format:
{"verse":"Bible verse","reference":"Book Chapter:Verse"}`
      : `당신은 크리스천의 신앙 성장을 돕는 영적 가이드입니다.${avoidClause}

사용자의 오늘 감정 상태: ${emotionId}
관련 성경 본문 참고: ${hints || "시편, 잠언, 복음서"}

다음 지침을 반드시 따르세요:

1. **말씀 선택**: 감정에 정확히 공명하는 성경 구절 1개. 위로이든 도전이든 오늘 이 감정에 살아있는 말씀이어야 합니다. 개역개정 기준으로 정확하게 인용하세요.

2. **말씀 위치(reference)**: 책명, 장, 절을 정확히 적으세요.

중요:
- 말씀 1개와 reference만 반환하세요.
- 설명(message)은 쓰지 마세요.
- 추천 결단(mission)은 쓰지 마세요.
- 다른 문장은 추가하지 마세요.

JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"verse":"말씀 내용","reference":"책명 장:절"}`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    // 필수 필드 검증
    if (!parsed.verse || !parsed.reference) {
      throw new Error("불완전한 응답");
    }

    return NextResponse.json(parsed);

  } catch (e) {
    console.error("Verse API error:", e);
    // 감정별 fallback 말씀
    if (lang === "de") {
      return NextResponse.json({
        verse: "Kommt her zu mir, alle, die ihr mühselig und beladen seid; ich will euch erquicken.",
        reference: "Matthäus 11:28",
      });
    }
    if (lang === "en") {
      return NextResponse.json({
        verse: "Come to me, all who labor and are heavy laden, and I will give you rest.",
        reference: "Matthew 11:28",
      });
    }
    return NextResponse.json({
      verse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라",
      reference: "마태복음 11:28",
    });
  }
}
