import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
const TTL = 2 * 60 * 60 * 1000;
function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(`roots-ops-v3:${value}`).digest("hex");
}
export function issueOpsTicket(secret: string, now = Date.now()): string {
  const value = `${randomUUID()}.${now + TTL}`;
  return `${value}.${signature(value, secret)}`;
}
export function readOpsTicket(ticket: string | undefined, secret: string, now = Date.now()): string | null {
  if (!ticket || ticket.length > 160) return null;
  const match = /^([a-f0-9-]{36})\.([0-9]{13})\.([a-f0-9]{64})$/.exec(ticket);
  if (!match || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(match[1])) return null;
  const expiry = Number(match[2]);
  if (expiry <= now || expiry > now + TTL) return null;
  return timingSafeEqual(Buffer.from(match[3], "hex"), Buffer.from(signature(`${match[1]}.${match[2]}`, secret), "hex")) ? match[1] : null;
}
/** A short-lived rate bucket, never a raw IP or a user identity. */
export function opsNetworkBucket(address: string | null, secret: string, now = Date.now()): string {
  return signature(`network:${new Date(now).toISOString().slice(0, 10)}:${(address ?? "unknown").slice(0, 100)}`, secret);
}
