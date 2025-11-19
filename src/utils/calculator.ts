import type { MiningConfiguration, Rock, CalculationResult, LaserConfiguration, MiningGroup } from '../types';

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
  rock: Rock,
  gadgets: (Gadget | null)[] = []
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
  gadgets.forEach((gadget) => {
    if (gadget && gadget.id !== 'none') {
      totalResistModifier *= gadget.resistModifier;
    }
  });

  // Calculate adjusted resistance
  const adjustedResistance = rock.resistance * totalResistModifier;

  // Calculate base LP needed (from Excel: (Mass / (1 - (Resistance * 0.01))) / 5)
  const baseLPNeeded = (rock.mass / (1 - (rock.resistance * 0.01))) / 5;

  // Calculate adjusted LP needed
  const adjustedLPNeeded = (rock.mass / (1 - (adjustedResistance * 0.01))) / 5;

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

/**
 * Calculate breakability for a mining group (multiple ships)
 * Combines power from all active ships and applies gadgets
 */
export function calculateGroupBreakability(
  miningGroup: MiningGroup,
  rock: Rock,
  gadgets: (Gadget | null)[] = []
): CalculationResult {
  // Filter only active ships
  const activeShips = miningGroup.ships.filter(ship => ship.isActive !== false);

  if (activeShips.length === 0) {
    // No active ships in group, return empty result
    const baseLPNeeded = (rock.mass / (1 - (rock.resistance * 0.01))) / 5;
    return {
      totalLaserPower: 0,
      totalResistModifier: 1,
      adjustedResistance: rock.resistance,
      baseLPNeeded,
      adjustedLPNeeded: baseLPNeeded,
      canBreak: false,
      powerMargin: 0,
      powerMarginPercent: 0,
    };
  }

  // Calculate total laser power (sum from all active ships)
  let totalLaserPower = 0;

  // Collect all resistance modifiers from all active ships
  let allResistModifiers: number[] = [];

  activeShips.forEach((shipInstance) => {
    const config = shipInstance.config;

    // Add power from this ship's lasers (only manned lasers for MOLE)
    config.lasers.forEach((laser) => {
      // For MOLE, only count manned lasers
      if (shipInstance.ship.id === 'mole') {
        if (laser.isManned !== false) {
          totalLaserPower += calculateLaserPower(laser);
        }
      } else {
        totalLaserPower += calculateLaserPower(laser);
      }
    });

    // Calculate this ship's resistance modifier from lasers only
    let shipResistMod = 1;

    // Apply laser resist modifiers (only manned lasers for MOLE)
    config.lasers.forEach((laser) => {
      if (laser.laserHead) {
        // For MOLE, only count manned lasers
        if (shipInstance.ship.id === 'mole') {
          if (laser.isManned !== false) {
            shipResistMod *= calculateLaserResistModifier(laser);
          }
        } else {
          shipResistMod *= calculateLaserResistModifier(laser);
        }
      }
    });

    allResistModifiers.push(shipResistMod);
  });

  // Average the resistance modifiers from all active ships
  let totalResistModifier = allResistModifiers.reduce((sum, mod) => sum + mod, 0) / allResistModifiers.length;

  // Apply gadget resist modifiers
  gadgets.forEach((gadget) => {
    if (gadget && gadget.id !== 'none') {
      totalResistModifier *= gadget.resistModifier;
    }
  });

  // Calculate adjusted resistance
  const adjustedResistance = rock.resistance * totalResistModifier;

  // Calculate base LP needed (from Excel: (Mass / (1 - (Resistance * 0.01))) / 5)
  const baseLPNeeded = (rock.mass / (1 - (rock.resistance * 0.01))) / 5;

  // Calculate adjusted LP needed
  const adjustedLPNeeded = (rock.mass / (1 - (adjustedResistance * 0.01))) / 5;

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
