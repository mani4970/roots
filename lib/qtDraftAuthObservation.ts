// Passive, bounded in-memory diagnostics. Never retain auth arguments/results,
// tokens, account data, URLs, lock names, or writing content.
import type { QtDraftAuthDetails } from './qtDraftSync';
import type { AuthLockObservation } from './queuedAuthLock';

type Kind = 'user' | 'session' | 'refresh' | 'fetch_user' | 'fetch_refresh' | 'fetch_other' | 'lock';
type Span = { kind: Kind; at: number; phase?: 'local' | 'browser' | 'held' };
type AuthMethods = { getSession: (...args: any[]) => Promise<any>; getUser: (...args: any[]) => Promise<any>; refreshSession: (...args: any[]) => Promise<any> };
const LIMIT = 64;
const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
const ms = (start: number, end: number) => Math.min(1_000_000, Math.max(0, Math.round(end - start)));

export function createQtDraftAuthObservation() {
  const spans = new Set<Span>();
  const attached = new WeakSet<object>();
  let truncated = false;
  let lockObserved = false;
  function begin(kind: Kind, phase?: Span['phase']): Span | undefined {
    try {
      if (spans.size >= LIMIT) { truncated = true; return; }
      const span = { kind, phase, at: now() };
      spans.add(span);
      return span;
    } catch { truncated = true; return; }
  }
  function end(span?: Span) { try { if (span) spans.delete(span); } catch { /* Best effort. */ } }

  const lock: AuthLockObservation = () => {
    lockObserved = true;
    const span = begin('lock', 'local');
    return {
      waitingForBrowser: () => { if (span) span.phase = 'browser'; },
      acquired: () => { if (span) span.phase = 'held'; },
      finished: () => end(span),
    };
  };

  function attach(auth: AuthMethods) {
    if (attached.has(auth)) return;
    attached.add(auth);
    for (const [method, kind] of [['getSession', 'session'], ['getUser', 'user'], ['refreshSession', 'refresh']] as const) {
      try {
        const original = auth[method];
        auth[method] = function(this: AuthMethods, ...args: any[]) {
          // getUser(jwt) bypasses the SDK auth lock; do not count it as a blocker.
          const span = method === 'getUser' && args[0] ? undefined : begin(kind);
          try {
            // Invoke immediately with the original receiver/arguments. A chained
            // promise preserves rejection propagation, including unhandled errors.
            return original.apply(this, args).then(
              value => { end(span); return value; },
              error => { end(span); throw error; },
            );
          } catch (error) { end(span); throw error; }
        };
      } catch { truncated = true; }
    }
  }

  function beginFetch(input: RequestInfo | URL, expectedOrigin: string): (() => void) | undefined {
    try {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (url.origin !== expectedOrigin || !url.pathname.startsWith('/auth/v1/')) return;
      const kind = url.pathname === '/auth/v1/user' ? 'fetch_user'
        : url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token' ? 'fetch_refresh'
        : 'fetch_other';
      const span = begin(kind);
      return () => end(span);
    } catch { return; }
  }

  function snapshot(): QtDraftAuthDetails {
    const current = now();
    const all = [...spans];
    const auth = all.filter(s => s.kind === 'user' || s.kind === 'session' || s.kind === 'refresh');
    const fetches = all.filter(s => s.kind.startsWith('fetch_'));
    const fetchKinds = new Set(fetches.map(s => s.kind));
    const waits = all.filter(s => s.kind === 'lock' && s.phase !== 'held');
    const oldest = (items: Span[]) => items.length ? ms(Math.min(...items.map(s => s.at)), current) : 0;
    return {
      draft_auth_user_pending: auth.filter(s => s.kind === 'user').length,
      draft_auth_session_pending: auth.filter(s => s.kind === 'session').length,
      draft_auth_refresh_pending: auth.filter(s => s.kind === 'refresh').length,
      draft_auth_oldest_ms: oldest(auth),
      draft_auth_fetch_kind: fetchKinds.size > 1 ? 'mixed' : fetchKinds.has('fetch_user') ? 'user'
        : fetchKinds.has('fetch_refresh') ? 'refresh' : fetchKinds.has('fetch_other') ? 'other' : 'none',
      draft_auth_fetch_ms: oldest(fetches),
      draft_auth_truncated: truncated,
      ...(lockObserved ? {
        draft_lock_held: all.some(s => s.kind === 'lock' && s.phase === 'held'),
        draft_lock_local_waiters: waits.filter(s => s.phase === 'local').length,
        draft_lock_browser_waiters: waits.filter(s => s.phase === 'browser').length,
        draft_lock_wait_ms: oldest(waits),
      } : {}),
    };
  }

  return { attach, beginFetch, snapshot, lock };
}
