import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SC_API_KEY = import.meta.env.VITE_SC_API_KEY as string | undefined;
const SC_API_URL = SC_API_KEY
  ? `https://api.starcitizen-api.com/${SC_API_KEY}/v1/live/stats`
  : null;

const CACHE_KEY = 'sc_game_version';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — one fetch per day across all users

/** Hardcoded fallback if both Supabase and SC API are unavailable */
export const FALLBACK_GAME_VERSION = '4.6';

/**
 * Get the current Star Citizen live game version.
 *
 * Strategy (in order):
 * 1. Supabase app_cache — shared across all users, refreshed at most once per day
 * 2. SC API (starcitizen-api.com) — fetched live, result stored back to Supabase
 * 3. Hardcoded fallback constant
 *
 * The Supabase cache is the source of truth. The first user to load the app
 * after the 24-hour TTL triggers the refresh for everyone.
 */
export async function getGameVersion(): Promise<string> {
  // 1. Try Supabase cache
  if (isSupabaseConfigured) {
    try {
      const { data } = await (supabase as any)
        .from('app_cache')
        .select('value, updated_at')
        .eq('key', CACHE_KEY)
        .single();

      if (data) {
        const ageMs = Date.now() - new Date(data.updated_at).getTime();
        if (ageMs < CACHE_TTL_MS) {
          return data.value;
        }
      }
    } catch {
      // Supabase unavailable — fall through to SC API
    }
  }

  // 2. Fetch from SC API and refresh the Supabase cache
  if (SC_API_URL) {
    try {
      const response = await fetch(SC_API_URL);
      const json = await response.json();
      const version = (json?.data?.current_live as string | null | undefined) ?? null;

      if (version) {
        if (isSupabaseConfigured) {
          // Fire-and-forget cache update — don't block the caller
          ;(supabase as any)
            .from('app_cache')
            .upsert(
              { key: CACHE_KEY, value: version, updated_at: new Date().toISOString() },
              { onConflict: 'key' }
            )
            .then(() => {}) // suppress unhandled promise warning
            .catch(() => {}); // best-effort
        }
        return version;
      }
    } catch {
      // SC API unavailable — fall through to constant
    }
  }

  // 3. Hardcoded fallback
  return FALLBACK_GAME_VERSION;
}
