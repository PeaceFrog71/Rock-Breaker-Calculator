import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateApiKey, fetchActiveSessionId, fetchSessionRocks } from './regolith';
import type { RegolithClusterFind } from './regolith';

// ─── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchOk(data: unknown) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data }),
  } as Response);
}

function mockFetchGraphQLError(message: string) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: async () => ({ errors: [{ message }] }),
  } as Response);
}

function mockFetchHttpError(status = 401) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status,
  } as Response);
}

function mockFetchNetworkError() {
  vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network failure'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('regolith.ts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── validateApiKey ─────────────────────────────────────────────────────────

  describe('validateApiKey', () => {
    it('returns true when the API key is valid', async () => {
      mockFetchOk({ profile: { userId: 'user-123' } });
      const result = await validateApiKey('valid-key');
      expect(result).toBe(true);
    });

    it('returns false on HTTP error (401 Unauthorized)', async () => {
      mockFetchHttpError(401);
      const result = await validateApiKey('bad-key');
      expect(result).toBe(false);
    });

    it('returns false when the API returns a GraphQL error', async () => {
      mockFetchGraphQLError('Unauthorized');
      const result = await validateApiKey('bad-key');
      expect(result).toBe(false);
    });

    it('returns false on network failure', async () => {
      mockFetchNetworkError();
      const result = await validateApiKey('any-key');
      expect(result).toBe(false);
    });

    it('sends the API key in the x-api-key header', async () => {
      const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { profile: { userId: 'u1' } } }),
      } as Response);

      await validateApiKey('my-secret-key');

      const [, init] = spy.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers['x-api-key']).toBe('my-secret-key');
    });
  });

  // ── fetchActiveSessionId ───────────────────────────────────────────────────

  describe('fetchActiveSessionId', () => {
    it('returns the session ID when an active session exists', async () => {
      mockFetchOk({ sessionUser: { sessionId: 'session-abc' } });
      const id = await fetchActiveSessionId('valid-key');
      expect(id).toBe('session-abc');
    });

    it('returns null when sessionUser is null (no active session)', async () => {
      mockFetchOk({ sessionUser: null });
      const id = await fetchActiveSessionId('valid-key');
      expect(id).toBeNull();
    });

    it('returns null on HTTP error', async () => {
      mockFetchHttpError(500);
      const id = await fetchActiveSessionId('valid-key');
      expect(id).toBeNull();
    });

    it('returns null on network failure', async () => {
      mockFetchNetworkError();
      const id = await fetchActiveSessionId('valid-key');
      expect(id).toBeNull();
    });
  });

  // ── fetchSessionRocks ──────────────────────────────────────────────────────

  describe('fetchSessionRocks', () => {
    const makeShipClusterFind = (overrides?: Partial<RegolithClusterFind>) => ({
      scoutingFindId: 'find-001',
      gravityWell: 'Crusader',
      shipRocks: [
        { mass: 1234, res: 25, inst: 0.4, rockType: 'Quantainium' },
      ],
      ...overrides,
    });

    it('returns mapped ShipClusterFinds from the session', async () => {
      mockFetchOk({
        session: {
          scouting: {
            items: [makeShipClusterFind()],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results).toHaveLength(1);
      expect(results[0].scoutingFindId).toBe('find-001');
      expect(results[0].gravityWell).toBe('Crusader');
      expect(results[0].shipRocks[0].mass).toBe(1234);
    });

    it('filters out non-ShipClusterFind union members (e.g. SalvageFind)', async () => {
      mockFetchOk({
        session: {
          scouting: {
            items: [
              // SalvageFind — has no scoutingFindId or shipRocks
              {},
              // VehicleClusterFind — has scoutingFindId but no shipRocks
              { scoutingFindId: 'vehicle-001' },
              // Valid ShipClusterFind
              makeShipClusterFind({ scoutingFindId: 'find-002' }),
            ],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results).toHaveLength(1);
      expect(results[0].scoutingFindId).toBe('find-002');
    });

    it('handles null gravityWell gracefully', async () => {
      mockFetchOk({
        session: {
          scouting: {
            items: [makeShipClusterFind({ gravityWell: null })],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results[0].gravityWell).toBeNull();
    });

    it('handles nullable res and inst fields on rocks', async () => {
      mockFetchOk({
        session: {
          scouting: {
            items: [
              {
                scoutingFindId: 'find-003',
                gravityWell: 'Pyro',
                shipRocks: [{ mass: 500, res: null, inst: null, rockType: null }],
              },
            ],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results[0].shipRocks[0].res).toBeNull();
      expect(results[0].shipRocks[0].inst).toBeNull();
    });

    it('returns empty array when scouting is null', async () => {
      mockFetchOk({ session: { scouting: null } });
      const results = await fetchSessionRocks('key', 'session-abc');
      expect(results).toEqual([]);
    });

    it('returns empty array when session is null', async () => {
      mockFetchOk({ session: null });
      const results = await fetchSessionRocks('key', 'session-abc');
      expect(results).toEqual([]);
    });

    it('returns empty array when items is empty', async () => {
      mockFetchOk({ session: { scouting: { items: [] } } });
      const results = await fetchSessionRocks('key', 'session-abc');
      expect(results).toEqual([]);
    });

    it('throws on HTTP error (unlike other functions — caller should handle)', async () => {
      mockFetchHttpError(500);
      await expect(fetchSessionRocks('key', 'session-abc')).rejects.toThrow();
    });

    it('includes the sessionId in the GraphQL query body', async () => {
      const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { session: { scouting: { items: [] } } } }),
      } as Response);

      await fetchSessionRocks('key', 'my-session-id');

      const [, init] = spy.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.query).toContain('my-session-id');
    });
  });
});
