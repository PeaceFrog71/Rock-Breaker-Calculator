import { describe, it, expect } from 'vitest';
import { calculateBreakability, calculateGroupBreakability } from './calculator';
import { LASER_HEADS, MODULES, GADGETS, SHIPS } from '../types';
import type { MiningConfiguration, Rock, MiningGroup, ShipInstance } from '../types';

/**
 * Test suite for Star Citizen Mining Calculator
 * Based on verified Excel calculations from "Star Citizen 4.3.1 - Laser Power Calculator"
 */

describe('Mining Calculator - Core Formulas', () => {
  describe('Basic Formula Verification', () => {
    it('should calculate base LP needed correctly: (mass / (1 - (resistance * 0.01))) / 5', () => {
      const rock: Rock = { mass: 11187, resistance: 17 };
      const emptyConfig: MiningConfiguration = {
        lasers: [{ laserHead: null, modules: [null, null, null] }],
      };
      const gadgets = [null, null, null];

      const result = calculateBreakability(emptyConfig, rock, gadgets);

      // Base LP Needed = (11187 / (1 - (17 * 0.01))) / 5 = 2695.6627
      expect(result.baseLPNeeded).toBeCloseTo(2695.6627, 2);
    });

    it('should calculate adjusted resistance: rock.resistance * totalResistModifier', () => {
      const rock: Rock = { mass: 11187, resistance: 17 };
      const hofstedeS2 = LASER_HEADS.find(l => l.id === 'hofstede-s2')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: hofstedeS2,
          modules: [null, null, null],
        }],
      };
      const gadgets = [null, null, null];

      const result = calculateBreakability(config, rock, gadgets);

      // Adjusted Resistance = 17 * 0.7 = 11.9
      expect(result.adjustedResistance).toBeCloseTo(11.9, 2);
    });

    it('should calculate adjusted LP needed: (mass / (1 - (adjustedResistance * 0.01))) / 5', () => {
      const rock: Rock = { mass: 11187, resistance: 17 };
      const hofstedeS2 = LASER_HEADS.find(l => l.id === 'hofstede-s2')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: hofstedeS2,
          modules: [null, null, null],
        }],
      };
      const gadgets = [null, null, null];

      const result = calculateBreakability(config, rock, gadgets);

      // Adjusted LP Needed = (11187 / (1 - (11.9 * 0.01))) / 5 = 2539.6141
      expect(result.adjustedLPNeeded).toBeCloseTo(2539.6141, 2);
    });
  });

  describe('Excel Example - Single Laser with Modules', () => {
    it('should match Excel calculation: Hofstede-S2 + Rieger-C3 + Focus III = 3990 power', () => {
      const hofstedeS2 = LASER_HEADS.find(l => l.id === 'hofstede-s2')!;
      const riegerC3 = MODULES.find(m => m.id === 'rieger-c3')!;
      const focusIII = MODULES.find(m => m.id === 'focus-3')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: hofstedeS2,
          modules: [riegerC3, focusIII, null],
        }],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 11187, resistance: 17 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Laser Power = 3360 × (1 + 0.25 + (-0.05)) = 3360 × 1.20 = 4032
      // Module power percentages ADD: +25% + (-5%) = +20%
      expect(result.totalLaserPower).toBeCloseTo(4032, 0);

      // Total Resist Modifier = 0.7 * 1.0 * 1.0 = 0.7
      expect(result.totalResistModifier).toBeCloseTo(0.7, 2);

      // Adjusted Resistance = 17 * 0.7 = 11.9
      expect(result.adjustedResistance).toBeCloseTo(11.9, 1);

      // Adjusted LP Needed = (11187 / (1 - (11.9 * 0.01))) / 5 = 2539.6141
      expect(result.adjustedLPNeeded).toBeCloseTo(2539.6141, 2);

      // Can Break? 4032 >= 2539.6141 = Yes
      expect(result.canBreak).toBe(true);

      // Power Margin = 4032 - 2539.6141 = 1492.3859
      expect(result.powerMargin).toBeCloseTo(1492.3859, 2);
    });
  });

  describe('Laser Head Power Calculations', () => {
    it('should calculate Pitman base power correctly', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const config: MiningConfiguration = {
        lasers: [{ laserHead: pitman, modules: [null, null] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.totalLaserPower).toBe(3150);
    });

    it('should calculate Helix I power correctly', () => {
      const helixI = LASER_HEADS.find(l => l.id === 'helix-1')!;
      const config: MiningConfiguration = {
        lasers: [{ laserHead: helixI, modules: [null, null] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.totalLaserPower).toBe(3150);
    });

    it('should calculate Klein-S1 power correctly', () => {
      const kleinS1 = LASER_HEADS.find(l => l.id === 'klein-s1')!;
      const config: MiningConfiguration = {
        lasers: [{ laserHead: kleinS1, modules: [] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.totalLaserPower).toBe(2220);
    });

    it('should calculate Helix II power correctly', () => {
      const helixII = LASER_HEADS.find(l => l.id === 'helix-2')!;
      const config: MiningConfiguration = {
        lasers: [{ laserHead: helixII, modules: [null, null, null] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.totalLaserPower).toBe(4080);
    });
  });

  describe('Module Power Modifiers', () => {
    it('should apply Brandt power modifier (1.35x)', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const brandt = MODULES.find(m => m.id === 'brandt')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: pitman,
          modules: [brandt, null],
        }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      // 3150 * 1.35 = 4252.5
      expect(result.totalLaserPower).toBeCloseTo(4252.5, 1);
    });

    it('should apply Surge power modifier (1.5x)', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const surge = MODULES.find(m => m.id === 'surge')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: pitman,
          modules: [surge, null],
        }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      // 3150 * 1.5 = 4725
      expect(result.totalLaserPower).toBeCloseTo(4725, 0);
    });

    it('should ADD multiple module power modifiers (not multiply)', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const stampede = MODULES.find(m => m.id === 'stampede')!; // 1.35 → +35%
      const riegerC3 = MODULES.find(m => m.id === 'rieger-c3')!; // 1.25 → +25%

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: pitman,
          modules: [stampede, riegerC3],
        }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      // Module power percentages ADD: +35% + 25% = +60% → 1.60 multiplier
      // 3150 × 1.60 = 5040
      expect(result.totalLaserPower).toBeCloseTo(5040, 0);
    });
  });

  describe('Resistance Modifiers', () => {
    it('should apply laser head resistance modifier (Helix I = 0.7)', () => {
      const helixI = LASER_HEADS.find(l => l.id === 'helix-1')!;
      const config: MiningConfiguration = {
        lasers: [{ laserHead: helixI, modules: [null, null] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Adjusted Resistance = 20 * 0.7 = 14
      expect(result.adjustedResistance).toBeCloseTo(14, 1);
    });

    it('should apply laser head resistance modifier (Klein-S1 = 0.55)', () => {
      const kleinS1 = LASER_HEADS.find(l => l.id === 'klein-s1')!;
      const config: MiningConfiguration = {
        lasers: [{ laserHead: kleinS1, modules: [] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Adjusted Resistance = 20 * 0.55 = 11
      expect(result.adjustedResistance).toBeCloseTo(11, 1);
    });

    it('should apply module resistance modifiers (Brandt = 1.15)', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const brandt = MODULES.find(m => m.id === 'brandt')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: pitman, // resist = 1.25
          modules: [brandt, null], // resist = 1.15
        }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Resist Modifier = 1.25 * 1.15 = 1.4375
      // Adjusted Resistance = 20 * 1.4375 = 28.75
      expect(result.totalResistModifier).toBeCloseTo(1.4375, 4);
      expect(result.adjustedResistance).toBeCloseTo(28.75, 2);
    });

    it('should apply module resistance modifiers (Rime = 0.75)', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const rime = MODULES.find(m => m.id === 'rime')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: pitman, // resist = 1.25
          modules: [rime, null], // resist = 0.75
        }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Resist Modifier = 1.25 * 0.75 = 0.9375
      // Adjusted Resistance = 20 * 0.9375 = 18.75
      expect(result.totalResistModifier).toBeCloseTo(0.9375, 4);
      expect(result.adjustedResistance).toBeCloseTo(18.75, 2);
    });

    it('should ADD multiple module resistance modifiers (not multiply)', () => {
      const helixI = LASER_HEADS.find(l => l.id === 'helix-1')!; // resist = 0.7
      const lifeline = MODULES.find(m => m.id === 'lifeline')!; // resist = 0.85 → -15%
      const rime = MODULES.find(m => m.id === 'rime')!; // resist = 0.75 → -25%

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: helixI,
          modules: [lifeline, rime],
        }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Module percentages ADD: (-0.15) + (-0.25) = -0.40 → combined module modifier = 0.60
      // Total Resist Modifier = 0.7 (laser) * 0.60 (modules) = 0.42
      // Adjusted Resistance = 20 * 0.42 = 8.4
      expect(result.totalResistModifier).toBeCloseTo(0.42, 5);
      expect(result.adjustedResistance).toBeCloseTo(8.4, 3);
    });

    it('should correctly stack: modules ADD percentages, then multiply by laser, then multiply lasers together', () => {
      // This test validates the complete stacking formula:
      // 1. Module percentages ADD together within a laser
      // 2. Combined module modifier MULTIPLIES with laser head modifier
      // 3. Each laser's combined modifier MULTIPLIES with other lasers

      const helixII = LASER_HEADS.find(l => l.id === 'helix-2')!; // resist = 0.7
      const brandt = MODULES.find(m => m.id === 'brandt')!; // resist = 1.15 → +15%
      const forel = MODULES.find(m => m.id === 'forel')!; // resist = 1.15 → +15%

      // MOLE with 2 lasers, each with 2 modules
      const config: MiningConfiguration = {
        lasers: [
          { laserHead: helixII, modules: [brandt, forel, null] }, // Laser 1
          { laserHead: helixII, modules: [brandt, null, null] },  // Laser 2
        ],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Laser 1: modules ADD → +15% + 15% = +30% → 1.30 module modifier
      //          laser × modules = 0.7 × 1.30 = 0.91
      // Laser 2: modules ADD → +15% = 1.15 module modifier
      //          laser × modules = 0.7 × 1.15 = 0.805
      // Total: lasers MULTIPLY → 0.91 × 0.805 = 0.73255
      // Adjusted Resistance = 20 × 0.73255 = 14.651
      expect(result.totalResistModifier).toBeCloseTo(0.73255, 4);
      expect(result.adjustedResistance).toBeCloseTo(14.651, 2);
    });

    it('should yield ~0.75 (-25% effective resistance) for MOLE with Arbor/Lancet/Impact config', () => {
      // Issue #14 test case:
      // - Arbor MH2 (1.25) + Rime (-25%) + Surge (-15%)
      // - Lancet MH2 (1.0) + Brandt (+15%) + Brandt (+15%)
      // - Impact II (1.1) + Surge (-15%) + Surge (-15%)

      const arborMH2 = LASER_HEADS.find(l => l.id === 'arbor-mh2')!;   // resist = 1.25
      const lancetMH2 = LASER_HEADS.find(l => l.id === 'lancet-mh2')!; // resist = 1.0
      const impactII = LASER_HEADS.find(l => l.id === 'impact-2')!;    // resist = 1.1
      const rime = MODULES.find(m => m.id === 'rime')!;       // resist = 0.75 → -25%
      const surge = MODULES.find(m => m.id === 'surge')!;     // resist = 0.85 → -15%
      const brandt = MODULES.find(m => m.id === 'brandt')!;   // resist = 1.15 → +15%

      const config: MiningConfiguration = {
        lasers: [
          { laserHead: arborMH2, modules: [rime, surge] },      // Laser 1
          { laserHead: lancetMH2, modules: [brandt, brandt] },  // Laser 2
          { laserHead: impactII, modules: [surge, surge, null] }, // Laser 3
        ],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // RESISTANCE:
      // Laser 1: modules ADD → -25% + -15% = -40% → 0.60
      //          laser × modules = 1.25 × 0.60 = 0.75
      // Laser 2: modules ADD → +15% + 15% = +30% → 1.30
      //          laser × modules = 1.0 × 1.30 = 1.30
      // Laser 3: modules ADD → -15% + -15% = -30% → 0.70
      //          laser × modules = 1.1 × 0.70 = 0.77
      // Total: lasers MULTIPLY → 0.75 × 1.30 × 0.77 = 0.75075
      // This is approximately -25% effective resistance modifier
      expect(result.totalResistModifier).toBeCloseTo(0.75075, 4);
      expect(result.adjustedResistance).toBeCloseTo(15.015, 2); // 20 × 0.75075

      // POWER (module percentages also ADD):
      // Laser 1: Arbor MH2 (2400) × (1 + (-0.15) + 0.50) = 2400 × 1.35 = 3240
      // Laser 2: Lancet MH2 (3600) × (1 + 0.35 + 0.35) = 3600 × 1.70 = 6120
      // Laser 3: Impact II (3360) × (1 + 0.50 + 0.50) = 3360 × 2.00 = 6720
      // Total: 3240 + 6120 + 6720 = 16080
      expect(result.totalLaserPower).toBeCloseTo(16080, 0);
    });
  });

  describe('Modified Resistance Mode - Scanning Laser (Issue #13)', () => {
    it('should use only scanning laser modifier to reverse modified resistance in single-ship MOLE mode', () => {
      // Issue #13: When user scans with one laser but adds other lasers to help mine,
      // the calculator should use only the scanning laser's modifier to reverse the
      // modified resistance value, then apply ALL lasers' modifiers to get final result.

      const helixII = LASER_HEADS.find(l => l.id === 'helix-2')!;   // 0.7x resist
      const impactII = LASER_HEADS.find(l => l.id === 'impact-2')!; // 1.1x resist

      const config: MiningConfiguration = {
        lasers: [
          { laserHead: helixII, modules: [null, null, null] },   // Laser 0 - scanning laser
          { laserHead: impactII, modules: [null, null, null] },  // Laser 1 - helper laser
        ],
      };

      // User scanned rock with laser 0 (Helix II, 0.7x)
      // True base resistance = 20, displayed as 14 (20 × 0.7)
      const rock: Rock = {
        mass: 1000,
        resistance: 14,  // Modified value user sees when scanning with Helix II
        resistanceMode: 'modified',
        scannedByLaserIndex: 0,  // Scanned with laser 0
      };

      const result = calculateBreakability(config, rock, [null, null, null], 'mole');

      // Should reverse using only laser 0's modifier (0.7)
      // Derived base = 14 / 0.7 = 20
      expect(result.resistanceContext?.derivedBaseValue).toBeCloseTo(20, 1);

      // Then apply ALL lasers' combined modifier: 0.7 × 1.1 = 0.77
      // Adjusted resistance = 20 × 0.77 = 15.4
      expect(result.totalResistModifier).toBeCloseTo(0.77, 2);
      expect(result.adjustedResistance).toBeCloseTo(15.4, 1);
    });

    it('should handle modified resistance when scanning laser has modules', () => {
      const helixII = LASER_HEADS.find(l => l.id === 'helix-2')!;   // 0.7x resist
      const lancetMH2 = LASER_HEADS.find(l => l.id === 'lancet-mh2')!; // 1.0x resist
      const surge = MODULES.find(m => m.id === 'surge')!;  // 0.85 resist → -15%

      const config: MiningConfiguration = {
        lasers: [
          { laserHead: helixII, modules: [surge, null, null] },   // Laser 0 - scanning laser with module
          { laserHead: lancetMH2, modules: [null, null] },        // Laser 1 - helper laser
        ],
      };

      // Laser 0 with Surge: 0.7 × (1 + (-0.15)) = 0.7 × 0.85 = 0.595
      // User scanned with this laser, true base = 20, displayed as 11.9 (20 × 0.595)
      const rock: Rock = {
        mass: 1000,
        resistance: 11.9,
        resistanceMode: 'modified',
        scannedByLaserIndex: 0,
      };

      const result = calculateBreakability(config, rock, [null, null, null], 'mole');

      // Derived base = 11.9 / 0.595 = 20
      expect(result.resistanceContext?.derivedBaseValue).toBeCloseTo(20, 1);

      // Total modifier = 0.595 (laser 0) × 1.0 (laser 1) = 0.595
      // Adjusted resistance = 20 × 0.595 = 11.9
      expect(result.adjustedResistance).toBeCloseTo(11.9, 1);
    });

    it('should fall back to total modifier when scannedByLaserIndex is not set', () => {
      const helixII = LASER_HEADS.find(l => l.id === 'helix-2')!;

      const config: MiningConfiguration = {
        lasers: [
          { laserHead: helixII, modules: [null, null, null] },
        ],
      };

      // Modified mode but no scanning laser index specified
      const rock: Rock = {
        mass: 1000,
        resistance: 14,
        resistanceMode: 'modified',
        // scannedByLaserIndex not set
      };

      const result = calculateBreakability(config, rock, [null, null, null]);

      // Should fall back to using total equipment modifier (0.7) for reverse
      // Derived base = 14 / 0.7 = 20
      // Adjusted = 20 × 0.7 = 14
      expect(result.resistanceContext?.derivedBaseValue).toBeCloseTo(20, 1);
      expect(result.adjustedResistance).toBeCloseTo(14, 1);
    });
  });

  describe('Gadget Effects', () => {
    it('should apply OptiMax gadget (0.7 resist modifier)', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const optimax = GADGETS.find(g => g.id === 'optimax')!;

      const config: MiningConfiguration = {
        lasers: [{ laserHead: pitman, modules: [null, null] }],
      };
      const gadgets = [optimax, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Resist Modifier = 1.25 (pitman) * 0.7 (optimax) = 0.875
      // Adjusted Resistance = 20 * 0.875 = 17.5
      expect(result.totalResistModifier).toBeCloseTo(0.875, 3);
      expect(result.adjustedResistance).toBeCloseTo(17.5, 1);
    });

    it('should apply Sabir gadget (0.5 resist modifier)', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const sabir = GADGETS.find(g => g.id === 'sabir')!;

      const config: MiningConfiguration = {
        lasers: [{ laserHead: pitman, modules: [null, null] }],
      };
      const gadgets = [sabir, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Resist Modifier = 1.25 (pitman) * 0.5 (sabir) = 0.625
      // Adjusted Resistance = 20 * 0.625 = 12.5
      expect(result.totalResistModifier).toBeCloseTo(0.625, 3);
      expect(result.adjustedResistance).toBeCloseTo(12.5, 1);
    });

    it('should apply BoreMax gadget (1.1 resist modifier)', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const boremax = GADGETS.find(g => g.id === 'boremax')!;

      const config: MiningConfiguration = {
        lasers: [{ laserHead: pitman, modules: [null, null] }],
      };
      const gadgets = [boremax, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Resist Modifier = 1.25 (pitman) * 1.1 (boremax) = 1.375
      // Adjusted Resistance = 20 * 1.375 = 27.5
      expect(result.totalResistModifier).toBeCloseTo(1.375, 3);
      expect(result.adjustedResistance).toBeCloseTo(27.5, 1);
    });

    it('should multiply multiple gadget modifiers', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const optimax = GADGETS.find(g => g.id === 'optimax')!; // 0.7
      const sabir = GADGETS.find(g => g.id === 'sabir')!; // 0.5

      const config: MiningConfiguration = {
        lasers: [{ laserHead: pitman, modules: [null, null] }],
      };
      const gadgets = [optimax, sabir, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Resist Modifier = 1.25 * 0.7 * 0.5 = 0.4375
      // Adjusted Resistance = 20 * 0.4375 = 8.75
      expect(result.totalResistModifier).toBeCloseTo(0.4375, 4);
      expect(result.adjustedResistance).toBeCloseTo(8.75, 2);
    });
  });

  describe('Multi-Laser Configurations', () => {
    it('should sum power from multiple lasers', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;

      const config: MiningConfiguration = {
        lasers: [
          { laserHead: pitman, modules: [null, null] },
          { laserHead: pitman, modules: [null, null] },
        ],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Power = 3150 + 3150 = 6300
      expect(result.totalLaserPower).toBe(6300);
    });

    it('should multiply resistance modifiers from multiple lasers', () => {
      const helixI = LASER_HEADS.find(l => l.id === 'helix-1')!; // 0.7

      const config: MiningConfiguration = {
        lasers: [
          { laserHead: helixI, modules: [null, null] },
          { laserHead: helixI, modules: [null, null] },
        ],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Resist Modifier = 0.7 * 0.7 = 0.49
      // Adjusted Resistance = 20 * 0.49 = 9.8
      expect(result.totalResistModifier).toBeCloseTo(0.49, 2);
      expect(result.adjustedResistance).toBeCloseTo(9.8, 1);
    });

    it('should handle MOLE configuration (3 lasers)', () => {
      const helixII = LASER_HEADS.find(l => l.id === 'helix-2')!;
      const surge = MODULES.find(m => m.id === 'surge')!;

      const config: MiningConfiguration = {
        lasers: [
          { laserHead: helixII, modules: [surge, null, null] },
          { laserHead: helixII, modules: [surge, null, null] },
          { laserHead: helixII, modules: [surge, null, null] },
        ],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 15000, resistance: 25 };
      const result = calculateBreakability(config, rock, gadgets);

      // Total Power = (4080 * 1.5) * 3 = 18360
      expect(result.totalLaserPower).toBeCloseTo(18360, 0);

      // Total Resist Modifier = 0.7 * 0.85 (laser1) * 0.7 * 0.85 (laser2) * 0.7 * 0.85 (laser3) = 0.210645
      expect(result.totalResistModifier).toBeCloseTo(0.210645, 5);
    });
  });

  describe('Can Break Determination', () => {
    it('should return true when power exceeds required', () => {
      const hofstedeS2 = LASER_HEADS.find(l => l.id === 'hofstede-s2')!;
      const riegerC3 = MODULES.find(m => m.id === 'rieger-c3')!;
      const focusIII = MODULES.find(m => m.id === 'focus-3')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: hofstedeS2,
          modules: [riegerC3, focusIII, null],
        }],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 11187, resistance: 17 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.canBreak).toBe(true);
      expect(result.totalLaserPower).toBeGreaterThan(result.adjustedLPNeeded);
    });

    it('should return false when power is insufficient', () => {
      const arborMH1 = LASER_HEADS.find(l => l.id === 'arbor-mh1')!; // Low power

      const config: MiningConfiguration = {
        lasers: [{ laserHead: arborMH1, modules: [null] }],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 50000, resistance: 50 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.canBreak).toBe(false);
      expect(result.totalLaserPower).toBeLessThan(result.adjustedLPNeeded);
    });

    it('should handle edge case: exact power requirement', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;

      const config: MiningConfiguration = {
        lasers: [{ laserHead: pitman, modules: [null, null] }],
      };
      const gadgets = [null, null, null];

      // Pitman power = 3150, resist modifier = 1.25
      // Adjusted LP = (mass / (1 - (resist * 1.25 * 0.01))) / 5
      // We want exactly 3150
      // 3150 = (mass / (1 - (25 * 0.01))) / 5
      // mass = 3150 * 5 * 0.75 = 11812.5
      const rock: Rock = { mass: 11812.5, resistance: 20 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.canBreak).toBe(true);
      expect(result.totalLaserPower).toBeCloseTo(result.adjustedLPNeeded, 0);
      expect(result.powerMargin).toBeCloseTo(0, 0);
    });
  });

  describe('Power Margin Calculations', () => {
    it('should calculate positive power margin correctly', () => {
      const hofstedeS2 = LASER_HEADS.find(l => l.id === 'hofstede-s2')!;
      const riegerC3 = MODULES.find(m => m.id === 'rieger-c3')!;
      const focusIII = MODULES.find(m => m.id === 'focus-3')!;

      const config: MiningConfiguration = {
        lasers: [{
          laserHead: hofstedeS2,
          modules: [riegerC3, focusIII, null],
        }],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 11187, resistance: 17 };
      const result = calculateBreakability(config, rock, gadgets);

      // Power = 4032 (with additive stacking), LP Needed = 2539.6141
      // Power Margin = 4032 - 2539.6141 = 1492.3859
      expect(result.powerMargin).toBeCloseTo(1492.3859, 2);

      // Power Margin % = (1492.3859 / 2539.6141) * 100 = 58.76%
      expect(result.powerMarginPercent).toBeCloseTo(58.76, 1);
    });

    it('should calculate negative power margin correctly', () => {
      const arborMH1 = LASER_HEADS.find(l => l.id === 'arbor-mh1')!;

      const config: MiningConfiguration = {
        lasers: [{ laserHead: arborMH1, modules: [null] }],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 10000, resistance: 30 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.powerMargin).toBeLessThan(0);
      expect(result.powerMarginPercent).toBeLessThan(0);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle no laser configuration', () => {
      const config: MiningConfiguration = {
        lasers: [{ laserHead: null, modules: [null, null, null] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.totalLaserPower).toBe(0);
      expect(result.canBreak).toBe(false);
    });

    it('should handle zero mass rock', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const config: MiningConfiguration = {
        lasers: [{ laserHead: pitman, modules: [null, null] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 0, resistance: 10 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.baseLPNeeded).toBe(0);
      expect(result.adjustedLPNeeded).toBe(0);
      expect(result.canBreak).toBe(true);
    });

    it('should handle zero resistance rock', () => {
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const config: MiningConfiguration = {
        lasers: [{ laserHead: pitman, modules: [null, null] }],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 1000, resistance: 0 };
      const result = calculateBreakability(config, rock, gadgets);

      // With resist=0: LP = (1000 / (1 - 0)) / 5 = 200
      expect(result.baseLPNeeded).toBe(200);
      expect(result.adjustedLPNeeded).toBe(200);
      expect(result.canBreak).toBe(true); // Pitman has 3150 power
    });

    it('should handle very large rock', () => {
      const helixII = LASER_HEADS.find(l => l.id === 'helix-2')!;
      const surge = MODULES.find(m => m.id === 'surge')!;

      const config: MiningConfiguration = {
        lasers: [
          { laserHead: helixII, modules: [surge, null, null] },
          { laserHead: helixII, modules: [surge, null, null] },
          { laserHead: helixII, modules: [surge, null, null] },
        ],
      };
      const gadgets = [null, null, null];
      const rock: Rock = { mass: 100000, resistance: 50 };
      const result = calculateBreakability(config, rock, gadgets);

      expect(result.baseLPNeeded).toBeGreaterThan(0);
      expect(result.adjustedLPNeeded).toBeGreaterThan(0);
    });
  });
});

describe('Mining Calculator - Group Operations', () => {
  describe('Multi-Ship Calculations', () => {
    it('should sum power from multiple ships', () => {
      const prospector = SHIPS.find(s => s.id === 'prospector')!;
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;

      const ship1: ShipInstance = {
        id: '1',
        ship: prospector,
        name: 'Ship 1',
        config: {
          lasers: [{ laserHead: pitman, modules: [null, null] }],
        },
        isActive: true,
      };

      const ship2: ShipInstance = {
        id: '2',
        ship: prospector,
        name: 'Ship 2',
        config: {
          lasers: [{ laserHead: pitman, modules: [null, null] }],
        },
        isActive: true,
      };

      const group: MiningGroup = {
        ships: [ship1, ship2],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 20000, resistance: 30 };
      const result = calculateGroupBreakability(group, rock, gadgets);

      // Total Power = 3150 + 3150 = 6300
      expect(result.totalLaserPower).toBe(6300);
    });

    it('should average resistance modifiers from multiple ships', () => {
      const prospector = SHIPS.find(s => s.id === 'prospector')!;
      const helixI = LASER_HEADS.find(l => l.id === 'helix-1')!; // 0.7
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!; // 1.25

      const ship1: ShipInstance = {
        id: '1',
        ship: prospector,
        name: 'Ship 1',
        config: {
          lasers: [{ laserHead: helixI, modules: [null, null] }],
        },
        isActive: true,
      };

      const ship2: ShipInstance = {
        id: '2',
        ship: prospector,
        name: 'Ship 2',
        config: {
          lasers: [{ laserHead: pitman, modules: [null, null] }],
        },
        isActive: true,
      };

      const group: MiningGroup = {
        ships: [ship1, ship2],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 20000, resistance: 30 };
      const result = calculateGroupBreakability(group, rock, gadgets);

      // Average Resist Modifier = (0.7 + 1.25) / 2 = 0.975
      expect(result.totalResistModifier).toBeCloseTo(0.975, 3);
    });

    it('should only count active ships', () => {
      const prospector = SHIPS.find(s => s.id === 'prospector')!;
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;

      const ship1: ShipInstance = {
        id: '1',
        ship: prospector,
        name: 'Ship 1',
        config: {
          lasers: [{ laserHead: pitman, modules: [null, null] }],
        },
        isActive: true,
      };

      const ship2: ShipInstance = {
        id: '2',
        ship: prospector,
        name: 'Ship 2',
        config: {
          lasers: [{ laserHead: pitman, modules: [null, null] }],
        },
        isActive: false, // Inactive
      };

      const group: MiningGroup = {
        ships: [ship1, ship2],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 20000, resistance: 30 };
      const result = calculateGroupBreakability(group, rock, gadgets);

      // Only ship1 power should count
      expect(result.totalLaserPower).toBe(3150);
    });

    it('should handle MOLE with manned/unmanned lasers', () => {
      const mole = SHIPS.find(s => s.id === 'mole')!;
      const helixII = LASER_HEADS.find(l => l.id === 'helix-2')!;

      const ship: ShipInstance = {
        id: '1',
        ship: mole,
        name: 'MOLE 1',
        config: {
          lasers: [
            { laserHead: helixII, modules: [null, null, null], isManned: true },
            { laserHead: helixII, modules: [null, null, null], isManned: true },
            { laserHead: helixII, modules: [null, null, null], isManned: false },
          ],
        },
        isActive: true,
      };

      const group: MiningGroup = {
        ships: [ship],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 20000, resistance: 30 };
      const result = calculateGroupBreakability(group, rock, gadgets);

      // Only 2 manned lasers: 4080 * 2 = 8160
      expect(result.totalLaserPower).toBe(8160);
    });

    it('should apply group-level gadgets', () => {
      const prospector = SHIPS.find(s => s.id === 'prospector')!;
      const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
      const sabir = GADGETS.find(g => g.id === 'sabir')!;

      const ship: ShipInstance = {
        id: '1',
        ship: prospector,
        name: 'Ship 1',
        config: {
          lasers: [{ laserHead: pitman, modules: [null, null] }],
        },
        isActive: true,
      };

      const group: MiningGroup = {
        ships: [ship],
      };
      const gadgets = [sabir, null, null];

      const rock: Rock = { mass: 10000, resistance: 20 };
      const result = calculateGroupBreakability(group, rock, gadgets);

      // Resist Modifier = 1.25 (pitman) * 0.5 (sabir) = 0.625
      expect(result.totalResistModifier).toBeCloseTo(0.625, 3);
    });

    it('should handle empty group (no active ships)', () => {
      const group: MiningGroup = {
        ships: [],
      };
      const gadgets = [null, null, null];

      const rock: Rock = { mass: 10000, resistance: 20 };
      const result = calculateGroupBreakability(group, rock, gadgets);

      expect(result.totalLaserPower).toBe(0);
      expect(result.canBreak).toBe(false);
    });
  });
});

describe('Data Validation', () => {
  describe('Equipment Database Integrity', () => {
    it('should have all laser heads from CSV', () => {
      const expectedLasers = [
        'pitman', 'arbor-mh1', 'helix-1', 'hofstede-s1', 'impact-1',
        'klein-s1', 'lancet-mh1', 'arbor-mh2', 'helix-2', 'hofstede-s2',
        'impact-2', 'klein-s2', 'lancet-mh2'
      ];

      expectedLasers.forEach(id => {
        const laser = LASER_HEADS.find(l => l.id === id);
        expect(laser).toBeDefined();
      });
    });

    it('should have correct Hofstede-S2 stats from CSV', () => {
      const hofstede = LASER_HEADS.find(l => l.id === 'hofstede-s2')!;
      expect(hofstede.maxPower).toBe(3360);
      expect(hofstede.resistModifier).toBe(0.7);
    });

    it('should have all modules from CSV', () => {
      const expectedModules = [
        'brandt', 'forel', 'lifeline', 'optimum', 'rime', 'stampede',
        'surge', 'torpid', 'fltr', 'fltr-l', 'fltr-xl', 'focus',
        'focus-2', 'focus-3', 'rieger', 'rieger-c2', 'rieger-c3',
        'torrent', 'torrent-2', 'torrent-3', 'vaux', 'vaux-c2', 'vaux-c3',
        'xtr', 'xtr-l', 'xtr-xl'
      ];

      expectedModules.forEach(id => {
        const module = MODULES.find(m => m.id === id);
        expect(module).toBeDefined();
      });
    });

    it('should have correct Rieger-C3 stats from CSV', () => {
      const rieger = MODULES.find(m => m.id === 'rieger-c3')!;
      expect(rieger.powerModifier).toBe(1.25);
      expect(rieger.resistModifier).toBe(1.0);
    });

    it('should have correct Focus III stats from CSV', () => {
      const focus = MODULES.find(m => m.id === 'focus-3')!;
      expect(focus.powerModifier).toBe(0.95);
      expect(focus.resistModifier).toBe(1.0);
    });

    it('should have all gadgets from CSV', () => {
      const expectedGadgets = [
        'boremax', 'okunis', 'optimax', 'sabir', 'stalwart', 'waveshift'
      ];

      expectedGadgets.forEach(id => {
        const gadget = GADGETS.find(g => g.id === id);
        expect(gadget).toBeDefined();
      });
    });
  });
});
