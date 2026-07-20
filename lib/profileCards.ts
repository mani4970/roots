export type ProfileCard = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  streak_days: number | null;
};

const PROFILE_CARD_BATCH_SIZE = 100;
const MAX_PROFILE_CARD_IDS_PER_LOAD = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uniqueProfileIds(values: unknown[]) {
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const value of values) {
    const id = String(value ?? "").trim();
    if (!UUID_PATTERN.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_PROFILE_CARD_IDS_PER_LOAD) break;
  }

  return ids;
}

function normalizeProfileCard(row: any): ProfileCard | null {
  const id = String(row?.id ?? "").trim();
  if (!UUID_PATTERN.test(id)) return null;

  return {
    id,
    name: typeof row?.name === "string" ? row.name : null,
    avatar_url: typeof row?.avatar_url === "string" ? row.avatar_url : null,
    streak_days:
      typeof row?.streak_days === "number" && Number.isFinite(row.streak_days)
        ? row.streak_days
        : null,
  };
}

export async function loadProfileCards(
  supabase: any,
  userIds: unknown[],
): Promise<ProfileCard[]> {
  const ids = uniqueProfileIds(userIds);
  if (ids.length === 0) return [];

  const rows: ProfileCard[] = [];

  for (let index = 0; index < ids.length; index += PROFILE_CARD_BATCH_SIZE) {
    const batch = ids.slice(index, index + PROFILE_CARD_BATCH_SIZE);
    const { data, error } = await supabase.rpc(
      "get_authenticated_profile_cards",
      { p_user_ids: batch },
    );

    if (error) throw error;

    (data ?? []).forEach((row: any) => {
      const profile = normalizeProfileCard(row);
      if (profile) rows.push(profile);
    });
  }

  return rows;
}

export async function loadProfileCard(
  supabase: any,
  userId: unknown,
): Promise<ProfileCard | null> {
  const [profile] = await loadProfileCards(supabase, [userId]);
  return profile ?? null;
}

export function mapProfileCards(profiles: ProfileCard[]) {
  const profileMap: Record<string, ProfileCard> = {};
  profiles.forEach((profile) => {
    profileMap[profile.id] = profile;
  });
  return profileMap;
}
