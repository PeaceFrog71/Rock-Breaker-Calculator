import type { SavedShipConfig } from '../utils/storage';
import { SHIPS, LASER_HEADS, MODULES } from '../types';

// Equipment lookups — uses real data so tests catch any data drift
const pitman = LASER_HEADS.find(l => l.id === 'pitman')!;
const helix1 = LASER_HEADS.find(l => l.id === 'helix-1')!;
const helix2 = LASER_HEADS.find(l => l.id === 'helix-2')!;
const hofstedeS2 = LASER_HEADS.find(l => l.id === 'hofstede-s2')!;
const riegerC3 = MODULES.find(m => m.id === 'rieger-c3')!;
const focus3 = MODULES.find(m => m.id === 'focus-3')!;
const torrent3 = MODULES.find(m => m.id === 'torrent-3')!;

const golem = SHIPS.find(s => s.id === 'golem')!;
const prospector = SHIPS.find(s => s.id === 'prospector')!;
const mole = SHIPS.find(s => s.id === 'mole')!;

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
