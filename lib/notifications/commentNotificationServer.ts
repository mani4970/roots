import { createClient } from "@supabase/supabase-js";
import { sendCommentNotificationPush } from "@/lib/notifications/serverPush";
import {
  commentNotificationMessage,
  getCommentNotificationText,
} from "@/lib/notifications/commentNotificationText";
import { commentNotificationLink } from "@/lib/notifications/commentNotifications";
import { FALLBACK_LANG, SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

export function commentNotificationAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("Comment notification server configuration is missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function dispatchCommentNotifications(
  admin: any,
  commentId: string | null = null,
) {
  const { data: jobs, error } = await admin.rpc(
    "claim_qt_comment_notification_jobs",
    { p_comment_id: commentId, p_limit: 8 },
  );
  if (error) throw error;
  const summary = { claimed: jobs?.length ?? 0, sent: 0, retry: 0, skipped: 0 };
  // Two jobs at a time keeps provider timeouts below the three-minute DB lease.
  async function deliver(job: any) {
    const finish = async (
      state: "sent" | "skipped" | "pending",
      reason?: string,
    ) => {
      const result = await admin.rpc("finish_qt_comment_notification_job", {
        p_id: job.id,
        p_claim: job.claim_id,
        p_state: state,
        p_error: reason ?? null,
      });
      if (result.error) throw result.error;
      if (state === "sent") summary.sent++;
      else if (state === "pending") summary.retry++;
      else summary.skipped++;
    };
    try {
      const result = await admin.rpc("get_qt_comment_notification_delivery", {
        p_id: job.id,
        p_claim: job.claim_id,
      });
      if (result.error) throw result.error;
      const context = result.data;
      if (!context) return;
      if (!context.allowed) {
        await finish("skipped");
        return;
      }
      const lang: Lang = SUPPORTED_LANGS.includes(context.locale)
        ? context.locale
        : FALLBACK_LANG;
      let retry = (context.tokens?.length ?? 0) > 8;
      let delivered = context.has_sent === true;
      const tokens = (context.tokens ?? []).slice(0, 8);
      for (let offset = 0; offset < tokens.length; offset += 4) {
        await Promise.all(
          tokens.slice(offset, offset + 4).map(async (token: any) => {
            const result = await sendCommentNotificationPush(token, {
              id: job.id,
              recipient_id: job.recipient_id,
              type:
                job.kind === "reply" ? "qt_comment_reply" : "qt_comment_added",
              scope: "reflection",
              title: Array.from(
                commentNotificationMessage(job.kind, context.name, lang),
              )
                .slice(0, 160)
                .join(""),
              body: getCommentNotificationText(lang).pushBody,
              deep_link: commentNotificationLink(job.id),
              push_status: "pending",
              collapseKey: job.id,
            });
            if (!result.configured) {
              retry = true;
              return;
            }
            const state = result.result.ok
              ? "sent"
              : result.result.shouldDisableToken
                ? "disabled"
                : "failed";
            const saved = await admin.rpc(
              "record_qt_comment_notification_delivery",
              {
                p_id: job.id,
                p_claim: job.claim_id,
                p_token: token.id,
                p_state: state,
                p_error: result.result.error ?? null,
              },
            );
            if (saved.error || saved.data !== true)
              throw saved.error ?? new Error("Delivery lease expired");
            if (state === "sent") delivered = true;
            if (state === "failed") retry = true;
          }),
        );
      }
      await finish(
        retry ? "pending" : delivered ? "sent" : "skipped",
        retry ? "Provider delivery will be retried" : undefined,
      );
    } catch {
      await finish("pending", "Temporary delivery error");
    }
  }
  for (let offset = 0; offset < (jobs?.length ?? 0); offset += 2)
    await Promise.all(jobs.slice(offset, offset + 2).map(deliver));
  return summary;
}
