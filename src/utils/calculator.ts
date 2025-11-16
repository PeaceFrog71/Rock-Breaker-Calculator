import type { MiningConfiguration, Rock, CalculationResult, LaserConfiguration } from '../types';

/**
 * Calculate power for a single laser with its modules
 */
function calculateLaserPower(laser: LaserConfiguration): number {
  if (!laser.laserHead) return 0;

  let power = laser.laserHead.maxPower;

  // Apply module power modifiers
  laser.modules.forEach((module) => {
    if (module) {
      power *= module.powerModifier;
    }
  });

  return power;
}

/**
 * Calculate resistance modifier for a single laser with its modules
 */
function calculateLaserResistModifier(laser: LaserConfiguration): number {
  if (!laser.laserHead) return 1;

  let resistMod = laser.laserHead.resistModifier;

  // Apply module resistance modifiers
  laser.modules.forEach((module) => {
    if (module) {
      resistMod *= module.resistModifier;
    }
  });

  return resistMod;
}

/**
 * Main calculation function based on Excel formulas
 */
export function calculateBreakability(
  config: MiningConfiguration,
  rock: Rock
): CalculationResult {
  // Calculate total laser power (sum of all lasers)
  let totalLaserPower = 0;
  config.lasers.forEach((laser) => {
    totalLaserPower += calculateLaserPower(laser);
  });

  // Calculate total resistance modifier
  // Start with laser resist modifiers (multiplied together)
  let totalResistModifier = 1;
  config.lasers.forEach((laser) => {
    if (laser.laserHead) {
      totalResistModifier *= calculateLaserResistModifier(laser);
    }
  });

  // Apply gadget resist modifiers
  config.gadgets.forEach((gadget) => {
    if (gadget) {
      totalResistModifier *= gadget.resistModifier;
    }
  });

  // Calculate adjusted resistance
  const adjustedResistance = rock.resistance * totalResistModifier;

  // Calculate base LP needed (from Excel: Rock Mass * Base Resistance / 108.7)
  const baseLPNeeded = (rock.mass * rock.resistance) / 108.7;

  // Calculate adjusted LP needed
  const adjustedLPNeeded = (rock.mass * adjustedResistance) / 108.7;

  // Determine if rock can be broken
  const canBreak = totalLaserPower >= adjustedLPNeeded;

  // Calculate power margin
  const powerMargin = totalLaserPower - adjustedLPNeeded;
  const powerMarginPercent = adjustedLPNeeded > 0
    ? (powerMargin / adjustedLPNeeded) * 100
    : 0;

  return {
    totalLaserPower,
    totalResistModifier,
    adjustedResistance,
    baseLPNeeded,
    adjustedLPNeeded,
    canBreak,
    powerMargin,
    powerMarginPercent,
  };
}

/**
 * Helper function to create empty laser configuration
 */
export function createEmptyLaser(): LaserConfiguration {
  return {
    laserHead: null,
    modules: [null, null, null],
  };
}

/**
 * Helper function to create empty mining configuration
 */
export function createEmptyConfig(numLasers: number): MiningConfiguration {
  return {
    lasers: Array(numLasers).fill(null).map(() => createEmptyLaser()),
    gadgets: [null, null, null],
  };
}

/**
 * Format power number for display
 */
export function formatPower(power: number): string {
  return power.toFixed(2);
}

/**
 * Format percentage for display
 */
export function formatPercent(percent: number): string {
  return percent >= 0 ? `+${percent.toFixed(1)}%` : `${percent.toFixed(1)}%`;
}
