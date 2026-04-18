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

2. **Erklärung (message)**: Erklären Sie in 2-3 Sätzen, was dieser Vers heute für jemanden mit dieser Emotion bedeutet. Beziehen Sie sich direkt auf bestimmte Wörter oder Ausdrücke im Vers.

3. **Heutiger Vorsatz (mission)**: Eine konkrete, handlungsorientierte Aufgabe für heute.
   - ✅ "Sagen Sie heute einer Person in Ihrer Familie: 'Ich bete für dich'"
   - ✅ "Schreiben Sie vor dem Schlafengehen 3 Dinge auf, für die Sie heute dankbar sind"
   - ❌ Keine abstrakten Aussagen wie "Beten Sie" oder "Vertrauen Sie Gott"

Antworten Sie NUR im JSON-Format:
{"verse":"Bibelvers","reference":"Buch Kapitel:Vers","message":"Erklärung","mission":"Konkreter Vorsatz"}`
      : isEN
      ? `You are a spiritual guide helping Christian growth.${avoidClause}

User's emotion today: ${emotionId}
Suggested Bible passages: ${hints || "Psalms, Proverbs, Gospels"}

Follow these instructions exactly:

1. **Bible verse**: Choose a verse that resonates with today's emotion. Quote it accurately (ESV or NIV).

2. **Explanation (message)**: In 2-3 sentences, explain what this verse means today for someone feeling this emotion. Reference specific words from the verse.

3. **Today's resolution (mission)**: One concrete, actionable task for today.
   - ✅ "Tell one family member today: 'I'm praying for you'"
   - ✅ "Before bed, write down 3 things you're grateful for today"
   - ❌ No abstract statements like "Pray" or "Trust God"

Respond ONLY in JSON format:
{"verse":"Bible verse","reference":"Book Chapter:Verse","message":"Explanation","mission":"Concrete resolution"}`
      : `당신은 크리스천의 신앙 성장을 돕는 영적 가이드입니다.${avoidClause}

사용자의 오늘 감정 상태: ${emotionId}
관련 성경 본문 참고: ${hints || "시편, 잠언, 복음서"}

다음 지침을 반드시 따르세요:

1. **말씀 선택**: 감정에 정확히 공명하는 성경 구절 1개. 위로이든 도전이든 오늘 이 감정에 살아있는 말씀이어야 합니다. 개역개정 기준으로 정확하게 인용하세요.

2. **말씀 해설(message)**: 선택한 말씀의 특정 단어나 표현을 직접 인용하거나 연결하여, 오늘 이 감정을 가진 사람에게 이 말씀이 구체적으로 무슨 의미인지 2-3문장으로 설명하세요. 예를 들어 "말씀에서 '쉬게 하리라'고 하셨는데, 이것은..." 처럼 말씀 본문과 직접 이어지게. 따뜻하되 피상적이지 않게.

3. **오늘의 결단(mission)**: 예수님의 마음으로 오늘 하루 실제로 손발로 실천할 수 있는 구체적인 행동 1가지.
   결단의 종류는 감정에 따라 다음 중 하나를 선택하세요:

   [선언형 - 믿음을 선포하는 것] 힘들거나 두렵거나 의심이 들 때
   - ✅ "오늘 아침 거울 앞에서 '나는 하나님의 사랑받는 자녀다!'를 5번 소리내어 외치세요"
   - ✅ "오늘 하루 힘들 때마다 '주님이 나와 함께 계신다'를 마음속으로 3번 선포하세요"

   [타인을 향한 행동 - 예수님의 마음으로] 은혜받았거나 기쁘거나 사명감이 있을 때
   - ✅ "오늘 주변에서 힘들어 보이는 사람에게 문자 한 줄 보내세요: '기도하고 있어요, 힘내요'"
   - ✅ "오늘 가족 중 한 명에게 이유 없이 '사랑해, 감사해'라고 말해보세요"
   - ✅ "오늘 카페나 식당에서 직원에게 진심 어린 '감사합니다'를 눈 마주치며 전하세요"

   [구체적 기도 행동] 메마르거나 외롭거나 영적으로 갈급할 때
   - ✅ "오늘 저녁 잠들기 전, 감사한 사람 3명의 이름을 부르며 30초씩 축복 기도해보세요"
   - ✅ "오늘 점심 식사 전 두 손 모으고 '주님, 이 음식과 오늘 하루를 주셔서 감사합니다'를 소리내어 말해보세요"

   [말씀 실천 행동] 감사하거나 평안할 때
   - ✅ "오늘 받은 이 말씀을 메모장에 적어두고 하루에 세 번 꺼내서 읽어보세요"
   - ✅ "오늘 하루 중 하나님의 흔적이 느껴진 순간을 저녁에 한 줄 일기로 적어보세요"

   ❌ 절대 금지: "기도하세요", "말씀 묵상하세요", "하나님을 신뢰하세요" 같은 추상적 표현
   반드시 언제, 어디서, 어떻게, 무슨 말을 할지까지 구체적으로 1-2문장으로 작성하세요.

JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"verse":"말씀 내용","reference":"책명 장:절","message":"말씀 해설","mission":"오늘의 구체적 결단 행동"}`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    // 필수 필드 검증
    if (!parsed.verse || !parsed.reference || !parsed.message || !parsed.mission) {
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
        message: "Was auch immer Sie heute trägt – Gott möchte es gemeinsam mit Ihnen tragen. Sie müssen nicht alles alleine bewältigen.",
        mission: "Legen Sie heute Abend vor dem Schlafen das Handy weg, schließen Sie die Augen und sagen Sie laut: 'Herr, danke für heute. Bitte sei morgen wieder bei mir.'",
      });
    }
    if (lang === "en") {
      return NextResponse.json({
        verse: "Come to me, all who labor and are heavy laden, and I will give you rest.",
        reference: "Matthew 11:28",
        message: "Whatever burden you carry today, the Lord wants to carry it with you. You don't have to handle it all alone.",
        mission: "Tonight before bed, put your phone down, close your eyes for 2 minutes and say aloud: 'Lord, thank you for today. Please be with me again tomorrow.'",
      });
    }
    return NextResponse.json({
      verse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라",
      reference: "마태복음 11:28",
      message: "오늘 하루 어떤 짐을 지고 있든, 주님이 함께 짊어지길 원하십니다. 혼자 다 감당하려 하지 않아도 괜찮아요.",
      mission: "오늘 저녁 잠들기 전, 핸드폰을 내려놓고 딱 2분만 눈을 감고 '주님, 오늘 하루 감사합니다. 내일도 함께해 주세요'라고 소리내어 말해보세요.",
    });
  }
}
