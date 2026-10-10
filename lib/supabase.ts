import { createBrowserClient } from '@supabase/ssr'
import { navigatorLock } from '@supabase/supabase-js'
import { createQueuedAuthLock } from './queuedAuthLock'
import { fetchWithQtDraftObservation, registerQtDraftAuthObservation } from './qtDraftSync'
import { createQtDraftAuthObservation } from './qtDraftAuthObservation'

// createBrowserClient remains the existing singleton. Server rendering and
// browsers without Web Locks retain the SDK's original fallback behavior.
const draftAuthObservation = createQtDraftAuthObservation()
const queuedBrowserLock = createQueuedAuthLock(navigatorLock, draftAuthObservation.lock)
const observedBrowserFetch: typeof fetch = (input, init) => {
  let finish: (() => void) | undefined
  try {
    if (typeof window !== 'undefined') finish = draftAuthObservation.beginFetch(input, new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin)
  } catch { /* Diagnostics do not affect the request. */ }
  if (!finish) return fetchWithQtDraftObservation(input, init)
  const done = () => { try { finish?.() } catch { /* Best effort. */ } }
  try {
    return fetchWithQtDraftObservation(input, init).then(
      response => { done(); return response },
      error => { done(); throw error },
    )
  } catch (error) { done(); throw error }
}
export function createClient() {
  const canUseWebLocks = typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.locks
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(canUseWebLocks ? { auth: { lock: queuedBrowserLock } } : {}),
      global: { fetch: observedBrowserFetch },
    },
  )
  try {
    if (typeof window !== 'undefined') {
      draftAuthObservation.attach(client.auth)
      registerQtDraftAuthObservation(client.auth, draftAuthObservation.snapshot)
    }
  } catch { /* The existing client remains usable if diagnostics are unavailable. */ }
  return client
}
