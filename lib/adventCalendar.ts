import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
import { getLocalDateString } from "@/lib/date";
import type { Lang } from "@/lib/i18n";
import type { createClient } from "@/lib/supabase";

export const ADVENT_ASSETS = "/images/seasonal/advent-2026";
export const ADVENT_BADGE_IMAGE = `${ADVENT_ASSETS}/badge.webp`;
export const ADVENT_TILE_DAYS = [16, 3, 21, 8, 12, 1, 7, 19, 5, 14, 10, 23, 22, 24, 17, 11, 4, 15, 9, 6, 20, 2, 13, 18] as const;

const FIRST_DAY = "2026-12-01";
const LAST_DAY = "2026-12-24";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RPC_TIMEOUT_MS = 7_000;

type AdventSeason = "teaser" | "open" | "inactive";
type HeartReward = { type: "hearts"; count: number };
type VerseReward = {
  type: "verse";
  name: string;
  file: string;
  localizedChapterAndVerse?: Partial<Record<Lang, string>>;
};
type AdventItemCategory = "profile" | "scarf" | "background" | "top" | "hat";
export type AdventItemReward = {
  type: "item";
  itemId: string;
  category: AdventItemCategory;
  names: Record<Lang, string>;
};
type BadgeReward = { type: "badge"; name: string; file: string };
export type AdventReward = HeartReward | VerseReward | AdventItemReward | BadgeReward;

export type AdventCalendarData = {
  localDate: string;
  studiedDays: ReadonlySet<number>;
  claimedRewards: ReadonlyMap<number, AdventReward>;
};

export type AdventCompletionContext = {
  completionDate: string;
  utcOffsetMinutes: number;
};

type AdventClaim = {
  day: number;
  reward: AdventReward;
  claimedAt: string;
};

type AdventClient = ReturnType<typeof createClient>;

const REWARDS: readonly (AdventReward | null)[] = [
  null,
  { type: "hearts", count: 5 },
  {
    type: "item", itemId: "advent_2026_sheep", category: "profile",
    names: { ko: "양 프로필 소품", en: "Sheep Profile Decoration", de: "Schaf-Profildeko", fr: "Décoration de profil Mouton", es: "Decoración de perfil de oveja" },
  },
  { type: "verse", name: "이사야 7:14", file: "01_isaiah_7_14_ko.webp" },
  {
    type: "item", itemId: "advent_2026_red_scarf", category: "scarf",
    names: { ko: "붉은 체크 머플러", en: "Red Plaid Scarf", de: "Rot karierter Schal", fr: "Écharpe rouge à carreaux", es: "Bufanda roja a cuadros" },
  },
  { type: "hearts", count: 7 },
  {
    type: "verse", name: "미가 5:2", file: "02_micah_5_2_ko.webp",
    localizedChapterAndVerse: { de: "5:1", fr: "5:1" },
  },
  {
    type: "item", itemId: "advent_2026_bethlehem", category: "background",
    names: { ko: "베들레헴 배경", en: "Bethlehem Background", de: "Hintergrund Bethlehem", fr: "Arrière-plan de Bethléem", es: "Fondo de Belén" },
  },
  {
    type: "item", itemId: "advent_2026_cream_knit", category: "top",
    names: { ko: "크림 성탄 니트", en: "Cream Christmas Sweater", de: "Cremefarbener Weihnachtspullover", fr: "Pull de Noël crème", es: "Suéter navideño crema" },
  },
  { type: "hearts", count: 10 },
  { type: "verse", name: "마태복음 1:23", file: "03_matthew_1_23_ko.webp" },
  {
    type: "item", itemId: "advent_2026_tree", category: "profile",
    names: { ko: "성탄트리 프로필 소품", en: "Christmas Tree Profile Decoration", de: "Weihnachtsbaum-Profildeko", fr: "Décoration de profil Sapin de Noël", es: "Decoración de perfil de árbol de Navidad" },
  },
  {
    type: "item", itemId: "advent_2026_hat", category: "hat",
    names: { ko: "성탄 모자", en: "Christmas Hat", de: "Weihnachtsmütze", fr: "Bonnet de Noël", es: "Gorro navideño" },
  },
  { type: "verse", name: "요한복음 1:14", file: "04_john_1_14_ko.webp" },
  { type: "hearts", count: 13 },
  {
    type: "item", itemId: "advent_2026_cream_scarf", category: "scarf",
    names: { ko: "크림 골지 머플러", en: "Cream Ribbed Scarf", de: "Cremefarbener Rippstrickschal", fr: "Écharpe côtelée crème", es: "Bufanda acanalada crema" },
  },
  {
    type: "item", itemId: "advent_2026_church", category: "background",
    names: { ko: "성탄 교회 배경", en: "Christmas Church Background", de: "Hintergrund Weihnachtskirche", fr: "Arrière-plan Église de Noël", es: "Fondo de iglesia en Navidad" },
  },
  {
    type: "item", itemId: "advent_2026_cardigan", category: "top",
    names: { ko: "초록 눈사람 가디건", en: "Green Snowman Cardigan", de: "Grüne Strickjacke mit Schneemann", fr: "Gilet vert bonhomme de neige", es: "Cárdigan verde con muñeco de nieve" },
  },
  { type: "hearts", count: 15 },
  {
    type: "item", itemId: "advent_2026_snowman", category: "profile",
    names: { ko: "눈사람 프로필 소품", en: "Snowman Profile Decoration", de: "Schneemann-Profildeko", fr: "Décoration de profil Bonhomme de neige", es: "Decoración de perfil de muñeco de nieve" },
  },
  { type: "verse", name: "갈라디아서 4:4–5", file: "05_galatians_4_4_5_ko.webp" },
  {
    type: "item", itemId: "advent_2026_home", category: "background",
    names: { ko: "따뜻한 집 안 배경", en: "Cozy Home Background", de: "Hintergrund Gemütliches Zuhause", fr: "Arrière-plan Maison chaleureuse", es: "Fondo de hogar acogedor" },
  },
  { type: "hearts", count: 20 },
  { type: "verse", name: "요한복음 3:16", file: "06_john_3_16_ko.webp" },
];

