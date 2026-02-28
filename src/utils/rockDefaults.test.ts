// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_ROCKS, parseActiveSlotIndex, loadRockFromStorage } from './rockDefaults';

// --- parseActiveSlotIndex ---

describe('parseActiveSlotIndex', () => {
  it('should return 0 when value is null', () => {
    expect(parseActiveSlotIndex(null)).toBe(0);
  });

  it('should return the parsed index for valid values', () => {
    expect(parseActiveSlotIndex('0')).toBe(0);
    expect(parseActiveSlotIndex('1')).toBe(1);
    expect(parseActiveSlotIndex('2')).toBe(2);
    expect(parseActiveSlotIndex('3')).toBe(3);
  });

  it('should return 0 for NaN values', () => {
    expect(parseActiveSlotIndex('abc')).toBe(0);
    expect(parseActiveSlotIndex('')).toBe(0);
    expect(parseActiveSlotIndex('not-a-number')).toBe(0);
  });

  it('should return 0 for negative values', () => {
    expect(parseActiveSlotIndex('-1')).toBe(0);
    expect(parseActiveSlotIndex('-100')).toBe(0);
  });

  it('should return 0 for out-of-range values', () => {
    expect(parseActiveSlotIndex('4')).toBe(0);
    expect(parseActiveSlotIndex('99')).toBe(0);
    expect(parseActiveSlotIndex('1000')).toBe(0);
  });

  it('should return 0 for floating point strings', () => {
    // parseInt('1.5') returns 1, which is valid
    expect(parseActiveSlotIndex('1.5')).toBe(1);
    // parseInt('4.9') returns 4, which is out of range
    expect(parseActiveSlotIndex('4.9')).toBe(0);
  });
});

// --- loadRockFromStorage ---

describe('loadRockFromStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return slot 0 default when localStorage is empty', () => {
    const rock = loadRockFromStorage();
    expect(rock.mass).toBe(DEFAULT_ROCKS[0].mass);
    expect(rock.resistance).toBe(DEFAULT_ROCKS[0].resistance);
    expect(rock.instability).toBe(DEFAULT_ROCKS[0].instability);
  });

  it('should return per-slot default when active slot is set but no slot data exists', () => {
    localStorage.setItem('rockbreaker-active-rock-slot', '2');

    const rock = loadRockFromStorage();
    expect(rock.mass).toBe(DEFAULT_ROCKS[2].mass);
    expect(rock.resistance).toBe(DEFAULT_ROCKS[2].resistance);
  });

  it('should load saved rock data from the active slot', () => {
    const savedRock = { mass: 7777, resistance: 42, instability: 33, type: 'test', resistanceMode: 'base' };
    localStorage.setItem('rockbreaker-rock-slots', JSON.stringify([null, savedRock, null, null]));
    localStorage.setItem('rockbreaker-active-rock-slot', '1');

    const rock = loadRockFromStorage();
    expect(rock.mass).toBe(7777);
    expect(rock.resistance).toBe(42);
    expect(rock.instability).toBe(33);
  });

  it('should fall back to slot 0 default when active slot index is corrupted', () => {
    localStorage.setItem('rockbreaker-active-rock-slot', 'garbage');

    const rock = loadRockFromStorage();
    expect(rock.mass).toBe(DEFAULT_ROCKS[0].mass);
  });

  it('should fall back to slot 0 default when active slot index is out of range', () => {
    localStorage.setItem('rockbreaker-active-rock-slot', '99');

    const rock = loadRockFromStorage();
    expect(rock.mass).toBe(DEFAULT_ROCKS[0].mass);
  });

  it('should fall back to slot 0 default when slot data is invalid JSON', () => {
    localStorage.setItem('rockbreaker-rock-slots', 'not-valid-json');
    localStorage.setItem('rockbreaker-active-rock-slot', '0');

    const rock = loadRockFromStorage();
    expect(rock.mass).toBe(DEFAULT_ROCKS[0].mass);
  });

  it('should migrate legacy "name" field to "type" (#236)', () => {
    const legacyRock = { mass: 5000, resistance: 20, instability: 40, name: 'Quantanium' };
    localStorage.setItem('rockbreaker-rock-slots', JSON.stringify([legacyRock]));
    localStorage.setItem('rockbreaker-active-rock-slot', '0');

    const rock = loadRockFromStorage();
    expect(rock.type).toBe('Quantanium');
    expect((rock as any).name).toBeUndefined();
  });

  it('should return a copy, not a reference to the default', () => {
    const rock1 = loadRockFromStorage();
    const rock2 = loadRockFromStorage();
    expect(rock1).not.toBe(rock2);
    expect(rock1).toEqual(rock2);
  });
});

// --- DEFAULT_ROCKS ---

describe('DEFAULT_ROCKS', () => {
  it('should have 4 slots', () => {
    expect(DEFAULT_ROCKS).toHaveLength(4);
  });

  it('should have decreasing mass values across slots', () => {
    expect(DEFAULT_ROCKS[0].mass).toBe(50000);
    expect(DEFAULT_ROCKS[1].mass).toBe(30000);
    expect(DEFAULT_ROCKS[2].mass).toBe(10000);
    expect(DEFAULT_ROCKS[3].mass).toBe(5000);
  });

  it('should have resistance 25 and instability 50 for all slots', () => {
    DEFAULT_ROCKS.forEach((rock) => {
      expect(rock.resistance).toBe(25);
      expect(rock.instability).toBe(50);
    });
  });
});
