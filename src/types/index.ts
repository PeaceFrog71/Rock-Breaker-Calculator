// Mining equipment types and interfaces

export interface LaserHead {
  id: string;
  name: string;
  maxPower: number; // Base power output
  resistModifier: number; // Effect on rock resistance (0.7 = reduces by 30%)
  size: 1 | 2; // Size 1 or Size 2
  moduleSlots: number; // Number of module slots (Size 1 = 3, Size 2 = 2)
}

export interface Module {
  id: string;
  name: string;
  powerModifier: number; // Multiplier for laser power (1.25 = +25% power)
  resistModifier: number; // Effect on rock resistance
  category: 'power' | 'resist' | 'stability' | 'utility';
}

export interface Gadget {
  id: string;
  name: string;
  resistModifier: number; // Effect on rock resistance
  description: string;
}

export interface LaserConfiguration {
  laserHead: LaserHead | null;
  modules: (Module | null)[]; // Up to 3 modules
  isManned?: boolean; // For MOLE - whether this laser position is manned
}

export interface MiningConfiguration {
  lasers: LaserConfiguration[]; // Multiple lasers (1-6 depending on ship)
  gadgets: (Gadget | null)[]; // Up to 3 gadgets
}

export interface Ship {
  id: string;
  name: string;
  laserSlots: number; // Number of mining lasers the ship can equip
  maxLaserSize: 1 | 2; // Maximum laser size the ship can equip (1 or 2)
  minLaserSize?: 1 | 2; // Minimum laser size (optional - for ships that only accept specific sizes)
  description: string;
}

export interface Rock {
  mass: number;
  resistance: number;
  instability?: number; // For future use
  name?: string;
}

export interface CalculationResult {
  totalLaserPower: number;
  totalResistModifier: number;
  adjustedResistance: number;
  baseLPNeeded: number;
  adjustedLPNeeded: number;
  canBreak: boolean;
  powerMargin: number; // How much power over/under required
  powerMarginPercent: number;
}

// Mining Group types for multi-ship operations
export interface ShipInstance {
  id: string; // Unique ID for this ship instance
  ship: Ship; // The ship type (Prospector, MOLE, GOLEM)
  name: string; // Custom name for this ship instance (e.g., "Ship 1", "Mining Lead")
  config: MiningConfiguration; // Laser configuration for this ship (no gadgets)
  position?: number; // Position around the rock (0, 45, 90, 135, 180, 225, 270, 315 degrees)
  isActive?: boolean; // Whether this ship is currently active (laser on)
}

export interface MiningGroup {
  ships: ShipInstance[]; // Array of ships in the mining pool (max 4)
  gadgets: (Gadget | null)[]; // Up to 3 gadgets for the entire group
}

// Ship presets
export const SHIPS: Ship[] = [
  { id: 'prospector', name: 'MISC Prospector', laserSlots: 1, maxLaserSize: 1, description: 'Solo mining ship - Size 1 lasers only' },
  { id: 'mole', name: 'Argo MOLE', laserSlots: 3, maxLaserSize: 2, minLaserSize: 2, description: 'Multi-crew mining ship - Size 2 lasers only' },
  { id: 'golem', name: 'Drake GOLEM', laserSlots: 1, maxLaserSize: 1, description: 'Heavy mining vehicle - Fixed Pitman laser' },
];

// Laser heads database
export const LASER_HEADS: LaserHead[] = [
  { id: 'none', name: '---', maxPower: 0, resistModifier: 1, size: 1, moduleSlots: 0 },
  { id: 'pitman', name: 'Pitman', maxPower: 3150, resistModifier: 1.25, size: 1, moduleSlots: 2 },
  { id: 'arbor-mh1', name: 'Arbor MH1', maxPower: 1890, resistModifier: 1.25, size: 1, moduleSlots: 1 },
  { id: 'arbor-mh2', name: 'Arbor MH2', maxPower: 2400, resistModifier: 1.25, size: 2, moduleSlots: 2 },
  { id: 'helix-1', name: 'Helix I', maxPower: 3150, resistModifier: 0.7, size: 1, moduleSlots: 2 },
  { id: 'helix-2', name: 'Helix II', maxPower: 4080, resistModifier: 0.7, size: 2, moduleSlots: 3 },
  { id: 'hofstede-s1', name: 'Hofstede-S1', maxPower: 2100, resistModifier: 0.7, size: 1, moduleSlots: 1 },
  { id: 'hofstede-s2', name: 'Hofstede-S2', maxPower: 3360, resistModifier: 0.7, size: 2, moduleSlots: 2 },
  { id: 'impact-1', name: 'Impact I', maxPower: 2100, resistModifier: 1.1, size: 1, moduleSlots: 2 },
  { id: 'impact-2', name: 'Impact II', maxPower: 3360, resistModifier: 1.1, size: 2, moduleSlots: 3 },
  { id: 'klein-s1', name: 'Klein-S1', maxPower: 2220, resistModifier: 0.55, size: 1, moduleSlots: 0 },
  { id: 'klein-s2', name: 'Klein-S2', maxPower: 3600, resistModifier: 0.55, size: 2, moduleSlots: 1 },
  { id: 'lancet-mh1', name: 'Lancet MH1', maxPower: 2520, resistModifier: 1.0, size: 1, moduleSlots: 1 },
  { id: 'lancet-mh2', name: 'Lancet MH2', maxPower: 3600, resistModifier: 1.0, size: 2, moduleSlots: 2 },
];

