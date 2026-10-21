import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
import { getUserCampaignLocalStorageKey, loadUserCampaignSeen, markUserCampaignSeen } from "@/lib/userCampaignImpressions";

export const MESSENGER_SHARE_ANNOUNCEMENT_KEY = "messenger_share_announcement_20261021";

const pendingRequests = new Map<string, Promise<boolean>>();

function keys(userId: string) {
  const seen = getUserCampaignLocalStorageKey(MESSENGER_SHARE_ANNOUNCEMENT_KEY, userId);
  return { seen, pending: `${seen}_pending` };
}

async function retryPendingAcknowledgement(supabase: any, userId: string): Promise<boolean> {
  const key = keys(userId);
  if (!storageGet(key.pending)) return true;
  const existing = pendingRequests.get(userId);
  if (existing) return existing;
  const request = (async () => {
    try {
      await markUserCampaignSeen(supabase, userId, MESSENGER_SHARE_ANNOUNCEMENT_KEY);
      storageRemove(key.pending);
      return true;
    } catch {
      // Keep the account-scoped outbox until a later Home entry or reconnect.
      return false;
    }
  })();
  pendingRequests.set(userId, request);
  try { return await request; }
  finally { if (pendingRequests.get(userId) === request) pendingRequests.delete(userId); }
}

/** Reading or displaying the announcement never acknowledges it. */
export async function readMessengerShareAnnouncementSeen(supabase: any, userId: string): Promise<boolean | null> {
  if (!userId) return null;
  const key = keys(userId);
  if (storageGet(key.seen)) {
    void retryPendingAcknowledgement(supabase, userId);
    return true;
  }
  const seen = await loadUserCampaignSeen(supabase, userId, MESSENGER_SHARE_ANNOUNCEMENT_KEY);
  // The user may have confirmed while this earlier lookup was in flight.
  if (storageGet(key.seen)) return true;
  if (seen === true) {
    storageSet(key.seen, "true");
    storageRemove(key.pending);
  }
  return seen;
}

/** Call only after Confirm or an existing allowed dismissal. Local receipt is synchronous. */
export async function acknowledgeMessengerShareAnnouncement(supabase: any, userId: string): Promise<boolean> {
  if (!userId) return false;
  const key = keys(userId);
  storageSet(key.seen, "true");
  storageSet(key.pending, "true");
  return retryPendingAcknowledgement(supabase, userId);
}
