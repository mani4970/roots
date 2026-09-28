"use client";
import { beginObservation, observe, observationError, type ObservationFlow } from "./appObservation";
export type AuthObservationAction = "login" | "signup" | "password_reset" | "oauth";
export function startAuthObservation(action: AuthObservationAction, previous?: ObservationFlow | null): ObservationFlow | null {
  const base = previous?.scope === "auth" && previous.authAction === action ? previous : beginObservation("auth", null);
  const flow = base ? { ...base } : null;
  if (flow) { flow.authAction = action; flow.attempt = (flow.attempt ?? 0) + 1; }
  observe(flow, "auth_requested", { retry: (flow?.attempt ?? 1) > 1 });
  return flow;
}
type AuthResult = { error?: unknown; data?: { session?: { user: { id: string } } | null } | null };
/** Preserve the exact SDK result / rejection. Never send input arguments to telemetry. */
export async function observeAuthRequest<T extends AuthResult>(flow: ObservationFlow | null, run: () => Promise<T>): Promise<T> {
  try {
    const result = await run();
    if (result.error) observe(flow, "auth_failed", observationError(result.error));
    else {
      const verifiedLater = result.data?.session?.user.id;
      observe(verifiedLater && flow ? { ...flow, userId: verifiedLater } : flow, "auth_succeeded", {
        outcome: verifiedLater ? "authenticated" : "accepted",
      });
    }
    return result;
  } catch (error) { observe(flow, "auth_failed", observationError(error)); throw error; }
}
export async function observeOAuthRequest<T>(flow: ObservationFlow | null, run: () => Promise<T>): Promise<T> {
  try {
    const result = await run();
    // Starting a provider redirect is not proof of a successful login.
    observe(flow, "auth_redirect_started", { outcome: "redirect_started" });
    return result;
  } catch (error) { observe(flow, "auth_failed", observationError(error)); throw error; }
}
