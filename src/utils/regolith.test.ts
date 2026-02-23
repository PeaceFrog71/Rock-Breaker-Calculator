import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateApiKey, fetchActiveSessionId, fetchSessionRocks } from './regolith';
import type { RegolithClusterFind, RegolithShipRock } from './regolith';

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeRock = (overrides?: Partial<RegolithShipRock>): RegolithShipRock => ({
  mass: 1234,
  res: 0.25,   // 0–1 scale (25% resistance)
  inst: 25,
  rockType: 'QTYPE',
  state: 'READY',
  ores: [
    { ore: 'QUANTANIUM', percent: 0.35 },
    { ore: 'INERTMATERIAL', percent: 0.65 },
  ],
  ...overrides,
});

const makeFind = (overrides?: Partial<RegolithClusterFind>): RegolithClusterFind => ({
  scoutingFindId: 'find-001',
  gravityWell: 'Crusader',
  state: 'READY_FOR_WORKERS',
  clusterCount: 3,
  score: 1500,
  rawScore: 1200,
  surveyBonus: 0.1,
  createdAt: 1700000000000,
  regolithVersion: '4.5',
  shipRocks: [makeRock()],
  ...overrides,
});

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
    it('returns the session ID of the first ACTIVE session', async () => {
      mockFetchOk({
        profile: {
          mySessions: {
            items: [
              { sessionId: 'session-active', state: 'ACTIVE' },
              { sessionId: 'session-closed', state: 'CLOSED' },
            ],
          },
        },
      });
      const id = await fetchActiveSessionId('valid-key');
      expect(id).toBe('session-active');
    });

    it('returns null when all sessions are CLOSED', async () => {
      mockFetchOk({
        profile: {
          mySessions: {
            items: [{ sessionId: 'session-closed', state: 'CLOSED' }],
          },
        },
      });
      const id = await fetchActiveSessionId('valid-key');
      expect(id).toBeNull();
    });

    it('returns null when mySessions items is empty', async () => {
      mockFetchOk({ profile: { mySessions: { items: [] } } });
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

    it('uses profile.mySessions query (not sessionUser)', async () => {
      const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { profile: { mySessions: { items: [] } } },
        }),
      } as Response);

      await fetchActiveSessionId('valid-key');

      const [, init] = spy.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.query).toContain('mySessions');
      expect(body.query).not.toContain('sessionUser');
    });
  });

  // ── fetchSessionRocks ──────────────────────────────────────────────────────

  describe('fetchSessionRocks', () => {
    it('returns mapped ShipClusterFinds with ores and state', async () => {
      mockFetchOk({ session: { scouting: { items: [makeFind()] } } });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results).toHaveLength(1);
      expect(results[0].scoutingFindId).toBe('find-001');
      expect(results[0].gravityWell).toBe('Crusader');
      expect(results[0].shipRocks[0].mass).toBe(1234);
      expect(results[0].shipRocks[0].res).toBe(0.25);  // 0–1 scale
      expect(results[0].shipRocks[0].ores).toHaveLength(2);
      expect(results[0].shipRocks[0].ores[0].ore).toBe('QUANTANIUM');
      expect(results[0].shipRocks[0].ores[0].percent).toBe(0.35);
      expect(results[0].shipRocks[0].state).toBe('READY');
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
              makeFind({ scoutingFindId: 'find-002' }),
            ],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results).toHaveLength(1);
      expect(results[0].scoutingFindId).toBe('find-002');
    });

    it('handles null gravityWell gracefully', async () => {
      mockFetchOk({ session: { scouting: { items: [makeFind({ gravityWell: null })] } } });
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
                shipRocks: [makeRock({ res: null, inst: null })],
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

    it('throws on HTTP error (caller should handle)', async () => {
      mockFetchHttpError(500);
      await expect(fetchSessionRocks('key', 'session-abc')).rejects.toThrow();
    });

    it('passes sessionId as a GraphQL variable (not string-interpolated)', async () => {
      const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { session: { scouting: { items: [] } } } }),
      } as Response);

      await fetchSessionRocks('key', 'my-session-id');

      const [, init] = spy.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      // sessionId must be in variables, not hard-coded in the query string
      expect(body.variables?.sessionId).toBe('my-session-id');
      expect(body.query).not.toContain('my-session-id');
    });

    it('queries for ores and state fields', async () => {
      const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { session: { scouting: { items: [] } } } }),
      } as Response);

      await fetchSessionRocks('key', 'session-abc');

      const [, init] = spy.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.query).toContain('ores');
      expect(body.query).toContain('percent');
      expect(body.query).toContain('state');
    });

    it('queries for find-level fields (score, clusterCount, surveyBonus, version)', async () => {
      const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { session: { scouting: { items: [] } } } }),
      } as Response);

      await fetchSessionRocks('key', 'session-abc');

      const [, init] = spy.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.query).toContain('clusterCount');
      expect(body.query).toContain('score');
      expect(body.query).toContain('rawScore');
      expect(body.query).toContain('surveyBonus');
      expect(body.query).toContain('createdAt');
      expect(body.query).toContain('version');
    });

    it('maps find-level fields (clusterCount, score, rawScore, surveyBonus, createdAt, regolithVersion)', async () => {
      // Use raw API shape — the API returns "version", we remap it to "regolithVersion"
      mockFetchOk({
        session: {
          scouting: {
            items: [{
              scoutingFindId: 'find-001',
              gravityWell: 'Crusader',
              state: 'READY_FOR_WORKERS',
              clusterCount: 3,
              score: 1500,
              rawScore: 1200,
              surveyBonus: 0.1,
              createdAt: 1700000000000,
              version: '4.5',       // raw API field name (mapped → regolithVersion)
              shipRocks: [makeRock()],
            }],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results[0].state).toBe('READY_FOR_WORKERS');
      expect(results[0].clusterCount).toBe(3);
      expect(results[0].score).toBe(1500);
      expect(results[0].rawScore).toBe(1200);
      expect(results[0].surveyBonus).toBe(0.1);
      expect(results[0].createdAt).toBe(1700000000000);
      expect(results[0].regolithVersion).toBe('4.5');
    });

    it('maps API version field → regolithVersion', async () => {
      // Regolith API returns "version", we rename it to "regolithVersion"
      mockFetchOk({
        session: {
          scouting: {
            items: [{
              scoutingFindId: 'find-ver',
              gravityWell: null,
              state: 'WORKING',
              shipRocks: [makeRock()],
              version: '4.6',
            }],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');
      expect(results[0].regolithVersion).toBe('4.6');
    });

    // ── Abandoned / depleted find filtering ────────────────────────────────────

    it('filters out ABANDONNED finds (note: Regolith API double-N typo)', async () => {
      mockFetchOk({
        session: {
          scouting: {
            items: [
              makeFind({ scoutingFindId: 'abandoned', state: 'ABANDONNED' }),
              makeFind({ scoutingFindId: 'active', state: 'READY_FOR_WORKERS' }),
            ],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results).toHaveLength(1);
      expect(results[0].scoutingFindId).toBe('active');
    });

    it('filters out DEPLETED finds', async () => {
      mockFetchOk({
        session: {
          scouting: {
            items: [
              makeFind({ scoutingFindId: 'depleted', state: 'DEPLETED' }),
              makeFind({ scoutingFindId: 'active', state: 'DISCOVERED' }),
            ],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results).toHaveLength(1);
      expect(results[0].scoutingFindId).toBe('active');
    });

    it('includes finds in DISCOVERED, READY_FOR_WORKERS, and WORKING states', async () => {
      mockFetchOk({
        session: {
          scouting: {
            items: [
              makeFind({ scoutingFindId: 'discovered', state: 'DISCOVERED' }),
              makeFind({ scoutingFindId: 'ready', state: 'READY_FOR_WORKERS' }),
              makeFind({ scoutingFindId: 'working', state: 'WORKING' }),
            ],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');

      expect(results).toHaveLength(3);
      const ids = results.map(r => r.scoutingFindId);
      expect(ids).toContain('discovered');
      expect(ids).toContain('ready');
      expect(ids).toContain('working');
    });

    it('rocks inside ABANDONNED finds still have READY state (confirm find-level filter is needed)', async () => {
      // This documents WHY we filter at find level: rocks inside abandoned finds
      // still report state = 'READY' — the only indication is find.state
      mockFetchOk({
        session: {
          scouting: {
            items: [
              makeFind({
                scoutingFindId: 'abandoned',
                state: 'ABANDONNED',
                shipRocks: [makeRock({ state: 'READY' })], // rock still says READY!
              }),
            ],
          },
        },
      });

      const results = await fetchSessionRocks('key', 'session-abc');
      // The find must be excluded even though the rock says READY
      expect(results).toHaveLength(0);
    });
  });
});
