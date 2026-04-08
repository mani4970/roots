import { NextRequest, NextResponse } from "next/server";

const VERSION_MAP: Record<string, string> = {
  "개역한글": "kor",
  "개역개정": "kor_rev",
  "쉬운성경": "kor_easy",
  "KJV": "eng",
  "NIV": "eng_niv",
};

const BOOK_MAP: Record<string, string> = {
  "창세기": "gen", "출애굽기": "exo", "레위기": "lev", "민수기": "num",
  "신명기": "deu", "여호수아": "jos", "사사기": "jdg", "룻기": "rut",
  "사무엘상": "1sa", "사무엘하": "2sa", "열왕기상": "1ki", "열왕기하": "2ki",
  "역대상": "1ch", "역대하": "2ch", "에스라": "ezr", "느헤미야": "neh",
  "에스더": "est", "욥기": "job", "시편": "psa", "잠언": "pro",
  "전도서": "ecc", "아가": "sng", "이사야": "isa", "예레미야": "jer",
  "예레미야애가": "lam", "에스겔": "eze", "다니엘": "dan", "호세아": "hos",
  "요엘": "joe", "아모스": "amo", "오바댜": "oba", "요나": "jon",
  "미가": "mic", "나훔": "nah", "하박국": "hab", "스바냐": "zep",
  "학개": "hag", "스가랴": "zec", "말라기": "mal",
  "마태복음": "mat", "마가복음": "mar", "누가복음": "luk", "요한복음": "joh",
  "사도행전": "act", "로마서": "rom", "고린도전서": "1co", "고린도후서": "2co",
  "갈라디아서": "gal", "에베소서": "eph", "빌립보서": "phi", "골로새서": "col",
  "데살로니가전서": "1th", "데살로니가후서": "2th", "디모데전서": "1ti",
  "디모데후서": "2ti", "디도서": "tit", "빌레몬서": "phile", "히브리서": "heb",
  "야고보서": "jam", "베드로전서": "1pe", "베드로후서": "2pe",
  "요한일서": "1jo", "요한이서": "2jo", "요한삼서": "3jo", "유다서": "jud",
  "요한계시록": "rev",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version") ?? "개역한글";
  const book = searchParams.get("book") ?? "요한복음";
  const chapter = searchParams.get("chapter") ?? "3";
  const startVerse = parseInt(searchParams.get("startVerse") ?? "16");
  const endVerse = parseInt(searchParams.get("endVerse") ?? String(startVerse));

  const vCode = VERSION_MAP[version] ?? "kor";
  const bCode = BOOK_MAP[book] ?? "joh";

  try {
    // 절마다 개별 fetch해서 번호와 함께 조합
    const verses: { num: number; text: string }[] = [];

    for (let v = startVerse; v <= endVerse; v++) {
      const url = `https://ibibles.net/quote.php?${vCode}-${bCode}/${chapter}:${v}`;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 86400 },
        });
        const html = await res.text();

        if (html.includes("Bad Request") || html.includes("Host not allowed") || !html.trim()) {
          continue;
        }

        // HTML 파싱 — <small> 태그 안의 절번호 제거하고 텍스트만 추출
        let text = html
          .replace(/<small[^>]*>.*?<\/small>/gi, "")
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/Bible Quote/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        if (text) {
          verses.push({ num: v, text });
        }
      } catch {
        // 절 하나 실패해도 계속
      }
    }

    if (verses.length === 0) {
      return NextResponse.json({
        error: "본문을 불러올 수 없어요. 개역한글 버전을 사용해보세요."
      }, { status: 404 });
    }

    // 절 번호와 함께 텍스트 조합
    const formattedVerses = verses.map(v => `${v.num} ${v.text}`);
    const fullText = formattedVerses.join("\n");
    const reference = `${book} ${chapter}:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ""}`;

    return NextResponse.json({
      text: fullText,
      verses: verses,          // 절별 배열 (붙잡은 말씀 선택용)
      reference,
      version,
    });

  } catch {
    return NextResponse.json({ error: "네트워크 오류가 발생했어요" }, { status: 500 });
  }
}
