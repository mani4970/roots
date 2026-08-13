import { NextResponse } from "next/server";
import { TRANSLATIONS } from "@/lib/bibleData";

export const dynamic = "force-dynamic";

const LANGUAGE_BY_GROUP: Readonly<Record<string, string>> = {
  "한국어": "ko",
  English: "en",
  Deutsch: "de",
  Français: "fr",
};

export async function GET() {
  const data = TRANSLATIONS.flatMap((group) => {
    const language = LANGUAGE_BY_GROUP[group.group] ?? "";
    return group.items.map((item) => ({
      id: item.id,
      name: item.name,
      language,
    }));
  });

  return NextResponse.json({ ok: true, data });
}
