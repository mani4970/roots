import { sendGiftNotificationPush } from "@/lib/notifications/serverPush";
import { giftNotificationMessage } from "@/lib/notifications/giftNotificationText";

type Target = { senderId: string; requestId: string };

/** Processes only committed gifts. A push failure never changes the gift itself. */
export async function dispatchGiftNotifications(admin: any, target: Target | null = null) {
  const { data: jobs, error } = await admin.rpc("claim_heart_shop_gift_push_jobs", {
    p_sender_id: target?.senderId ?? null,
    p_request_id: target?.requestId ?? null,
    p_limit: 8,
  });
  if (error) throw error;
  const summary = { claimed: jobs?.length ?? 0, sent: 0, retry: 0, skipped: 0 };
  async function deliver(job: any) {
    const finish = async (state: "sent" | "skipped" | "pending", reason?: string) => {
      const saved = await admin.rpc("finish_heart_shop_gift_push_job", {
        p_id: job.id, p_claim: job.claim_id, p_state: state, p_error: reason ?? null,
      });
      if (saved.error || saved.data !== true) throw saved.error ?? new Error("Gift delivery lease expired");
      if (state === "sent") summary.sent++;
      else if (state === "pending") summary.retry++;
      else summary.skipped++;
    };
    try {
      const result = await admin.rpc("get_heart_shop_gift_push_delivery", { p_id: job.id, p_claim: job.claim_id });
      if (result.error) throw result.error;
      const context = result.data;
      if (!context) return;
      if (!context.allowed) { await finish("skipped"); return; }
      const message = giftNotificationMessage(context.name, context.locale);
      let retry = (context.tokens?.length ?? 0) > 8;
      let delivered = context.has_sent === true;
      const tokens = (context.tokens ?? []).slice(0, 8);
      for (let offset = 0; offset < tokens.length; offset += 4) {
        await Promise.all(tokens.slice(offset, offset + 4).map(async (token: any) => {
          const push = await sendGiftNotificationPush(token, {
            id: job.id, recipient_id: job.recipient_id, type: "heart_shop_gift_received", scope: "gift",
            title: message.title, body: message.body,
            deep_link: `/?giftId=${encodeURIComponent(job.id)}&giftRecipient=${encodeURIComponent(job.recipient_id)}`,
            push_status: "pending", collapseKey: job.id,
          });
          if (!push.configured) { retry = true; return; }
          const state = push.result.ok ? "sent" : push.result.shouldDisableToken ? "disabled" : "failed";
          const saved = await admin.rpc("record_heart_shop_gift_push_delivery", {
            p_id: job.id, p_claim: job.claim_id, p_token: token.id, p_state: state, p_error: push.result.error ?? null,
          });
          if (saved.error || saved.data !== true) throw saved.error ?? new Error("Gift delivery lease expired");
          if (state === "sent") delivered = true;
          if (state === "failed") retry = true;
        }));
      }
      await finish(retry ? "pending" : delivered ? "sent" : "skipped", retry ? "Provider delivery will be retried" : undefined);
    } catch {
      // If this final write is also unavailable the DB lease eventually expires.
      try { await finish("pending", "Temporary delivery error"); } catch { summary.retry++; }
    }
  }
  for (let offset = 0; offset < (jobs?.length ?? 0); offset += 2) {
    await Promise.all(jobs.slice(offset, offset + 2).map(deliver));
  }
  return summary;
}