const BADGE_NAMES: Record<Lang, string> = {
  ko: "Advent Calendar 완주 배지",
  en: "Advent Calendar Completion Badge",
  de: "Abzeichen für den Adventskalender",
  fr: "Badge du calendrier de l’Avent",
  es: "Insignia del calendario de Adviento",
};

export function getAdventBadgeName(lang: Lang): string {
  return BADGE_NAMES[lang];
}

export function getAdventItemName(item: AdventItemReward, lang: Lang): string {
  return item.names[lang];
}

export function getAdventSeason(localDate = getLocalDateString()): AdventSeason {
  if (localDate === "2026-11-29" || localDate === "2026-11-30") return "teaser";
  return DATE.test(localDate) && localDate >= FIRST_DAY && localDate <= LAST_DAY ? "open" : "inactive";
}

export function getAdventDay(localDate: string): number | null {
  return getAdventSeason(localDate) === "open" ? Number(localDate.slice(-2)) : null;
}

function isAdventDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= ADVENT_TILE_DAYS.length;
}

function isUtcOffset(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= 840;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Advent Calendar response");
  return value as Record<string, unknown>;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function getAdventReward(day: number, type: unknown): AdventReward | null {
  if (day === 24) {
    if (type === "badge") return { type: "badge", name: getAdventBadgeName("ko"), file: "badge.webp" };
    if (type === "hearts") return { type: "hearts", count: 5 };
    return null;
  }

  const reward = REWARDS[day];
  return reward?.type === type ? reward ?? null : null;
}

function normalizeClaim(value: unknown): AdventClaim {
  const row = asObject(value);
  if (!isAdventDay(row.day) || !isTimestamp(row.claimed_at)) {
    throw new Error("Invalid Advent Calendar claim");
  }
  const reward = getAdventReward(row.day, row.reward_type);
  if (
    !reward || (reward.type === "hearts" && reward.count !== row.heart_count)
    || (reward.type === "item" && reward.itemId !== row.item_key)
  ) {
    throw new Error("Invalid Advent Calendar reward");
  }
  return { day: row.day, reward, claimedAt: row.claimed_at };
}

async function adventRpc(
  supabase: AdventClient,
  name: string,
  params: Record<string, string | number>,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.rpc(name, params).abortSignal(controller.signal);
    if (error) throw error;
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadAdventCalendar(supabase: AdventClient, userId: string): Promise<AdventCalendarData> {
  await flushAdventCompletions(supabase, userId);
  const value = asObject(await adventRpc(supabase, "get_advent_calendar", {
    p_utc_offset_minutes: new Date().getTimezoneOffset(),
    p_expected_user_id: userId,
  }));
  if (typeof value.local_date !== "string" || !DATE.test(value.local_date)
    || !Array.isArray(value.completed_days) || !Array.isArray(value.claims)) {
    throw new Error("Invalid Advent Calendar data");
  }

  const claimedRewards = new Map<number, AdventReward>();
  for (const row of value.claims) {
    const claim = normalizeClaim(row);
    claimedRewards.set(claim.day, claim.reward);
  }
  return {
    localDate: value.local_date,
    studiedDays: new Set(value.completed_days.filter(isAdventDay)),
    claimedRewards,
  };
}

export async function claimAdventGift(supabase: AdventClient, userId: string, day: number): Promise<AdventClaim> {
  if (!isAdventDay(day)) throw new Error("Invalid Advent Calendar day");
  await flushAdventCompletions(supabase, userId);
  // A transient failure with the reflection ledger must not irrevocably
  // exchange a complete calendar's badge for the fallback hearts.
  const prerequisiteDays = day === 24 ? ADVENT_TILE_DAYS : [day];
  if (prerequisiteDays.some(value => queuedCompletion(userId, value))) {
    throw new Error("Advent Calendar completion is awaiting confirmation");
  }
  const claim = normalizeClaim(await adventRpc(supabase, "claim_advent_gift", {
    p_day: day,
    p_utc_offset_minutes: new Date().getTimezoneOffset(),
    p_expected_user_id: userId,
  }));
  if (claim.day !== day) throw new Error("Invalid Advent Calendar claim day");
  return claim;
}

export async function loadAdventBadge(supabase: AdventClient, userId: string): Promise<string | null> {
  const value = await adventRpc(supabase, "get_advent_badge", { p_expected_user_id: userId });
  if (value !== null && !isTimestamp(value)) throw new Error("Invalid Advent Calendar badge");
  return value;
}

export function captureAdventCompletion(userId: string, completionDate: string): AdventCompletionContext | null {
  const now = new Date();
  return userId && getAdventDay(completionDate) !== null && completionDate === getLocalDateString(now)
    ? { completionDate, utcOffsetMinutes: now.getTimezoneOffset() }
    : null;
}

type CompletionProof = { completionDate: string; qtRecordId: string; utcOffsetMinutes: number };
const proofMemory = new Map<string, CompletionProof>();
const completionFlushes = new Map<string, Promise<ReadonlySet<string>>>();
const invalidProofReasons = new Set([
  "outside_event", "invalid_proof", "reflection_not_found", "not_completed", "not_same_local_day",
]);

// Use an existing account-scoped prefix so account deletion clears this outbox.
function proofKey(userId: string, completionDate: string) {
  return `roots_campaign_seen_${userId}_advent_2026_${completionDate}`;
}

function readProof(key: string, completionDate: string): CompletionProof | null {
  const stored = storageGet(key);
  if (stored && stored.length < 512) {
    try {
      const proof = asObject(JSON.parse(stored));
      if (proof.completionDate === completionDate && typeof proof.qtRecordId === "string" && UUID.test(proof.qtRecordId)
        && isUtcOffset(proof.utcOffsetMinutes)) {
        return { completionDate, qtRecordId: proof.qtRecordId, utcOffsetMinutes: proof.utcOffsetMinutes };
      }
    } catch { /* The browser may contain stale or corrupt local data. */ }
  }
  return proofMemory.get(key) ?? null;
}

function queuedCompletion(userId: string, day: number) {
  const completionDate = `2026-12-${String(day).padStart(2, "0")}`;
  const key = proofKey(userId, completionDate);
  const proof = readProof(key, completionDate);
  return proof && { key, proof };
}

export function flushAdventCompletions(supabase: AdventClient, userId: string): Promise<ReadonlySet<string>> {
  const existing = completionFlushes.get(userId);
  if (existing) return existing;

  const confirmed = new Set<string>();
  const operation = (async () => {
    for (let day = 1; day <= ADVENT_TILE_DAYS.length; day += 1) {
      const queued = queuedCompletion(userId, day);
      if (!queued) continue;
      const { key, proof } = queued;
      try {
        const result = asObject(await adventRpc(supabase, "record_advent_completion", {
          p_completion_date: proof.completionDate,
          p_qt_record_id: proof.qtRecordId,
          p_utc_offset_minutes: proof.utcOffsetMinutes,
          p_expected_user_id: userId,
        }));
        if (result.recorded === true) {
          confirmed.add(key);
        } else if (!invalidProofReasons.has(String(result.reason))) {
          break;
        }
        if (readProof(key, proof.completionDate)?.qtRecordId === proof.qtRecordId) {
          proofMemory.delete(key);
          storageRemove(key);
        }
      } catch {
        // The successful Reflection can return Home immediately. Retry on
        // the next calendar load before treating its gift as unavailable.
        break;
      }
    }
    return confirmed;
  })();
  completionFlushes.set(userId, operation);
  void operation.finally(() => {
    if (completionFlushes.get(userId) === operation) completionFlushes.delete(userId);
  });
  return operation;
}

export async function recordAdventCompletion(
  supabase: AdventClient,
  userId: string,
  completionDate: string,
  qtRecordId?: string | null,
  capturedUtcOffsetMinutes?: number | null,
): Promise<boolean> {
  if (!userId || !qtRecordId || !UUID.test(qtRecordId) || getAdventDay(completionDate) === null) return false;
  const key = proofKey(userId, completionDate);
  if (!readProof(key, completionDate)) {
    const utcOffsetMinutes = capturedUtcOffsetMinutes ?? captureAdventCompletion(userId, completionDate)?.utcOffsetMinutes;
    if (!isUtcOffset(utcOffsetMinutes)) return false;
    const proof = { completionDate, qtRecordId, utcOffsetMinutes };
    proofMemory.set(key, proof);
    storageSet(key, JSON.stringify(proof));
  }
  const active = completionFlushes.get(userId);
  if (active && (await active).has(key)) return true;
  return (await flushAdventCompletions(supabase, userId)).has(key);
}
