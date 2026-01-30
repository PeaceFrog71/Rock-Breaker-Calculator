import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Cross-subdomain session sync via shared refresh token cookie.
 *
 * How it works:
 * - Full session stays in localStorage (each app has its own)
 * - Only the refresh_token (~200 bytes) goes in a shared cookie on .peacefroggaming.com
 * - On app load, if no local session but cookie exists → restores session from refresh token
 */
const SYNC_COOKIE_NAME = 'pfg-refresh-token'

function getSharedRefreshToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(^| )${SYNC_COOKIE_NAME}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

function setSharedRefreshToken(token: string | null): void {
  if (typeof document === 'undefined') return
  const isProduction = window.location.hostname.includes('peacefroggaming.com')
  const domain = isProduction ? '; domain=.peacefroggaming.com' : ''
  const secure = isProduction ? '; secure' : ''

  if (token) {
    document.cookie = `${SYNC_COOKIE_NAME}=${encodeURIComponent(token)}${domain}; path=/; max-age=31536000${secure}; samesite=lax`
  } else {
    document.cookie = `${SYNC_COOKIE_NAME}=${domain}; path=/; max-age=0`
  }
}

/**
 * Whether Supabase credentials are configured.
 * When false, the calculator still works — Supabase features (auth, saved configs)
 * are additive and gracefully degrade. Check this before making Supabase calls.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase credentials not configured. ' +
    'Copy .env.example to .env and fill in your Supabase project values. ' +
    'The calculator will work without Supabase — auth and saved configs will be unavailable.'
  )
}

// Use default localStorage for session storage
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)

/**
 * Initialize cross-subdomain session sync.
 * Call this once on app startup (in AuthContext).
 *
 * - If no local session but shared cookie exists, restores session from refresh token
 * - Syncs refresh token to shared cookie on auth state changes
 * - Checks for logout from other app when tab becomes visible
 */
export async function initSessionSync(): Promise<void> {
  if (!isSupabaseConfigured) return

  const { data: { session } } = await supabase.auth.getSession()
  const token = getSharedRefreshToken()

  // If no local session but shared cookie exists, restore from refresh token
  if (!session && token) {
    await supabase.auth.refreshSession({ refresh_token: token })
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      setSharedRefreshToken(session?.refresh_token || null)
    } else if (event === 'SIGNED_OUT') {
      setSharedRefreshToken(null)
    }
  })

  // Check for login/logout from other app when tab becomes visible
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      const { data: { session } } = await supabase.auth.getSession()
      const sharedToken = getSharedRefreshToken()

      if (session && !sharedToken) {
        // Other app logged out - sign out locally
        await supabase.auth.signOut()
      } else if (!session && sharedToken) {
        // Other app logged in - restore session from refresh token
        await supabase.auth.refreshSession({ refresh_token: sharedToken })
      }
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
}
