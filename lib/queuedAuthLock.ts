import { NavigatorLockAcquireTimeoutError } from "@supabase/supabase-js";

type AuthLock = <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>;
/**
 * Serialize calls waiting for the SAME browser client's auth lock before they
 * enter navigatorLock. Keep the SDK's real Web Lock for cross-tab exclusion.
 * Local queue time is deliberately not counted as an orphaned cross-tab lock.
 * A stuck operation can still delay its queue; this does not bypass auth/refresh.
 */
export function createQueuedAuthLock(browserLock: AuthLock): AuthLock {
  const tails = new Map<string, Promise<void>>();
  return function queuedAuthLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
    const previous = tails.get(name);
    if (previous && acquireTimeout === 0) {
      return Promise.reject(new NavigatorLockAcquireTimeoutError("Auth lock is already queued in this client"));
    }
    const run = () => browserLock(name, acquireTimeout, fn);
    const result = previous ? previous.then(run, run) : Promise.resolve().then(run);
    const tail = result.then(() => undefined, () => undefined);
    tails.set(name, tail);
    void tail.then(() => { if (tails.get(name) === tail) tails.delete(name); });
    return result;
  };
}
