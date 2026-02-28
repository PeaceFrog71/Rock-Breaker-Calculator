import type { SavedShipConfig } from '../utils/storage';
import { SHIPS, LASER_HEADS, MODULES } from '../types';

/** Look up an item by ID with a clear error if missing (catches data drift at startup). */
function requireById<T extends { id: string }>(items: T[], itemType: string, id: string): T {
  const item = items.find(i => i.id === id);
  if (!item) {
    throw new Error(
      `Missing ${itemType} '${id}' required by starterConfigs. Check that the ID exists in the reference data.`
    );
  }
  return item;
}

// Equipment lookups — uses real data so tests catch any data drift
const pitman = requireById(LASER_HEADS, 'laser head', 'pitman');
const helix1 = requireById(LASER_HEADS, 'laser head', 'helix-1');
const helix2 = requireById(LASER_HEADS, 'laser head', 'helix-2');
const hofstedeS2 = requireById(LASER_HEADS, 'laser head', 'hofstede-s2');
const riegerC3 = requireById(MODULES, 'module', 'rieger-c3');
const focus3 = requireById(MODULES, 'module', 'focus-3');
const torrent3 = requireById(MODULES, 'module', 'torrent-3');

const golem = requireById(SHIPS, 'ship', 'golem');
const prospector = requireById(SHIPS, 'ship', 'prospector');
const mole = requireById(SHIPS, 'ship', 'mole');

/**
 * Starter ship configurations for new miners.
 * These appear in every user's Ship Library and cannot be deleted.
 *
 * Built from Drew's recommended builds (exported from ref data/Starter Ships/).
 * Uses real equipment references so data changes propagate automatically.
 */
export const STARTER_CONFIGS: SavedShipConfig[] = [
  {
    id: 'starter-golem',
    name: 'New Miner Golem',
    ship: golem,
    config: {
      lasers: [
        {
          laserHead: pitman,
          modules: [riegerC3, focus3],
          moduleActive: [false, false],
          isManned: true,
        },
      ],
    },
    isStarter: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'starter-prospector',
    name: 'New Miner Prospector',
    ship: prospector,
    config: {
      lasers: [
        {
          laserHead: helix1,
          modules: [focus3, riegerC3],
          moduleActive: [false, false],
          isManned: true,
        },
      ],
    },
    isStarter: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'starter-mole',
    name: 'New Miner Mole',
    ship: mole,
    config: {
      lasers: [
        {
          laserHead: helix2,
          modules: [riegerC3, riegerC3, focus3],
          moduleActive: [true, true, false],
          isManned: false,
        },
        {
          laserHead: hofstedeS2,
          modules: [focus3, torrent3],
          moduleActive: [false, false],
          isManned: false,
        },
        {
          laserHead: hofstedeS2,
          modules: [riegerC3, riegerC3],
          moduleActive: [false, false],
          isManned: true,
        },
      ],
    },
    isStarter: true,
    createdAt: 0,
    updatedAt: 0,
  },
];
