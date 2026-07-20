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
) {
  const { data, error } = await supabase.rpc("update_own_profile_preferences", {
    p_name: changes.name ?? null,
    p_preferred_language: changes.preferredLanguage ?? null,
    p_preferred_translation: changes.preferredTranslation ?? null,
    p_avatar_type: changes.avatarType ?? null,
    p_avatar_choice_seen: changes.avatarChoiceSeen ?? null,
  });

  if (error) throw error;
  if (!data || data.updated !== true) {
    throw new Error(data?.reason ?? "Could not save profile preferences.");
  }

  return data;
}
