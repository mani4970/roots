import type { createClient } from "@/lib/supabase";
import { storageGetJson, storageSetJson } from "@/lib/clientStorage";

type IntercessionRemovalResult = {
  removed: boolean;
  countSynced: true;
};

/** Removes only the signed-in viewer's membership; the RPC synchronizes its count atomically. */
export async function removeIntercessionFromList(
  supabase: ReturnType<typeof createClient>,
  prayerId: string,
  expectedUserId: string,
): Promise<IntercessionRemovalResult> {
  if (!prayerId || !expectedUserId) throw new Error("Missing intercession removal target");

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user || user.id !== expectedUserId) throw new Error("Intercession account changed");

  // Do not fall back to a raw DELETE: the existing add-count RPC requires a log
  // and cannot safely synchronize prayer_count after that log is removed.
  const { data, error } = await supabase.rpc("remove_own_intercession", {
    p_prayer_id: prayerId,
  });
  if (error) throw error;
  if (
    !data || typeof data !== "object" ||
    typeof data.removed !== "boolean" ||
    typeof data.already_absent !== "boolean" ||
    data.removed === data.already_absent
  ) {
    throw new Error("Intercession removal was not confirmed");
  }

  const cacheKey = `comm_prayed_${user.id}`;
  const cached = storageGetJson<unknown>(cacheKey, null);
  if (Array.isArray(cached)) {
    storageSetJson(cacheKey, cached.filter((id) => typeof id === "string" && id !== prayerId));
  }

  return { removed: data.removed, countSynced: true };
}
