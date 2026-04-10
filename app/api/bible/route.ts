import { NextRequest, NextResponse } from "next/server";

// 언어별 책 이름 → 번호 매핑
const BOOK_MAP_KO: Record<string, number> = {
  "창세기":1,"출애굽기":2,"레위기":3,"민수기":4,"신명기":5,"여호수아":6,"사사기":7,"룻기":8,
  "사무엘상":9,"사무엘하":10,"열왕기상":11,"열왕기하":12,"역대상":13,"역대하":14,"에스라":15,
  "느헤미야":16,"에스더":17,"욥기":18,"시편":19,"잠언":20,"전도서":21,"아가":22,"이사야":23,
  "예레미야":24,"예레미야애가":25,"에스겔":26,"다니엘":27,"호세아":28,"요엘":29,"아모스":30,
  "오바댜":31,"요나":32,"미가":33,"나훔":34,"하박국":35,"스바냐":36,"학개":37,"스가랴":38,"말라기":39,
  "마태복음":40,"마가복음":41,"누가복음":42,"요한복음":43,"사도행전":44,"로마서":45,
  "고린도전서":46,"고린도후서":47,"갈라디아서":48,"에베소서":49,"빌립보서":50,"골로새서":51,
  "데살로니가전서":52,"데살로니가후서":53,"디모데전서":54,"디모데후서":55,"디도서":56,
  "빌레몬서":57,"히브리서":58,"야고보서":59,"베드로전서":60,"베드로후서":61,
  "요한일서":62,"요한이서":63,"요한삼서":64,"유다서":65,"요한계시록":66,
};
const BOOK_MAP_EN: Record<string, number> = {
  "Genesis":1,"Exodus":2,"Leviticus":3,"Numbers":4,"Deuteronomy":5,"Joshua":6,"Judges":7,"Ruth":8,
  "1 Samuel":9,"2 Samuel":10,"1 Kings":11,"2 Kings":12,"1 Chronicles":13,"2 Chronicles":14,
  "Ezra":15,"Nehemiah":16,"Esther":17,"Job":18,"Psalms":19,"Proverbs":20,"Ecclesiastes":21,
  "Song of Solomon":22,"Isaiah":23,"Jeremiah":24,"Lamentations":25,"Ezekiel":26,"Daniel":27,
  "Hosea":28,"Joel":29,"Amos":30,"Obadiah":31,"Jonah":32,"Micah":33,"Nahum":34,
  "Habakkuk":35,"Zephaniah":36,"Haggai":37,"Zechariah":38,"Malachi":39,
  "Matthew":40,"Mark":41,"Luke":42,"John":43,"Acts":44,"Romans":45,
  "1 Corinthians":46,"2 Corinthians":47,"Galatians":48,"Ephesians":49,"Philippians":50,"Colossians":51,
  "1 Thessalonians":52,"2 Thessalonians":53,"1 Timothy":54,"2 Timothy":55,"Titus":56,
  "Philemon":57,"Hebrews":58,"James":59,"1 Peter":60,"2 Peter":61,
  "1 John":62,"2 John":63,"3 John":64,"Jude":65,"Revelation":66,
};
const BOOK_MAP_DE: Record<string, number> = {
  "1. Mose":1,"2. Mose":2,"3. Mose":3,"4. Mose":4,"5. Mose":5,"Josua":6,"Richter":7,"Rut":8,
  "1. Samuel":9,"2. Samuel":10,"1. Könige":11,"2. Könige":12,"1. Chronik":13,"2. Chronik":14,
  "Esra":15,"Nehemia":16,"Ester":17,"Hiob":18,"Psalmen":19,"Sprüche":20,"Prediger":21,
  "Hoheslied":22,"Jesaja":23,"Jeremia":24,"Klagelieder":25,"Hesekiel":26,"Daniel":27,
  "Hosea":28,"Joel":29,"Amos":30,"Obadja":31,"Jona":32,"Micha":33,"Nahum":34,
  "Habakuk":35,"Zefanja":36,"Haggai":37,"Sacharja":38,"Maleachi":39,
  "Matthäus":40,"Markus":41,"Lukas":42,"Johannes":43,"Apostelgeschichte":44,"Römer":45,
  "1. Korinther":46,"2. Korinther":47,"Galater":48,"Epheser":49,"Philipper":50,"Kolosser":51,
  "1. Thessalonicher":52,"2. Thessalonicher":53,"1. Timotheus":54,"2. Timotheus":55,"Titus":56,
  "Philemon":57,"Hebräer":58,"Jakobus":59,"1. Petrus":60,"2. Petrus":61,
  "1. Johannes":62,"2. Johannes":63,"3. Johannes":64,"Judas":65,"Offenbarung":66,
};
const BOOK_MAP_FR: Record<string, number> = {
  "Genèse":1,"Exode":2,"Lévitique":3,"Nombres":4,"Deutéronome":5,"Josué":6,"Juges":7,"Ruth":8,
  "1 Samuel":9,"2 Samuel":10,"1 Rois":11,"2 Rois":12,"1 Chroniques":13,"2 Chroniques":14,
  "Esdras":15,"Néhémie":16,"Esther":17,"Job":18,"Psaumes":19,"Proverbes":20,"Ecclésiaste":21,
  "Cantique":22,"Ésaïe":23,"Jérémie":24,"Lamentations":25,"Ézéchiel":26,"Daniel":27,
  "Osée":28,"Joël":29,"Amos":30,"Abdias":31,"Jonas":32,"Michée":33,"Nahum":34,
  "Habacuc":35,"Sophonie":36,"Aggée":37,"Zacharie":38,"Malachie":39,
  "Matthieu":40,"Marc":41,"Luc":42,"Jean":43,"Actes":44,"Romains":45,
  "1 Corinthiens":46,"2 Corinthiens":47,"Galates":48,"Éphésiens":49,"Philippiens":50,"Colossiens":51,
  "1 Thessaloniciens":52,"2 Thessaloniciens":53,"1 Timothée":54,"2 Timothée":55,"Tite":56,
  "Philémon":57,"Hébreux":58,"Jacques":59,"1 Pierre":60,"2 Pierre":61,
  "1 Jean":62,"2 Jean":63,"3 Jean":64,"Jude":65,"Apocalypse":66,
};

