import { connect } from "node:http2";
import { createSign } from "node:crypto";

type PushTokenProvider = "apns" | "fcm";

type PendingNotificationRow = {
  id: string;
  recipient_id: string;
  type: string;
  scope: string;
  title: string;
  body: string;
  deep_link: string;
  push_status: string;
};

type PushTokenRow = {
  id: string;
  user_id: string;
  token: string;
  token_provider: PushTokenProvider;
  enabled: boolean;
};

type ProviderSendResult = {
  ok: boolean;
  provider: PushTokenProvider;
  error?: string;
  shouldDisableToken?: boolean;
};

type PushDispatchSummary = {
  configured: boolean;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
};

type ApnsConfig = {
  teamId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
  environment: "sandbox" | "production";
};

type FcmConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const MAX_DISPATCH_NOTIFICATIONS = 80;
const PUSH_TIMEOUT_MS = 10000;

let apnsJwtCache: { token: string; expiresAt: number; cacheKey: string } | null = null;
let fcmAccessTokenCache: { token: string; expiresAt: number; cacheKey: string } | null = null;

function env(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, privateKey: string, algorithm: "ES256" | "RS256") {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign(algorithm === "ES256" ? "SHA256" : "RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = algorithm === "ES256"
    ? signer.sign({ key: normalizePrivateKey(privateKey), dsaEncoding: "ieee-p1363" })
    : signer.sign(normalizePrivateKey(privateKey));
  return `${signingInput}.${base64url(signature)}`;
}

function getApnsConfig(): ApnsConfig | null {
  const teamId = env("APNS_TEAM_ID");
  const keyId = env("APNS_KEY_ID");
  const privateKey = env("APNS_PRIVATE_KEY");
  const bundleId = env("APNS_BUNDLE_ID") || "com.rootspuce.app";
  const environment = env("APNS_ENVIRONMENT") === "sandbox" ? "sandbox" : "production";

  if (!teamId || !keyId || !privateKey || !bundleId) return null;
  return { teamId, keyId, privateKey, bundleId, environment };
}

function getApnsJwt(config: ApnsConfig) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cacheKey = `${config.teamId}:${config.keyId}:${config.environment}`;
  if (apnsJwtCache && apnsJwtCache.cacheKey === cacheKey && apnsJwtCache.expiresAt > nowSeconds + 60) {
    return apnsJwtCache.token;
  }

  const token = signJwt(
    { alg: "ES256", kid: config.keyId },
    { iss: config.teamId, iat: nowSeconds },
    config.privateKey,
    "ES256"
  );

  // APNs provider tokens are valid for up to 60 minutes. Keep a shorter cache.
  apnsJwtCache = { token, expiresAt: nowSeconds + 45 * 60, cacheKey };
  return token;
}

function parseFirebaseServiceAccountJson(): Partial<FcmConfig> | null {
  const json = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as Record<string, string>;
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  } catch {
    return null;
  }
}

function getFcmConfig(): FcmConfig | null {
  const jsonConfig = parseFirebaseServiceAccountJson();
  const projectId = env("FIREBASE_PROJECT_ID") || env("FCM_PROJECT_ID") || jsonConfig?.projectId || "";
  const clientEmail = env("FIREBASE_CLIENT_EMAIL") || env("FCM_CLIENT_EMAIL") || jsonConfig?.clientEmail || "";
  const privateKey = env("FIREBASE_PRIVATE_KEY") || env("FCM_PRIVATE_KEY") || jsonConfig?.privateKey || "";

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function notificationPayload(row: PendingNotificationRow) {
  return {
    notificationId: row.id,
    deepLink: row.deep_link,
    type: row.type,
    scope: row.scope,
  };
}

async function sendApnsPush(token: string, row: PendingNotificationRow, config: ApnsConfig): Promise<ProviderSendResult> {
  const host = config.environment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const jwt = getApnsJwt(config);
  const payload = JSON.stringify({
    aps: {
      alert: {
        title: row.title,
        body: row.body,
      },
      sound: "default",
    },
    ...notificationPayload(row),
  });

  return new Promise((resolve) => {
    let finished = false;
    const finish = (result: ProviderSendResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      try {
        client.close();
      } catch {
        // ignore close errors
      }
      resolve(result);
    };

    const client = connect(`https://${host}`);
    const timeoutId = setTimeout(() => {
      finish({ ok: false, provider: "apns", error: "APNs request timed out." });
    }, PUSH_TIMEOUT_MS);

    client.on("error", (error) => {
      finish({ ok: false, provider: "apns", error: error.message });
    });

    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });

    let statusCode = 0;
    let responseBody = "";

    request.setEncoding("utf8");
    request.on("response", (headers) => {
      const status = headers[":status"];
      statusCode = typeof status === "number" ? status : Number(status ?? 0);
    });
    request.on("data", (chunk) => {
      responseBody += String(chunk);
    });
    request.on("end", () => {
      if (statusCode >= 200 && statusCode < 300) {
        finish({ ok: true, provider: "apns" });
        return;
      }

      let reason = responseBody;
      try {
        const parsed = JSON.parse(responseBody) as { reason?: string };
        if (parsed.reason) reason = parsed.reason;
      } catch {
        // keep raw body
      }

      const shouldDisableToken = statusCode === 410 || reason === "BadDeviceToken" || reason === "Unregistered";
      finish({
        ok: false,
        provider: "apns",
        error: `APNs ${statusCode || "error"}: ${reason || "unknown error"}`,
        shouldDisableToken,
      });
    });
    request.on("error", (error) => {
      finish({ ok: false, provider: "apns", error: error.message });
    });

    request.write(payload);
    request.end();
  });
}

