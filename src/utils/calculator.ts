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
 *
 * @param scanningLaserModifier - Optional modifier of ONLY the scanning laser (for single-ship MOLE mode).
 *   When provided, this is used to reverse the modified resistance value instead of equipmentModifier.
 *   This fixes the bug where adding helper lasers would incorrectly affect the derived base resistance.
 */
export function calculateEffectiveResistance(
  rock: Rock,
  equipmentModifier: number,
  gadgetModifier: number,
  scanningLaserModifier?: number
): { effectiveResistance: number; derivedBase?: number } {
  const totalModifier = equipmentModifier * gadgetModifier;

  if (rock.resistanceMode === 'modified') {
    // User scanned with laser - need to reverse-calculate base resistance
    // Use scanning laser's modifier if provided, otherwise fall back to equipment modifier
    const reverseModifier = scanningLaserModifier ?? equipmentModifier;
    const scanModifier = rock.includeGadgetsInScan ? reverseModifier * gadgetModifier : reverseModifier;
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
 *
 * Stacking logic:
 * - Module power percentages ADD together (e.g., two +35% = +70%)
 * - The combined module modifier is then MULTIPLIED by the laser base power
 *
 * Example: Laser (3600 power) + Module (+35%) + Module (+35%)
 *   Module sum: 0.35 + 0.35 = 0.70 → 1.70 multiplier
 *   Combined: 3600 × 1.70 = 6120 power
 */
export function calculateLaserPower(laser: LaserConfiguration): number {
  if (!laser.laserHead) return 0;

  const basePower = laser.laserHead.maxPower;

  // Sum module power percentages (convert from multiplier to percentage first)
  // powerModifier of 1.35 = +35% = 0.35, powerModifier of 0.85 = -15% = -0.15
  let modulePercentageSum = 0;
  laser.modules.forEach((module, index) => {
    if (module) {
      const isActive = laser.moduleActive ? laser.moduleActive[index] === true : false;
      if (isActive) {
        // Convert multiplier to percentage and add
        modulePercentageSum += (module.powerModifier - 1);
      }
    }
  });

  // Convert summed percentages back to multiplier
  const combinedModuleModifier = 1 + modulePercentageSum;

  // Multiply base power by combined module modifier
  return basePower * combinedModuleModifier;
}

/**
 * Calculate resistance modifier for a single laser with its modules
 *
 * Stacking logic:
 * - Module resistance percentages ADD together (e.g., two +15% = +30%)
 * - The combined module modifier is then MULTIPLIED by the laser head modifier
 *
 * Example: Laser (0.7x) + Module (+15%) + Module (+15%)
 *   Module sum: 0.15 + 0.15 = 0.30 → 1.30 multiplier
 *   Combined: 0.7 × 1.30 = 0.91x total modifier
 *
 * @param passiveOnly - If true, only include passive modules (for back-calculating base values from scans)
 */
export function calculateLaserResistModifier(laser: LaserConfiguration, passiveOnly: boolean = false): number {
  if (!laser.laserHead) return 1;

  // Start with the laser head's resistance modifier
  const laserResistMod = laser.laserHead.resistModifier;

  // Sum module resistance percentages (convert from multiplier to percentage first)
  // resistModifier of 1.15 = +15% = 0.15, resistModifier of 0.85 = -15% = -0.15
  let modulePercentageSum = 0;
  laser.modules.forEach((module, index) => {
    if (module) {
      // Skip active modules if passiveOnly is true
      if (passiveOnly && module.category === 'active') {
        return;
      }
      const isActive = laser.moduleActive ? laser.moduleActive[index] === true : false;
      if (isActive) {
        // Convert multiplier to percentage and add
        modulePercentageSum += (module.resistModifier - 1);
      }
    }
  });

  // Convert summed percentages back to multiplier
  const combinedModuleModifier = 1 + modulePercentageSum;

  // Multiply laser modifier by combined module modifier
  return laserResistMod * combinedModuleModifier;
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

  // Calculate scanning laser modifier for modified resistance mode (single-ship MOLE)
  // This allows us to reverse the modified resistance using only the scanning laser's modifier,
  // not all lasers combined, which fixes issue #13
  // Use passiveOnly=true because active modules are temporary and wouldn't affect the base scan
  let scanningLaserModifier: number | undefined;
  if (rock.resistanceMode === 'modified' && rock.scannedByLaserIndex !== undefined) {
    const scanningLaser = config.lasers[rock.scannedByLaserIndex];
    if (scanningLaser?.laserHead) {
      scanningLaserModifier = calculateLaserResistModifier(scanningLaser, true);
    }
  }

  // Calculate effective resistance based on resistance mode
  const { effectiveResistance, derivedBase } = calculateEffectiveResistance(
    rock,
    totalResistModifier,
    gadgetModifier,
    scanningLaserModifier
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

  // Multi-ship mining uses multiplicative stacking: all ship resistance modifiers multiply together
  // Verified in-game: resistance modifiers from multiple ships are multiplied
  const equipmentModifier = allResistModifiers.reduce((acc, mod) => acc * mod, 1);

  // For modified resistance mode, calculate the scanning laser's modifier separately
  // This is used to reverse the modified resistance to derive the base value
  // Use passiveOnly=true because active modules are temporary and wouldn't affect the base scan
  let scanningLaserModifier: number | undefined;
  if (rock.resistanceMode === 'modified' && rock.scannedByShipId && rock.scannedByLaserIndex !== undefined) {
    const scanningShip = activeShips.find(s => s.id === rock.scannedByShipId);
    if (scanningShip) {
      const scanningLaser = scanningShip.config.lasers[rock.scannedByLaserIndex];
      if (scanningLaser?.laserHead) {
        scanningLaserModifier = calculateLaserResistModifier(scanningLaser, true);
      }
    }
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
    gadgetModifier,
    scanningLaserModifier
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
