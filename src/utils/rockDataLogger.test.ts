import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { RegolithClusterFind, RegolithShipRock } from './regolith';

// ─── Supabase mock ─────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
let mockIsConfigured = true;

vi.mock('../lib/supabase', () => ({
  get isSupabaseConfigured() { return mockIsConfigured; },
  supabase: { from: mockFrom },
}));

// gameVersion is a dependency — mock it to avoid external fetch in tests
vi.mock('./gameVersion', () => ({
  getGameVersion: vi.fn().mockResolvedValue('4.6.0'),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeRock = (overrides?: Partial<RegolithShipRock>): RegolithShipRock => ({
  mass: 5000,
  res: 0.30,
  inst: 15,
  rockType: 'BTYPE',
  state: 'READY',
  ores: [
    { ore: 'BEXALITE', percent: 0.20 },
    { ore: 'INERTMATERIAL', percent: 0.80 },
  ],
  ...overrides,
});

const makeFind = (overrides?: Partial<RegolithClusterFind>): RegolithClusterFind => ({
  scoutingFindId: 'find-log-001',
  gravityWell: 'ArcCorp',
  state: 'WORKING',
  clusterCount: 4,
  score: 2000,
  rawScore: 1800,
  surveyBonus: 0.15,
  createdAt: 1700000000000,
  regolithVersion: '4.6',
  shipRocks: [makeRock()],
  ...overrides,
});

// ─── Chain mock helpers ────────────────────────────────────────────────────────

function makeInsertChain(result: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function makeOreInsertChain() {
  return {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('rockDataLogger.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured = true;
  });

  describe('logRockImport', () => {
    it('returns early without calling Supabase when isSupabaseConfigured is false', async () => {
      mockIsConfigured = false;
      const { logRockImport } = await import('./rockDataLogger');

      await logRockImport({
        find: makeFind(),
        rock: makeRock(),
        rockIndex: 0,
        sessionId: 'session-001',
        user: null,
      });

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('inserts a row into regolith_rock_imports', async () => {
      const importChain = makeInsertChain({ data: { id: 'import-uuid-1' }, error: null });
      const oreChain = makeOreInsertChain();
      mockFrom.mockReturnValueOnce(importChain).mockReturnValueOnce(oreChain);

      const { logRockImport } = await import('./rockDataLogger');
      await logRockImport({
        find: makeFind(),
        rock: makeRock(),
        rockIndex: 1,
        sessionId: 'session-001',
        user: null,
      });

      expect(mockFrom).toHaveBeenCalledWith('regolith_rock_imports');
      const [insertArg] = importChain.insert.mock.calls[0];
      expect(insertArg.scouting_find_id).toBe('find-log-001');
      expect(insertArg.regolith_session_id).toBe('session-001');
      expect(insertArg.rock_index).toBe(1);
      expect(insertArg.mass).toBe(5000);
      expect(insertArg.resistance).toBe(0.30);   // stored as 0–1
      expect(insertArg.instability).toBe(15);
      expect(insertArg.rock_type).toBe('BTYPE');
      expect(insertArg.gravity_well).toBe('ArcCorp');
      expect(insertArg.breaker_user_id).toBeNull();
    });

    it('inserts ore rows into regolith_rock_ores after import row is created', async () => {
      const importChain = makeInsertChain({ data: { id: 'import-uuid-2' }, error: null });
      const oreChain = makeOreInsertChain();
      mockFrom.mockReturnValueOnce(importChain).mockReturnValueOnce(oreChain);

      const { logRockImport } = await import('./rockDataLogger');
      await logRockImport({
        find: makeFind(),
        rock: makeRock(),
        rockIndex: 0,
        sessionId: 'session-001',
        user: null,
      });

      expect(mockFrom).toHaveBeenCalledWith('regolith_rock_ores');
      const [oreInsertArg] = oreChain.insert.mock.calls[0];
      expect(oreInsertArg).toHaveLength(2);
      expect(oreInsertArg[0].ore).toBe('BEXALITE');
      expect(oreInsertArg[0].percent).toBe(0.20);    // stored as 0–1
      expect(oreInsertArg[0].rock_import_id).toBe('import-uuid-2');
    });

    it('skips ore insert when rock has no ores', async () => {
      const importChain = makeInsertChain({ data: { id: 'import-uuid-3' }, error: null });
      mockFrom.mockReturnValueOnce(importChain);

      const { logRockImport } = await import('./rockDataLogger');
      await logRockImport({
        find: makeFind(),
        rock: makeRock({ ores: [] }),
        rockIndex: 0,
        sessionId: 'session-001',
        user: null,
      });

      // Only the rock import table should have been called — no ore table
      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(mockFrom).not.toHaveBeenCalledWith('regolith_rock_ores');
    });

    it('stores find-level fields in the import row', async () => {
      const importChain = makeInsertChain({ data: { id: 'import-uuid-4' }, error: null });
      const oreChain = makeOreInsertChain();
      mockFrom.mockReturnValueOnce(importChain).mockReturnValueOnce(oreChain);

      const { logRockImport } = await import('./rockDataLogger');
      await logRockImport({
        find: makeFind(),
        rock: makeRock(),
        rockIndex: 0,
        sessionId: 'session-001',
        user: null,
      });

      const [insertArg] = importChain.insert.mock.calls[0];
      expect(insertArg.cluster_count).toBe(4);
      expect(insertArg.score).toBe(2000);
      expect(insertArg.raw_score).toBe(1800);
      expect(insertArg.survey_bonus).toBe(0.15);
      expect(insertArg.find_state).toBe('WORKING');
      expect(insertArg.regolith_version).toBe('4.6');
      expect(insertArg.sc_version).toBe('4.6.0');
    });

    it('never throws even when the import insert fails', async () => {
      const failChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      mockFrom.mockReturnValueOnce(failChain);

      const { logRockImport } = await import('./rockDataLogger');
      await expect(logRockImport({
        find: makeFind(),
        rock: makeRock(),
        rockIndex: 0,
        sessionId: 'session-001',
        user: null,
      })).resolves.toBeUndefined();
    });

    it('never throws even when the entire call rejects', async () => {
      mockFrom.mockImplementationOnce(() => { throw new Error('catastrophic failure'); });

      const { logRockImport } = await import('./rockDataLogger');
      await expect(logRockImport({
        find: makeFind(),
        rock: makeRock(),
        rockIndex: 0,
        sessionId: 'session-001',
        user: null,
      })).resolves.toBeUndefined();
    });
  });
});
