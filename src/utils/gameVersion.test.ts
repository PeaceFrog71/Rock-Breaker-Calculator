import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Supabase mock ─────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: mockFrom },
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Build a chainable Supabase query mock that resolves with `result` at .single() */
function mockSupabaseSelect(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValueOnce(chain);
  return chain;
}

/** Build a chainable Supabase upsert mock */
function mockSupabaseUpsert() {
  const chain = {
    upsert: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue(undefined),
    catch: vi.fn().mockReturnThis(),
  };
  mockFrom.mockReturnValueOnce(chain);
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('gameVersion.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('FALLBACK_GAME_VERSION', () => {
    it('is exported as a non-empty string', async () => {
      const { FALLBACK_GAME_VERSION } = await import('./gameVersion');
      expect(typeof FALLBACK_GAME_VERSION).toBe('string');
      expect(FALLBACK_GAME_VERSION.length).toBeGreaterThan(0);
    });
  });

  describe('getGameVersion', () => {
    it('returns the Supabase cached value when cache is fresh (< 24h old)', async () => {
      const freshDate = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
      mockSupabaseSelect({ data: { value: '4.6.0', updated_at: freshDate }, error: null });

      const { getGameVersion } = await import('./gameVersion');
      const version = await getGameVersion();

      expect(version).toBe('4.6.0');
    });

    it('does not call the SC API when Supabase cache is fresh', async () => {
      const freshDate = new Date(Date.now() - 60_000).toISOString();
      mockSupabaseSelect({ data: { value: '4.6.0', updated_at: freshDate }, error: null });
      const fetchSpy = vi.spyOn(global, 'fetch');

      const { getGameVersion } = await import('./gameVersion');
      await getGameVersion();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('falls through to FALLBACK when Supabase cache is stale (> 24h) and no SC API key', async () => {
      // Stale: 25 hours ago
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      mockSupabaseSelect({ data: { value: '4.5.0', updated_at: staleDate }, error: null });
      // SC_API_URL is null in test env (no VITE_SC_API_KEY) → no fetch → falls to FALLBACK
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('no key'));

      const { getGameVersion, FALLBACK_GAME_VERSION } = await import('./gameVersion');
      const version = await getGameVersion();

      expect(version).toBe(FALLBACK_GAME_VERSION);
    });

    it('falls through to FALLBACK when Supabase returns no data', async () => {
      mockSupabaseSelect({ data: null, error: null });

      const { getGameVersion, FALLBACK_GAME_VERSION } = await import('./gameVersion');
      const version = await getGameVersion();

      expect(version).toBe(FALLBACK_GAME_VERSION);
    });

    it('falls through to FALLBACK when Supabase throws', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('connection refused')),
      };
      mockFrom.mockReturnValueOnce(chain);

      const { getGameVersion, FALLBACK_GAME_VERSION } = await import('./gameVersion');
      const version = await getGameVersion();

      expect(version).toBe(FALLBACK_GAME_VERSION);
    });

    it('fetches from SC API when cache is stale and SC API key is available', async () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      mockSupabaseSelect({ data: { value: '4.5.0', updated_at: staleDate }, error: null });
      // Mock upsert for the cache write-back
      mockSupabaseUpsert();

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { current_live: '4.6.1' } }),
      } as Response);

      // Temporarily set the SC_API_KEY env var and reload the module
      vi.stubEnv('VITE_SC_API_KEY', 'test-sc-key');
      vi.resetModules();

      const { getGameVersion } = await import('./gameVersion');
      const version = await getGameVersion();

      expect(version).toBe('4.6.1');

      vi.unstubAllEnvs();
      vi.resetModules();
    });

    it('falls back to FALLBACK when SC API returns null version', async () => {
      vi.stubEnv('VITE_SC_API_KEY', 'test-sc-key');
      vi.resetModules();

      const freshDate = new Date(Date.now() - 60_000).toISOString();
      // First call returns stale to get past the cache
      mockSupabaseSelect({ data: { value: '4.5', updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }, error: null });

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { current_live: null } }),
      } as Response);

      const { getGameVersion, FALLBACK_GAME_VERSION } = await import('./gameVersion');
      const version = await getGameVersion();

      expect(version).toBe(FALLBACK_GAME_VERSION);

      vi.unstubAllEnvs();
      vi.resetModules();
    });
  });
});
