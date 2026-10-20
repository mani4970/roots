import { loadProfileCards, type ProfileCard } from "@/lib/profileCards";

const PROFILE_TTL_MS = 60_000;
const MAX_CACHED_PROFILES = 500;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CachedProfile = { profile: ProfileCard; expiresAt: number };

function profileIds(values: unknown[]) {
  const ids = new Set<string>();
  for (const value of values) {
    const id = String(value ?? "").trim();
    if (UUID_PATTERN.test(id)) ids.add(id);
    if (ids.size >= MAX_CACHED_PROFILES) break;
  }
  return Array.from(ids);
}

function minimalProfile(profile: ProfileCard): ProfileCard {
  return {
    id: profile.id,
    name: typeof profile.name === "string" ? profile.name : null,
    avatar_url: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
    streak_days: typeof profile.streak_days === "number" && Number.isFinite(profile.streak_days)
      ? profile.streak_days : null,
  };
}

/** A page-owned cache of the same minimal cards returned by the authenticated RPC. */
export function createCommunityProfileCardCache() {
  let currentViewerId: string | null = null;
  let generation = 0;
  const cached = new Map<string, CachedProfile>();
  const pending = new Map<string, Promise<ProfileCard | undefined>>();

  function useViewer(viewerId: string) {
    if (currentViewerId !== viewerId) {
      currentViewerId = viewerId;
      generation += 1;
      cached.clear();
      pending.clear();
    }
    return generation;
  }

  function store(profile: ProfileCard) {
    if (!UUID_PATTERN.test(profile.id)) return;
    cached.delete(profile.id);
    cached.set(profile.id, { profile: minimalProfile(profile), expiresAt: Date.now() + PROFILE_TTL_MS });
    while (cached.size > MAX_CACHED_PROFILES) cached.delete(cached.keys().next().value!);
  }

  return {
    remember(viewerId: string, profiles: ProfileCard[]) {
      if (!viewerId) return;
      // A late list response must not switch an already-established viewer back.
      if (currentViewerId !== null && currentViewerId !== viewerId) return;
      useViewer(viewerId);
      profiles.forEach(store);
    },
    async load(supabase: any, viewerId: string, values: unknown[]): Promise<Record<string, ProfileCard>> {
      const requestGeneration = useViewer(viewerId);
      if (!viewerId) return {};
      const ids = profileIds(values);
      const missing = ids.filter((id) => {
        const entry = cached.get(id);
        if (entry && entry.expiresAt <= Date.now()) cached.delete(id);
        return !cached.has(id) && !pending.has(id);
      });

      if (missing.length > 0) {
        const batch = loadProfileCards(supabase, missing).then((profiles) => {
          const result: Record<string, ProfileCard> = {};
          profiles.forEach((profile) => { result[profile.id] = profile; });
          if (generation === requestGeneration) profiles.forEach(store);
          return result;
        });
        missing.forEach((id) => {
          const request = batch.then((profiles) => profiles[id]);
          pending.set(id, request);
          const cleanup = () => { if (pending.get(id) === request) pending.delete(id); };
          void request.then(cleanup, cleanup);
        });
      }

      const profiles = await Promise.all(ids.map((id) => pending.get(id) ?? cached.get(id)?.profile));
      if (generation !== requestGeneration) return {};
      const result: Record<string, ProfileCard> = {};
      profiles.forEach((profile) => { if (profile) result[profile.id] = profile; });
      return result;
    },
  };
}