async function getFcmAccessToken(config: FcmConfig) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cacheKey = `${config.projectId}:${config.clientEmail}`;
  if (fcmAccessTokenCache && fcmAccessTokenCache.cacheKey === cacheKey && fcmAccessTokenCache.expiresAt > nowSeconds + 60) {
    return fcmAccessTokenCache.token;
  }

  const jwt = signJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: config.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    },
    config.privateKey,
    "RS256"
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data?.access_token !== "string") {
    throw new Error(typeof data?.error_description === "string" ? data.error_description : "Failed to get FCM access token.");
  }

  const expiresIn = typeof data?.expires_in === "number" ? data.expires_in : 3600;
  fcmAccessTokenCache = {
    token: data.access_token,
    expiresAt: nowSeconds + Math.max(60, expiresIn - 120),
    cacheKey,
  };
  return data.access_token;
}

async function sendFcmPush(token: string, row: PendingNotificationRow, config: FcmConfig): Promise<ProviderSendResult> {
  const accessToken = await getFcmAccessToken(config);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: row.title,
          body: row.body,
        },
        data: notificationPayload(row),
        android: {
          priority: "HIGH",
          notification: {
            sound: "default",
            channel_id: "default",
          },
        },
      },
    }),
  });

  const text = await response.text();
  if (response.ok) return { ok: true, provider: "fcm" };

  let error = text;
  try {
    const parsed = JSON.parse(text) as { error?: { status?: string; message?: string } };
    error = parsed.error?.message || parsed.error?.status || text;
  } catch {
    // keep raw text
  }

  const shouldDisableToken = /UNREGISTERED|INVALID_ARGUMENT|registration token is not/i.test(error);
  return {
    ok: false,
    provider: "fcm",
    error: `FCM ${response.status}: ${error || "unknown error"}`,
    shouldDisableToken,
  };
}

async function sendProviderPush(token: PushTokenRow, row: PendingNotificationRow, configs: { apns: ApnsConfig | null; fcm: FcmConfig | null }) {
  if (token.token_provider === "apns") {
    if (!configs.apns) return { configured: false as const };
    return { configured: true as const, result: await sendApnsPush(token.token, row, configs.apns) };
  }

  if (!configs.fcm) return { configured: false as const };
  return { configured: true as const, result: await sendFcmPush(token.token, row, configs.fcm) };
}

function compactError(errors: string[]) {
  return errors.filter(Boolean).slice(0, 3).join(" | ").slice(0, 500) || null;
}

export async function dispatchNotificationsByIds(admin: any, notificationIds: string[]): Promise<PushDispatchSummary> {
  const uniqueIds = Array.from(new Set(notificationIds.filter(Boolean))).slice(0, MAX_DISPATCH_NOTIFICATIONS);
  const apns = getApnsConfig();
  const fcm = getFcmConfig();
  const configured = Boolean(apns || fcm);

  const summary: PushDispatchSummary = {
    configured,
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
  };

  if (uniqueIds.length === 0) return summary;
  if (!configured) {
    summary.pending = uniqueIds.length;
    return summary;
  }

  const { data: notificationRows, error: notificationError } = await admin
    .from("notifications")
    .select("id, recipient_id, type, scope, title, body, deep_link, push_status")
    .in("id", uniqueIds)
    .eq("push_status", "pending");

  if (notificationError) throw notificationError;
  const notifications = (notificationRows ?? []) as PendingNotificationRow[];
  if (notifications.length === 0) return summary;

  const recipientIds = Array.from(new Set(notifications.map((row) => row.recipient_id)));
  const { data: tokenRows, error: tokenError } = await admin
    .from("notification_push_tokens")
    .select("id, user_id, token, token_provider, enabled")
    .in("user_id", recipientIds)
    .eq("enabled", true);

  if (tokenError) throw tokenError;

  const tokensByUser = new Map<string, PushTokenRow[]>();
  for (const row of (tokenRows ?? []) as PushTokenRow[]) {
    const rows = tokensByUser.get(row.user_id) ?? [];
    rows.push(row);
    tokensByUser.set(row.user_id, rows);
  }

  for (const notification of notifications) {
    const tokens = tokensByUser.get(notification.recipient_id) ?? [];
    if (tokens.length === 0) {
      summary.skipped += 1;
      await admin
        .from("notifications")
        .update({ push_status: "skipped", push_error: "No enabled push token." })
        .eq("id", notification.id)
        .eq("push_status", "pending");
      continue;
    }

    let attemptedForNotification = 0;
    let sentForNotification = 0;
    let providerMissing = 0;
    const errors: string[] = [];

    for (const token of tokens) {
      const send = await sendProviderPush(token, notification, { apns, fcm });
      if (!send.configured) {
        providerMissing += 1;
        continue;
      }

      attemptedForNotification += 1;
      summary.attempted += 1;

      if (send.result.ok) {
        sentForNotification += 1;
        continue;
      }

      if (send.result.error) errors.push(send.result.error);
      if (send.result.shouldDisableToken) {
        await admin
          .from("notification_push_tokens")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("id", token.id);
      }
    }

    if (sentForNotification > 0) {
      summary.sent += 1;
      await admin
        .from("notifications")
        .update({ push_status: "sent", pushed_at: new Date().toISOString(), push_error: null })
        .eq("id", notification.id)
        .eq("push_status", "pending");
      continue;
    }

    if (attemptedForNotification === 0 && providerMissing > 0) {
      summary.pending += 1;
      continue;
    }

    summary.failed += 1;
    await admin
      .from("notifications")
      .update({ push_status: "failed", push_error: compactError(errors) ?? "Push delivery failed." })
      .eq("id", notification.id)
      .eq("push_status", "pending");
  }

  return summary;
}
