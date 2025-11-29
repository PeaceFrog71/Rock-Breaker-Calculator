import type { MiningConfiguration, Rock, CalculationResult, LaserConfiguration, MiningGroup, Gadget } from '../types';

/**
 * Derive base resistance from a modified (scanned-with-laser) value
 * Formula: baseResistance = modifiedResistance / totalModifier
 */
export function deriveBaseResistance(modifiedValue: number, totalModifier: number): number {
  if (totalModifier === 0) return modifiedValue;
  return modifiedValue / totalModifier;
}

/**
 * Calculate effective resistance based on mode
 * - Base mode: Apply modifiers to the base resistance
 * - Modified mode: Reverse-calculate base, then apply modifiers
 */
export function calculateEffectiveResistance(
  rock: Rock,
  equipmentModifier: number,
  gadgetModifier: number
): { effectiveResistance: number; derivedBase?: number } {
  const totalModifier = equipmentModifier * gadgetModifier;

  if (rock.resistanceMode === 'modified') {
    // User scanned with laser - need to reverse-calculate base resistance
    const scanModifier = rock.includeGadgetsInScan ? totalModifier : equipmentModifier;
    const derivedBase = deriveBaseResistance(rock.resistance, scanModifier);
    const effectiveResistance = derivedBase * totalModifier;
    return { effectiveResistance, derivedBase };
  } else {
    // Base mode (default) - user scanned from cockpit without laser
    const effectiveResistance = rock.resistance * totalModifier;
    return { effectiveResistance };
  }
}

/**
 * Calculate power for a single laser with its modules
 */
export function calculateLaserPower(laser: LaserConfiguration): number {
  if (!laser.laserHead) return 0;

  let power = laser.laserHead.maxPower;

  // Apply module power modifiers (only if module is active)
  laser.modules.forEach((module, index) => {
    if (module) {
      const isActive = laser.moduleActive ? laser.moduleActive[index] !== false : true;
      if (isActive) {
        power *= module.powerModifier;
      }
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

  // Apply module resistance modifiers (only if module is active)
  laser.modules.forEach((module, index) => {
    if (module) {
      const isActive = laser.moduleActive ? laser.moduleActive[index] !== false : true;
      if (isActive) {
        resistMod *= module.resistModifier;
      }
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
  gadgets: (Gadget | null)[] = [],
  shipId?: string
): CalculationResult {
  // Calculate total laser power (sum of all lasers)
  let totalLaserPower = 0;
  config.lasers.forEach((laser) => {
    const laserPower = calculateLaserPower(laser);
    // For MOLE in single ship mode, only count manned lasers
    if (shipId === 'mole') {
      if (laser.isManned !== false) {
        totalLaserPower += laserPower;
      }
    } else {
      totalLaserPower += laserPower;
    }
  });

  // Calculate total resistance modifier
  // Start with laser resist modifiers (multiplied together)
  let totalResistModifier = 1;
  config.lasers.forEach((laser) => {
    if (laser.laserHead) {
      // For MOLE in single ship mode, only count manned lasers
      if (shipId === 'mole') {
        if (laser.isManned !== false) {
          totalResistModifier *= calculateLaserResistModifier(laser);
        }
      } else {
        totalResistModifier *= calculateLaserResistModifier(laser);
      }
    }
  });

  // Apply gadget resist modifiers
  let gadgetModifier = 1;
  gadgets.forEach((gadget) => {
    if (gadget && gadget.id !== 'none') {
      gadgetModifier *= gadget.resistModifier;
    }
  });

  // Calculate effective resistance based on resistance mode
  const { effectiveResistance, derivedBase } = calculateEffectiveResistance(
    rock,
    totalResistModifier,
    gadgetModifier
  );

  const adjustedResistance = effectiveResistance;
  const totalCombinedModifier = totalResistModifier * gadgetModifier;

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

  const result: CalculationResult = {
    totalLaserPower,
    totalResistModifier: totalCombinedModifier,
    adjustedResistance,
    baseLPNeeded,
    adjustedLPNeeded,
    canBreak,
    powerMargin,
    powerMarginPercent,
  };

  // Add resistance context if in modified mode
  if (derivedBase !== undefined) {
    result.resistanceContext = {
      derivedBaseValue: derivedBase,
      appliedModifier: totalCombinedModifier,
    };
  }

  return result;
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

  // For modified resistance mode, use the scanning ship's equipment modifier
  // For base mode, average the resistance modifiers from all active ships
  let equipmentModifier: number;

  if (rock.resistanceMode === 'modified' && rock.scannedByShipId && rock.scannedByLaserIndex !== undefined) {
    // Find the scanning ship and calculate its specific equipment modifier
    const scanningShip = activeShips.find(s => s.id === rock.scannedByShipId);
    if (scanningShip) {
      const scanningLaser = scanningShip.config.lasers[rock.scannedByLaserIndex];
      if (scanningLaser?.laserHead) {
        equipmentModifier = calculateLaserResistModifier(scanningLaser);
      } else {
        // Fallback to averaging if scanning laser not found
        equipmentModifier = allResistModifiers.reduce((sum, mod) => sum + mod, 0) / allResistModifiers.length;
      }
    } else {
      // Fallback to averaging if scanning ship not found
      equipmentModifier = allResistModifiers.reduce((sum, mod) => sum + mod, 0) / allResistModifiers.length;
    }
  } else {
    // Base mode or no scanning ship selected - average all equipment modifiers
    equipmentModifier = allResistModifiers.reduce((sum, mod) => sum + mod, 0) / allResistModifiers.length;
  }

  // Apply gadget resist modifiers separately
  let gadgetModifier = 1;
  gadgets.forEach((gadget) => {
    if (gadget && gadget.id !== 'none') {
      gadgetModifier *= gadget.resistModifier;
    }
  });

  // Calculate effective resistance based on resistance mode
  const { effectiveResistance, derivedBase } = calculateEffectiveResistance(
    rock,
    equipmentModifier,
    gadgetModifier
  );

  const adjustedResistance = effectiveResistance;
  const totalCombinedModifier = equipmentModifier * gadgetModifier;

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

  const result: CalculationResult = {
    totalLaserPower,
    totalResistModifier: totalCombinedModifier,
    adjustedResistance,
    baseLPNeeded,
    adjustedLPNeeded,
    canBreak,
    powerMargin,
    powerMarginPercent,
  };

  // Add resistance context if in modified mode
  if (derivedBase !== undefined) {
    result.resistanceContext = {
      derivedBaseValue: derivedBase,
      appliedModifier: totalCombinedModifier,
    };
  }

  return result;
}
