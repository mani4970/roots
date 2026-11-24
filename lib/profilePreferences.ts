import type { Lang } from "@/lib/i18n";
import type { RootsAvatarType } from "@/lib/avatar";

export type ProfilePreferenceChanges = {
  name?: string;
  preferredLanguage?: Lang;
  preferredTranslation?: number;
  avatarType?: RootsAvatarType;
  avatarChoiceSeen?: boolean;
};

export async function saveProfilePreferences(
  supabase: any,
  changes: ProfilePreferenceChanges,
  sessionAccessToken?: string,
) {
  const request = supabase.rpc("update_own_profile_preferences", {
    p_name: changes.name ?? null,
    p_preferred_language: changes.preferredLanguage ?? null,
    p_preferred_translation: changes.preferredTranslation ?? null,
    p_avatar_type: changes.avatarType ?? null,
    p_avatar_choice_seen: changes.avatarChoiceSeen ?? null,
  });

  // A queued language write must belong to the account that initiated it,
  // including when another tab signs in while this request is being sent.
  if (sessionAccessToken) request.setHeader("Authorization", `Bearer ${sessionAccessToken}`);
  const { data, error } = await request;
  if (error) throw error;
  if (!data || data.updated !== true) {
    throw new Error(data?.reason ?? "Could not save profile preferences.");
  }

  return data;
}
