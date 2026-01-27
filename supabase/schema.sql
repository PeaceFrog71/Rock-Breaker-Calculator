-- BreakIt Calculator - Supabase Schema
-- Run this in the Supabase SQL Editor to set up tables and RLS policies.
-- Dashboard: https://supabase.com/dashboard/project/<project-id>/sql/new

-- =============================================================================
-- TABLE: saved_configs
-- Stores user equipment configurations (ship + lasers + modules + gadgets)
-- =============================================================================
CREATE TABLE IF NOT EXISTS saved_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  ship_type TEXT NOT NULL,          -- 'prospector', 'mole', 'golem', or 'multi-ship'
  config JSONB NOT NULL,            -- Full MiningConfiguration or MiningGroup JSON
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_saved_configs_user_id ON saved_configs(user_id);

-- RLS: Users can only access their own configurations
ALTER TABLE saved_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own configs"
  ON saved_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configs"
  ON saved_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configs"
  ON saved_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own configs"
  ON saved_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_configs_updated_at
  BEFORE UPDATE ON saved_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- TABLE: rock_submissions
-- Community-submitted rock scan data (for future analysis/database features)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rock_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Nullable: allow anonymous
  mass INTEGER NOT NULL,
  resistance_pct INTEGER NOT NULL,
  instability NUMERIC,
  elements JSONB NOT NULL,           -- { "taranite": 12.5, "corundum": 8.3, ... }
  screenshot_url TEXT,               -- Future: stored screenshot reference
  game_version TEXT,                 -- e.g., "4.3.1"
  location TEXT,                     -- e.g., "Lyria", "Aberdeen"
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for analysis queries
CREATE INDEX IF NOT EXISTS idx_rock_submissions_created_at ON rock_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_rock_submissions_user_id ON rock_submissions(user_id);

-- RLS: Anyone can read submissions, authenticated users can insert
ALTER TABLE rock_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rock submissions"
  ON rock_submissions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit rocks"
  ON rock_submissions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own submissions"
  ON rock_submissions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own submissions"
  ON rock_submissions FOR DELETE
  USING (auth.uid() = user_id);