function getBookNum(book: string): number | null {
  return BOOK_MAP_KO[book] ?? BOOK_MAP_EN[book] ?? BOOK_MAP_DE[book] ?? BOOK_MAP_FR[book] ?? null;
}
// 책 번호 약어 (reference 표시용)
const BOOK_SHORT: Record<string, string> = {
  "창세기": "창", "출애굽기": "출", "레위기": "레", "민수기": "민", "신명기": "신",
  "여호수아": "수", "사사기": "삿", "룻기": "룻", "사무엘상": "삼상", "사무엘하": "삼하",
  "열왕기상": "왕상", "열왕기하": "왕하", "역대상": "대상", "역대하": "대하", "에스라": "스",
  "느헤미야": "느", "에스더": "에", "욥기": "욥", "시편": "시", "잠언": "잠",
  "전도서": "전", "아가": "아", "이사야": "사", "예레미야": "렘", "예레미야애가": "애",
  "에스겔": "겔", "다니엘": "단", "호세아": "호", "요엘": "욜", "아모스": "암",
  "오바댜": "옵", "요나": "욘", "미가": "미", "나훔": "나", "하박국": "합",
  "스바냐": "습", "학개": "학", "스가랴": "슥", "말라기": "말",
  "마태복음": "마", "마가복음": "막", "누가복음": "눅", "요한복음": "요",
  "사도행전": "행", "로마서": "롬", "고린도전서": "고전", "고린도후서": "고후",
  "갈라디아서": "갈", "에베소서": "엡", "빌립보서": "빌", "골로새서": "골",
  "데살로니가전서": "살전", "데살로니가후서": "살후", "디모데전서": "딤전", "디모데후서": "딤후",
  "디도서": "딛", "빌레몬서": "몬", "히브리서": "히", "야고보서": "약",
  "베드로전서": "벧전", "베드로후서": "벧후", "요한일서": "요일", "요한이서": "요이",
  "요한삼서": "요삼", "유다서": "유", "요한계시록": "계",
};

const API_BASE = "https://bible.asher.design/api/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const book = searchParams.get("book") ?? "요한복음";
  const chapter = searchParams.get("chapter") ?? "3";
  const startVerse = parseInt(searchParams.get("startVerse") ?? "16");
  const endVerse = parseInt(searchParams.get("endVerse") ?? String(startVerse));
  const translationId = searchParams.get("translation") ?? "92"; // 기본: 개역개정

  const bookNum = getBookNum(book);
  if (!bookNum) {
    return NextResponse.json({ error: `책 이름을 찾을 수 없어요: ${book}` }, { status: 400 });
  }

  try {
    let url = `${API_BASE}/verse.php?translation=${translationId}&book=${bookNum}&chapter=${chapter}&verse=${startVerse}`;
    if (endVerse > startVerse) url += `&verse_to=${endVerse}`;

    const res = await fetch(url, { next: { revalidate: 86400 } });
    const json = await res.json();

    if (!json.ok || !json.data?.gospel) {
      return NextResponse.json({ error: "본문을 불러올 수 없어요." }, { status: 404 });
    }

    const verses = json.data.gospel.map((v: any) => ({
      num: v.verse,
      text: v.text,
    }));

    const short = BOOK_SHORT[book] ?? book;
    const reference = endVerse > startVerse
      ? `${short} ${chapter}:${startVerse}-${endVerse}`
      : `${short} ${chapter}:${startVerse}`;

    const fullText = verses.map((v: any) => `${v.num} ${v.text}`).join("\n");

    return NextResponse.json({ text: fullText, verses, reference, version: translationId });

  } catch (e) {
    return NextResponse.json({ error: "네트워크 오류가 발생했어요" }, { status: 500 });
  }
}
