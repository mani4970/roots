"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import { getLocalDateString } from "@/lib/date";
import { getRecallDate, isDisplayableRecall, type RecallRecord } from "@/lib/wordCardRecord";
import { readRecallRecord } from "@/lib/wordCardQueries";
import { dailyWordEntry, isDailyWordInScope, type DailyWordRecord } from "@/lib/dailyWordCardRecord";
import { WordCardHomeActions } from "./WordCard";
import RecallWordCardModal from "./RecallWordCardModal";
import DailyWordCardModal from "./DailyWordCardModal";

type Availability = { scope: string; status: "loading" | "ready" | "empty" | "error" };
// Presence only, one owner/day, short-lived and in memory. No private text/cache
// written to localStorage. Returning Home does not swap a clock icon for a spinner.
let lastRecallAvailability: (Availability & { expiresAt: number }) | null = null;
type Props = { userId: string; lang: Lang; today: string; open: boolean; onOpenChange: (open: boolean) => void;
  dailyRecord: DailyWordRecord | null; dailyReady: boolean; todayOpen: boolean; onTodayOpenChange: (open: boolean) => void };

export default function HomeWordCardButtons({ userId, lang, today, open, onOpenChange, dailyRecord, dailyReady, todayOpen, onTodayOpenChange }: Props) {
  const router = useRouter();
  const date = today ? getRecallDate(today) : "";
  const scope = `${userId}:${date}`;
  const dailyScope = `${userId}:${today}`;
  const [availability, setAvailability] = useState<Availability>(() => lastRecallAvailability?.scope === scope && lastRecallAvailability.expiresAt > Date.now()
    ? lastRecallAvailability : { scope: "", status: "loading" });
  const [readDaily, setReadDaily] = useState<{ scope: string; row: DailyWordRecord | null } | null>(null);

  useEffect(() => {
    onOpenChange(false); onTodayOpenChange(false);
    if (!userId || !date) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    setAvailability(previous => previous.scope === scope ? previous : { scope, status: "loading" });
    readRecallRecord(createClient(), userId, date, controller.signal).then(record => {
      if (!cancelled) {
        const value: Availability = { scope, status: isDisplayableRecall(record) ? "ready" : "empty" };
        setAvailability(value); lastRecallAvailability = { ...value, expiresAt: Date.now() + 60_000 };
      }
    }).catch(() => {
      if (!cancelled) setAvailability(previous => previous.scope === scope && previous.status === "ready" ? previous : { scope, status: "error" });
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [userId, date, scope, onOpenChange, onTodayOpenChange]);

  const status = availability.scope === scope ? availability.status : "loading";
  const received = isDailyWordInScope(dailyRecord, userId, today)
    || (readDaily?.scope === dailyScope && isDailyWordInScope(readDaily.row, userId, today));
  const todayStatus = received ? "ready" : dailyReady || readDaily?.scope === dailyScope ? "empty" : "loading";
  function onRecordRead(record: RecallRecord | null) {
    const value: Availability = { scope, status: isDisplayableRecall(record) ? "ready" : "empty" };
    setAvailability(value); lastRecallAvailability = { ...value, expiresAt: Date.now() + 60_000 };
  }
  function receive() {
    onTodayOpenChange(false);
    router.push("/checkin");
  }

  return <>
    <WordCardHomeActions lang={lang} status={status} open={open} received={Boolean(received)} todayOpen={todayOpen}
      onReceive={() => {
        if (!today || getLocalDateString() !== today) return;
        onOpenChange(false);
        if (dailyWordEntry(todayStatus) === "receive") receive();
        else onTodayOpenChange(true);
      }} onRecall={() => { onTodayOpenChange(false); if (date) onOpenChange(true); }} />
    {open && userId && date && <RecallWordCardModal key={scope} userId={userId} date={date} today={today} lang={lang}
      onClose={() => onOpenChange(false)} onRecordRead={onRecordRead} />}
    {todayOpen && userId && today && <DailyWordCardModal key={dailyScope} userId={userId} date={today} lang={lang}
      onClose={() => onTodayOpenChange(false)} onRecordRead={row => setReadDaily({ scope: dailyScope, row })} onMissing={receive} />}
  </>;
}