// Modules database
export const MODULES: Module[] = [
  { id: 'none', name: '---', powerModifier: 1, resistModifier: 1, category: 'utility' },
  { id: 'brandt', name: 'Brandt', powerModifier: 1.35, resistModifier: 1.15, category: 'power' },
  { id: 'forel', name: 'Forel', powerModifier: 1.0, resistModifier: 1.15, category: 'resist' },
  { id: 'lifeline', name: 'Lifeline', powerModifier: 1.0, resistModifier: 0.85, category: 'resist' },
  { id: 'optimum', name: 'Optimum', powerModifier: 0.85, resistModifier: 1.0, category: 'stability' },
  { id: 'rime', name: 'Rime', powerModifier: 0.85, resistModifier: 0.75, category: 'stability' },
  { id: 'stampede', name: 'Stampede', powerModifier: 1.35, resistModifier: 1.0, category: 'power' },
  { id: 'surge', name: 'Surge', powerModifier: 1.5, resistModifier: 0.85, category: 'power' },
  { id: 'torpid', name: 'Torpid', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'fltr', name: 'FLTR', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'fltr-l', name: 'FLTR-L', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'fltr-xl', name: 'FLTR-XL', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'focus', name: 'Focus', powerModifier: 0.85, resistModifier: 1.0, category: 'stability' },
  { id: 'focus-2', name: 'Focus II', powerModifier: 0.9, resistModifier: 1.0, category: 'stability' },
  { id: 'focus-3', name: 'Focus III', powerModifier: 0.95, resistModifier: 1.0, category: 'stability' },
  { id: 'rieger', name: 'Rieger', powerModifier: 1.15, resistModifier: 1.0, category: 'power' },
  { id: 'rieger-c2', name: 'Rieger-C2', powerModifier: 1.2, resistModifier: 1.0, category: 'power' },
  { id: 'rieger-c3', name: 'Rieger-C3', powerModifier: 1.25, resistModifier: 1.0, category: 'power' },
  { id: 'torrent', name: 'Torrent', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'torrent-2', name: 'Torrent II', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'torrent-3', name: 'Torrent III', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'vaux', name: 'Vaux', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'vaux-c2', name: 'Vaux-C2', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'vaux-c3', name: 'Vaux-C3', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'xtr', name: 'XTR', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'xtr-l', name: 'XTR-L', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
  { id: 'xtr-xl', name: 'XTR-XL', powerModifier: 1.0, resistModifier: 1.0, category: 'utility' },
];

// Gadgets database
export const GADGETS: Gadget[] = [
  { id: 'none', name: '---', resistModifier: 1, description: 'No gadget' },
  { id: 'boremax', name: 'BoreMax', resistModifier: 1.1, description: 'Increases resistance (harder)' },
  { id: 'okunis', name: 'Okunis', resistModifier: 1.0, description: 'Neutral effect' },
  { id: 'optimax', name: 'OptiMax', resistModifier: 0.7, description: 'Reduces resistance by 30%' },
  { id: 'sabir', name: 'Sabir', resistModifier: 0.5, description: 'Reduces resistance by 50%' },
  { id: 'stalwart', name: 'Stalwart', resistModifier: 1.0, description: 'Neutral effect' },
  { id: 'waveshift', name: 'Waveshift', resistModifier: 1.0, description: 'Neutral effect' },
];

// Helper function to get gadget symbol
export function getGadgetSymbol(gadgetId: string): string {
  const symbolMap: { [key: string]: string } = {
    'boremax': 'B',
    'okunis': 'O',
    'optimax': 'Op',
    'sabir': 'S',
    'stalwart': 'St',
    'waveshift': 'W',
  };
  return symbolMap[gadgetId] || '';
}
