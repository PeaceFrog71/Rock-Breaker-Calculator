import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
