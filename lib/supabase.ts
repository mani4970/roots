import { createBrowserClient } from '@supabase/ssr'
import { navigatorLock } from '@supabase/supabase-js'
import { createQueuedAuthLock } from './queuedAuthLock'

// createBrowserClient remains the existing singleton. Server rendering and
// browsers without Web Locks retain the SDK's original fallback behavior.
const queuedBrowserLock = createQueuedAuthLock(navigatorLock)
export function createClient() {
  const canUseWebLocks = typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.locks
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    canUseWebLocks ? { auth: { lock: queuedBrowserLock } } : undefined,
  )
}
