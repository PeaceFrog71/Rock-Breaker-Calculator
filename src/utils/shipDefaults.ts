/**
 * Ship Default Configuration Utilities
 *
 * Centralizes the logic for initializing default laser configurations
 * when a ship is selected. This eliminates duplication between App.tsx
 * and ShipConfigModal.tsx.
 */

import type { Ship, LaserHead, MiningConfiguration, LaserConfiguration } from '../types';
import { LASER_HEADS } from '../types';

/**
 * Gets the default laser head for a given ship type.
 * - Golem: Fixed Pitman laser (cannot be changed)
 * - Prospector: Arbor MH1 (first S1 laser)
 * - MOLE: Arbor MH2 (first S2 laser)
 */
export function getDefaultLaserForShip(ship: Ship): LaserHead | null {
  switch (ship.id) {
    case 'golem':
      // Golem has a fixed Pitman laser
      return LASER_HEADS.find((h) => h.id === 'pitman') || null;

    case 'prospector':
      // Prospector defaults to Arbor MH1 (Size 1)
      return LASER_HEADS.find((h) => h.id === 'arbor-mh1') || null;

    case 'mole':
      // MOLE defaults to Arbor MH2 (Size 2)
      return LASER_HEADS.find((h) => h.id === 'arbor-mh2') || null;

    default:
      // For unknown ships, try to find a laser matching the ship's max size
      return LASER_HEADS.find(
        (h) => h.size === ship.maxLaserSize && h.id !== 'none' && h.id !== 'pitman'
      ) || null;
  }
}

/**
 * Creates an empty laser configuration with null values.
 */
function createEmptyLaserConfig(): LaserConfiguration {
  return {
    laserHead: null,
    modules: [],
    moduleActive: [],
    isManned: true,
  };
}

/**
 * Creates an empty mining configuration for a ship with the given number of laser slots.
 */
export function createEmptyConfig(laserSlots: number): MiningConfiguration {
  return {
    lasers: Array(laserSlots).fill(null).map(() => createEmptyLaserConfig()),
  };
}

/**
 * Initializes a mining configuration with default lasers for the given ship.
 * This is the main function to call when switching ships.
 *
 * @param ship - The ship to initialize defaults for
 * @returns A MiningConfiguration with appropriate default lasers
 */
export function initializeDefaultLasersForShip(ship: Ship): MiningConfiguration {
  const config = createEmptyConfig(ship.laserSlots);
  const defaultLaser = getDefaultLaserForShip(ship);

  if (!defaultLaser) {
    return config;
  }

  // Initialize each laser slot with the default laser
  config.lasers.forEach((laser) => {
    laser.laserHead = defaultLaser;
    laser.modules = Array(defaultLaser.moduleSlots).fill(null);
    laser.moduleActive = Array(defaultLaser.moduleSlots).fill(false);
    laser.isManned = true; // All lasers start as manned by default
  });

  return config;
}
