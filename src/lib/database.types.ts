/**
 * Supabase Database Type Definitions
 *
 * These types mirror the database schema defined in supabase/schema.sql.
 * When the schema changes, regenerate with:
 *   npx supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts
 *
 * For now, these are manually maintained to match the schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      saved_configs: {
        Row: {
          id: string
          user_id: string
          name: string
          ship_type: string
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          ship_type: string
          config: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          ship_type?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      rock_submissions: {
        Row: {
          id: string
          user_id: string | null
          mass: number
          resistance_pct: number
          instability: number | null
          elements: Json
          screenshot_url: string | null
          game_version: string | null
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          mass: number
          resistance_pct: number
          instability?: number | null
          elements: Json
          screenshot_url?: string | null
          game_version?: string | null
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          mass?: number
          resistance_pct?: number
          instability?: number | null
          elements?: Json
          screenshot_url?: string | null
          game_version?: string | null
          location?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
