/**
 * Laser Helper Utilities
 *
 * Centralizes laser status checks and geometry calculations used in
 * ResultDisplay for rendering laser beams.
 */

import type { MiningConfiguration, MiningGroup, LaserConfiguration } from '../types';

/**
 * Get all manned lasers from a mining configuration.
 * A laser is considered "manned" if it has a laser head configured and isManned is not false.
 */
export function getMannedLasers(config: MiningConfiguration | undefined): LaserConfiguration[] {
  if (!config) return [];
  return config.lasers.filter(
    (laser) =>
      laser.laserHead &&
      laser.laserHead.id !== 'none' &&
      laser.isManned !== false
  );
}

/**
 * Get the count of manned lasers.
 */
export function getMannedLaserCount(config: MiningConfiguration | undefined): number {
  return getMannedLasers(config).length;
}

/**
 * Calculate the laser length scale factor based on rock mass.
 * - Small rocks (< 50,000 mass): Scale up by 2% (1.02)
 * - Larger rocks: Scale down by 20% (0.8)
 */
export function getLaserLengthScale(rockMass: number): number {
  return rockMass < 50000 ? 1.02 : 0.8;
}

/**
 * Calculate scaled laser endpoint coordinates.
 */
export function calculateLaserEndpoint(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  rockMass: number
): { x: number; y: number } {
  const fullDX = targetX - startX;
  const fullDY = targetY - startY;
  const scale = getLaserLengthScale(rockMass);
  return {
    x: startX + fullDX * scale,
    y: startY + fullDY * scale,
  };
}

/**
 * Calculate the angle spread for MOLE lasers based on rock mass.
 * - Small rocks (< 50,000 mass): ±4°
 * - Larger rocks: ±8°
 */
export function getLaserAngleSpread(rockMass: number): number {
  return rockMass < 50000 ? 4 : 8;
}

/**
 * Calculate angle offsets for MOLE lasers.
 * - 1 laser: [0] (center only)
 * - 2 lasers: [0, -spread] (center, upper)
 * - 3 lasers: [0, -spread, spread] (center, upper, lower)
 *
 * @param numLasers - Number of manned lasers (1-3)
 * @param rockMass - Rock mass to determine spread
 * @returns Array of angle offsets in degrees
 */
export function calculateMoleLaserAngleOffsets(numLasers: number, rockMass: number): number[] {
  if (numLasers <= 0) return [];

  const angleSpread = getLaserAngleSpread(rockMass);

  if (numLasers === 1) {
    return [0];
  } else if (numLasers === 2) {
    return [0, -angleSpread];
  } else {
    return [0, -angleSpread, angleSpread];
  }
}

/**
 * Calculate Y offset for an angled laser beam.
 *
 * @param angleOffset - Angle in degrees
 * @param laserLength - Distance from ship to rock center
 * @returns Y offset to apply to laser endpoint
 */
export function calculateLaserYOffset(angleOffset: number, laserLength: number): number {
  const angleRad = (angleOffset * Math.PI) / 180;
  return Math.tan(angleRad) * laserLength;
}

/**
 * Optimal distance info for a single active laser.
 */
export interface LaserDistanceInfo {
  laserName: string;
  shipName?: string;
  laserIndex: number;
  minDistance: number;
  maxDistance: number;
}

/**
 * Get optimal distance ranges for all active lasers in a single-ship config.
 * Filters out 'none' lasers, unmanned MOLE lasers, and lasers without distance data.
 */
export function getActiveLaserDistances(
  config: MiningConfiguration,
  shipId: string
): LaserDistanceInfo[] {
  const distances: LaserDistanceInfo[] = [];
  config.lasers.forEach((laser, index) => {
    if (!laser.laserHead || laser.laserHead.id === 'none') return;
    if (shipId === 'mole' && laser.isManned === false) return;
    if (laser.laserHead.optimalDistanceMin == null || laser.laserHead.optimalDistanceMax == null) return;
    if (laser.laserHead.optimalDistanceMin === 0 && laser.laserHead.optimalDistanceMax === 0) return;
    distances.push({
      laserName: laser.laserHead.name,
      laserIndex: index,
      minDistance: laser.laserHead.optimalDistanceMin,
      maxDistance: laser.laserHead.optimalDistanceMax,
    });
  });
  return distances;
}

/**
 * Get optimal distance ranges for all active lasers across a mining group.
 * Filters out inactive ships, 'none' lasers, and unmanned MOLE lasers.
 */
export function getGroupLaserDistances(
  miningGroup: MiningGroup
): LaserDistanceInfo[] {
  const distances: LaserDistanceInfo[] = [];
  miningGroup.ships.forEach((shipInstance) => {
    if (shipInstance.isActive === false) return;
    shipInstance.config.lasers.forEach((laser, index) => {
      if (!laser.laserHead || laser.laserHead.id === 'none') return;
      if (shipInstance.ship.id === 'mole' && laser.isManned === false) return;
      if (laser.laserHead.optimalDistanceMin == null || laser.laserHead.optimalDistanceMax == null) return;
      if (laser.laserHead.optimalDistanceMin === 0 && laser.laserHead.optimalDistanceMax === 0) return;
      distances.push({
        laserName: laser.laserHead.name,
        shipName: shipInstance.name,
        laserIndex: index,
        minDistance: laser.laserHead.optimalDistanceMin,
        maxDistance: laser.laserHead.optimalDistanceMax,
      });
    });
  });
  return distances;
}
