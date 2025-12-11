import { describe, it, expect } from 'vitest';
import {
  getMannedLasers,
  getMannedLaserCount,
  getLaserLengthScale,
  calculateLaserEndpoint,
  getLaserAngleSpread,
  calculateMoleLaserAngleOffsets,
  calculateLaserYOffset,
} from './laserHelpers';
import type { MiningConfiguration, LaserConfiguration, LaserHead } from '../types';

describe('laserHelpers', () => {
  // Helper to create a laser configuration
  const createLaserConfig = (
    laserHeadId: string | null,
    isManned: boolean = true
  ): LaserConfiguration => ({
    laserHead: laserHeadId ? { id: laserHeadId, name: 'Test', maxPower: 1000, resistModifier: 1, size: 1, moduleSlots: 2 } as LaserHead : null,
    modules: [],
    isManned,
  });

  describe('getMannedLasers', () => {
    it('should return empty array for undefined config', () => {
      expect(getMannedLasers(undefined)).toEqual([]);
    });

    it('should return empty array for config with no lasers', () => {
      const config: MiningConfiguration = { lasers: [] };
      expect(getMannedLasers(config)).toEqual([]);
    });

    it('should filter out lasers with null laserHead', () => {
      const config: MiningConfiguration = {
        lasers: [
          createLaserConfig('arbor-mh1'),
          createLaserConfig(null),
        ],
      };
      expect(getMannedLasers(config)).toHaveLength(1);
    });

    it('should filter out lasers with "none" laserHead', () => {
      const config: MiningConfiguration = {
        lasers: [
          createLaserConfig('arbor-mh1'),
          createLaserConfig('none'),
        ],
      };
      expect(getMannedLasers(config)).toHaveLength(1);
    });

    it('should filter out unmanned lasers', () => {
      const config: MiningConfiguration = {
        lasers: [
          createLaserConfig('arbor-mh1', true),
          createLaserConfig('arbor-mh2', false),
        ],
      };
      expect(getMannedLasers(config)).toHaveLength(1);
    });

    it('should return all manned lasers with valid heads', () => {
      const config: MiningConfiguration = {
        lasers: [
          createLaserConfig('arbor-mh1', true),
          createLaserConfig('arbor-mh2', true),
          createLaserConfig('helix-1', true),
        ],
      };
      expect(getMannedLasers(config)).toHaveLength(3);
    });
  });

  describe('getMannedLaserCount', () => {
    it('should return 0 for undefined config', () => {
      expect(getMannedLaserCount(undefined)).toBe(0);
    });

    it('should return correct count of manned lasers', () => {
      const config: MiningConfiguration = {
        lasers: [
          createLaserConfig('arbor-mh1', true),
          createLaserConfig('arbor-mh2', false),
          createLaserConfig('helix-1', true),
        ],
      };
      expect(getMannedLaserCount(config)).toBe(2);
    });
  });

  describe('getLaserLengthScale', () => {
    it('should return 1.02 for small rocks (< 50000 mass)', () => {
      expect(getLaserLengthScale(10000)).toBe(1.02);
      expect(getLaserLengthScale(49999)).toBe(1.02);
    });

    it('should return 0.8 for large rocks (>= 50000 mass)', () => {
      expect(getLaserLengthScale(50000)).toBe(0.8);
      expect(getLaserLengthScale(100000)).toBe(0.8);
    });
  });

  describe('calculateLaserEndpoint', () => {
    it('should scale endpoint for small rocks (1.02x)', () => {
      const result = calculateLaserEndpoint(0, 0, 100, 100, 10000);
      expect(result.x).toBeCloseTo(102, 1);
      expect(result.y).toBeCloseTo(102, 1);
    });

    it('should scale endpoint for large rocks (0.8x)', () => {
      const result = calculateLaserEndpoint(0, 0, 100, 100, 100000);
      expect(result.x).toBeCloseTo(80, 1);
      expect(result.y).toBeCloseTo(80, 1);
    });

    it('should handle non-zero start positions', () => {
      const result = calculateLaserEndpoint(50, 50, 150, 150, 100000);
      // fullDX = 100, fullDY = 100, scale = 0.8
      // x = 50 + 100 * 0.8 = 130
      // y = 50 + 100 * 0.8 = 130
      expect(result.x).toBeCloseTo(130, 1);
      expect(result.y).toBeCloseTo(130, 1);
    });
  });

  describe('getLaserAngleSpread', () => {
    it('should return 4 degrees for small rocks (< 50000 mass)', () => {
      expect(getLaserAngleSpread(10000)).toBe(4);
      expect(getLaserAngleSpread(49999)).toBe(4);
    });

    it('should return 8 degrees for large rocks (>= 50000 mass)', () => {
      expect(getLaserAngleSpread(50000)).toBe(8);
      expect(getLaserAngleSpread(100000)).toBe(8);
    });
  });

  describe('calculateMoleLaserAngleOffsets', () => {
    it('should return empty array for 0 lasers', () => {
      expect(calculateMoleLaserAngleOffsets(0, 50000)).toEqual([]);
    });

    it('should return empty array for negative lasers', () => {
      expect(calculateMoleLaserAngleOffsets(-1, 50000)).toEqual([]);
    });

    it('should return [0] for 1 laser', () => {
      expect(calculateMoleLaserAngleOffsets(1, 50000)).toEqual([0]);
    });

    it('should return [0, -spread] for 2 lasers', () => {
      // Small rock: spread = 4
      expect(calculateMoleLaserAngleOffsets(2, 10000)).toEqual([0, -4]);
      // Large rock: spread = 8
      expect(calculateMoleLaserAngleOffsets(2, 100000)).toEqual([0, -8]);
    });

    it('should return [0, -spread, spread] for 3 lasers', () => {
      // Small rock: spread = 4
      expect(calculateMoleLaserAngleOffsets(3, 10000)).toEqual([0, -4, 4]);
      // Large rock: spread = 8
      expect(calculateMoleLaserAngleOffsets(3, 100000)).toEqual([0, -8, 8]);
    });

    it('should treat more than 3 lasers same as 3', () => {
      expect(calculateMoleLaserAngleOffsets(4, 50000)).toEqual([0, -8, 8]);
    });
  });

  describe('calculateLaserYOffset', () => {
    it('should return 0 for 0 degree angle', () => {
      expect(calculateLaserYOffset(0, 100)).toBe(0);
    });

    it('should calculate correct offset for positive angles', () => {
      // tan(8°) * 100 ≈ 14.05
      const offset = calculateLaserYOffset(8, 100);
      expect(offset).toBeCloseTo(14.05, 1);
    });

    it('should calculate correct offset for negative angles', () => {
      // tan(-8°) * 100 ≈ -14.05
      const offset = calculateLaserYOffset(-8, 100);
      expect(offset).toBeCloseTo(-14.05, 1);
    });

    it('should scale with laser length', () => {
      const offset100 = calculateLaserYOffset(4, 100);
      const offset200 = calculateLaserYOffset(4, 200);
      expect(offset200).toBeCloseTo(offset100 * 2, 1);
    });
  });
});
