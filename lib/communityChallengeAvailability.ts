import type { SupabaseClient } from "@supabase/supabase-js";

type Availability = boolean | null;
type CacheEntry = {
  userId: string;
  today: string;
  value: Availability;
  expiresAt: number;
  pending?: Promise<Availability>;
};

async function readAvailability(supabase: SupabaseClient, today: string): Promise<Availability> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => { controller.abort(); resolve(null); }, 2_000);
    });
    const query = (async (): Promise<Availability> => {
      const { data, error } = await supabase.from("companion_challenges")
        .select("id")
        .in("status", ["scheduled", "active", "completed"])
        .gte("end_date", today)
        .limit(1)
        .abortSignal(controller.signal);
      if (error || !Array.isArray(data)) return null;
      if (data.length === 0) return false;
      return data.length === 1 && typeof data[0]?.id === "string" && data[0].id.trim()
        ? true : null;
    })();
    return await Promise.race([query, timeout]);
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Community display eligibility only; completed-reward checks remain independent. */
export function createCommunityChallengeAvailabilityCache() {
  let entry: CacheEntry | null = null;

  return {
    peek(userId: string | null | undefined, today: string): Availability {
      return userId && entry?.userId === userId && entry.today === today
        && Date.now() < entry.expiresAt ? entry.value : null;
    },
    load(supabase: SupabaseClient, userId: string, today: string): Promise<Availability> {
      if (!userId || !today) return Promise.resolve(null);
      if (entry?.userId === userId && entry.today === today) {
        if (entry.pending) return entry.pending;
        if (Date.now() < entry.expiresAt) return Promise.resolve(entry.value);
      }
      const next: CacheEntry = { userId, today, value: null, expiresAt: 0 };
      entry = next;
      next.pending = readAvailability(supabase, today).then((value) => {
        if (entry === next) {
          next.value = value;
          next.expiresAt = Date.now() + (value === null ? 10_000 : 60_000);
          next.pending = undefined;
        }
        return value;
      });
      return next.pending;
    },
  };
}
