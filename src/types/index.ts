// Mining equipment types and interfaces

export interface LaserHead {
  id: string;
  name: string;
  maxPower: number; // Base power output
  resistModifier: number; // Effect on rock resistance (0.7 = reduces by 30%)
  size: 0 | 1 | 2; // Size 0 (bespoke), Size 1 or Size 2
  moduleSlots: number; // Number of module slots
  instabilityModifier?: number; // Laser Instability modifier (0.65 = -35%, 1.35 = +35%)
  chargeRateModifier?: number; // Optimal Charge Rate (1.2 = +20%, 0.6 = -40%)
  chargeWindowModifier?: number; // Optimal Charge Window (1.4 = +40%, 0.6 = -40%)
  inertMaterialsModifier?: number; // Inert Materials (0.7 = -30%, 0.6 = -40%)
}

export interface Module {
  id: string;
  name: string;
  powerModifier: number; // Mining Laser Power multiplier (1.35 = +35%)
  resistModifier: number; // Resistance modifier (1.15 = +15%, 0.85 = -15%)
  instabilityModifier?: number; // Laser Instability modifier (0.8 = -20%, 1.1 = +10%)
  chargeWindowModifier?: number; // Optimal Charge Window (1.3 = +30%)
  chargeRateModifier?: number; // Optimal Charge Rate (1.3 = +30%)
  overchargeRateModifier?: number; // Overcharge Rate (0.4 = -60%)
  shatterDamageModifier?: number; // Shatter Damage (0.7 = -30%)
  extractionPowerModifier?: number; // Extraction Laser Power (1.5 = +50%)
  inertMaterialsModifier?: number; // Inert Materials (0.8 = -20%)
  clusterModifier?: number; // Cluster Modifier (1.3 = +30%)
  category: 'active' | 'passive';
  duration?: string; // Duration for active modules (e.g., "60s")
  uses?: number; // Number of uses for active modules
}

export interface Gadget {
  id: string;
  name: string;
  resistModifier: number; // Effect on rock resistance (1.1 = +10%, 0.5 = -50%)
  instabilityModifier?: number; // Effect on instability (0.65 = -35%, 1.15 = +15%)
  chargeWindowModifier?: number; // Effect on optimal charge window (1.5 = +50%, 0.7 = -30%)
  chargeRateModifier?: number; // Effect on charge rate (1.5 = +50%, 0.7 = -30%)
  clusterModifier?: number; // Effect on clustering (1.6 = +60%, 0.8 = -20%)
  description: string;
}

export interface LaserConfiguration {
  laserHead: LaserHead | null;
  modules: (Module | null)[]; // Up to 3 modules
  moduleActive?: boolean[]; // Track which modules are activated (for active modules)
  isManned?: boolean; // For MOLE - whether this laser position is manned
}

export interface MiningConfiguration {
  lasers: LaserConfiguration[]; // Multiple lasers (1-6 depending on ship)
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
  resistanceMode?: 'base' | 'modified'; // Whether resistance is base (cockpit scan) or modified (laser scan)
  originalScannedValue?: number; // Store the original scanned value for reference
  includeGadgetsInScan?: boolean; // Whether gadgets were active during the scan
  scannedByShipId?: string; // For multi-ship: which ship scanned the rock
  scannedByLaserIndex?: number; // For multi-ship: which laser on that ship
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
  resistanceContext?: {
    derivedBaseValue: number; // The derived base resistance (for modified mode)
    appliedModifier: number; // The total modifier applied
  };
}

// Mining Group types for multi-ship operations
export interface ShipInstance {
  id: string; // Unique ID for this ship instance
  ship: Ship; // The ship type (Prospector, MOLE, GOLEM)
  name: string; // Custom name for this ship instance (e.g., "Ship 1", "Mining Lead")
  config: MiningConfiguration; // Laser configuration for this ship (no gadgets)
  isActive?: boolean; // Whether this ship is currently active (laser on)
}

export interface MiningGroup {
  ships: ShipInstance[]; // Array of ships in the mining pool (max 4)
  name?: string; // Optional name for the group (preserved when loaded from saved configs)
}

// Ship presets
export const SHIPS: Ship[] = [
  { id: 'prospector', name: 'MISC Prospector', laserSlots: 1, maxLaserSize: 1, description: 'Solo mining ship - Size 1 lasers only' },
  { id: 'mole', name: 'Argo MOLE', laserSlots: 3, maxLaserSize: 2, minLaserSize: 2, description: 'Multi-crew mining ship - Size 2 lasers only' },
  { id: 'golem', name: 'Drake GOLEM', laserSlots: 1, maxLaserSize: 1, description: 'Heavy mining vehicle - Fixed Pitman laser' },
];

// Laser heads database - modifiers from RedMonster's Mining Cheatsheet
// Modifier values: 1 = no effect, >1 = increase, <1 = decrease
// e.g., instabilityModifier: 0.65 = -35% instability, chargeWindowModifier: 1.4 = +40% window
export const LASER_HEADS: LaserHead[] = [
  { id: 'none', name: '---', maxPower: 0, resistModifier: 1, size: 1, moduleSlots: 0 },
  { id: 'pitman', name: 'Pitman', maxPower: 3150, resistModifier: 1.25, size: 0, moduleSlots: 2, instabilityModifier: 1.35, chargeRateModifier: 0.6, chargeWindowModifier: 1.4, inertMaterialsModifier: 0.6 },
  { id: 'arbor-mh1', name: 'Arbor MH1', maxPower: 1890, resistModifier: 1.25, size: 1, moduleSlots: 1, instabilityModifier: 0.65, chargeWindowModifier: 1.4, inertMaterialsModifier: 0.7 },
  { id: 'arbor-mh2', name: 'Arbor MH2', maxPower: 2400, resistModifier: 1.25, size: 2, moduleSlots: 2, instabilityModifier: 0.65, chargeWindowModifier: 1.4, inertMaterialsModifier: 0.6 },
  { id: 'helix-1', name: 'Helix I', maxPower: 3150, resistModifier: 0.7, size: 1, moduleSlots: 2, chargeWindowModifier: 0.6, inertMaterialsModifier: 0.7 },
  { id: 'helix-2', name: 'Helix II', maxPower: 4080, resistModifier: 0.7, size: 2, moduleSlots: 3, chargeWindowModifier: 0.6, inertMaterialsModifier: 0.6 },
  { id: 'hofstede-s1', name: 'Hofstede-S1', maxPower: 2100, resistModifier: 0.7, size: 1, moduleSlots: 1, instabilityModifier: 1.1, chargeRateModifier: 1.2, chargeWindowModifier: 1.6, inertMaterialsModifier: 0.7 },
  { id: 'hofstede-s2', name: 'Hofstede-S2', maxPower: 3360, resistModifier: 0.7, size: 2, moduleSlots: 2, instabilityModifier: 1.1, chargeRateModifier: 1.2, chargeWindowModifier: 1.6, inertMaterialsModifier: 0.6 },
  { id: 'impact-1', name: 'Impact I', maxPower: 2100, resistModifier: 1.1, size: 1, moduleSlots: 2, instabilityModifier: 0.9, chargeRateModifier: 0.6, chargeWindowModifier: 1.2, inertMaterialsModifier: 0.7 },
  { id: 'impact-2', name: 'Impact II', maxPower: 3360, resistModifier: 1.1, size: 2, moduleSlots: 3, instabilityModifier: 0.9, chargeRateModifier: 0.6, chargeWindowModifier: 1.2, inertMaterialsModifier: 0.6 },
  { id: 'klein-s1', name: 'Klein-S1', maxPower: 2220, resistModifier: 0.55, size: 1, moduleSlots: 0, instabilityModifier: 1.35, chargeWindowModifier: 1.2, inertMaterialsModifier: 0.7 },
  { id: 'klein-s2', name: 'Klein-S2', maxPower: 3600, resistModifier: 0.55, size: 2, moduleSlots: 1, instabilityModifier: 1.35, chargeWindowModifier: 1.2, inertMaterialsModifier: 0.6 },
  { id: 'lancet-mh1', name: 'Lancet MH1', maxPower: 2520, resistModifier: 1.0, size: 1, moduleSlots: 1, instabilityModifier: 0.9, chargeRateModifier: 1.4, chargeWindowModifier: 0.4, inertMaterialsModifier: 0.7 },
  { id: 'lancet-mh2', name: 'Lancet MH2', maxPower: 3600, resistModifier: 1.0, size: 2, moduleSlots: 2, instabilityModifier: 0.9, chargeRateModifier: 1.4, chargeWindowModifier: 0.4, inertMaterialsModifier: 0.6 },
];

// Modules database - values from RedMonsterSC's Mining Cheatsheet
export const MODULES: Module[] = [
  { id: 'none', name: '---', powerModifier: 1, resistModifier: 1, category: 'passive' },
  // Active Modules
  { id: 'brandt', name: 'Brandt', powerModifier: 1.35, resistModifier: 1.15, shatterDamageModifier: 0.7, category: 'active', duration: '60s', uses: 5 },
  { id: 'forel', name: 'Forel', powerModifier: 1.0, resistModifier: 1.15, overchargeRateModifier: 0.4, extractionPowerModifier: 1.5, category: 'active', duration: '60s', uses: 6 },
  { id: 'lifeline', name: 'Lifeline', powerModifier: 1.0, resistModifier: 0.85, instabilityModifier: 0.8, overchargeRateModifier: 1.6, category: 'active', duration: '15s', uses: 3 },
  { id: 'optimum', name: 'Optimum', powerModifier: 0.85, resistModifier: 1.0, instabilityModifier: 0.9, overchargeRateModifier: 0.2, category: 'active', duration: '60s', uses: 5 },
  { id: 'rime', name: 'Rime', powerModifier: 0.85, resistModifier: 0.75, shatterDamageModifier: 0.9, category: 'active', duration: '20s', uses: 10 },
  { id: 'stampede', name: 'Stampede', powerModifier: 1.35, resistModifier: 1.0, instabilityModifier: 0.9, shatterDamageModifier: 0.9, extractionPowerModifier: 0.85, category: 'active', duration: '30s', uses: 6 },
  { id: 'surge', name: 'Surge', powerModifier: 1.5, resistModifier: 0.85, instabilityModifier: 1.1, category: 'active', duration: '15s', uses: 7 },
  { id: 'torpid', name: 'Torpid', powerModifier: 1.0, resistModifier: 1.0, chargeRateModifier: 1.6, overchargeRateModifier: 0.4, shatterDamageModifier: 1.4, category: 'active', duration: '60s', uses: 5 },
  // Passive Modules
  { id: 'fltr', name: 'FLTR', powerModifier: 1.0, resistModifier: 1.0, extractionPowerModifier: 0.85, inertMaterialsModifier: 0.8, category: 'passive' },
  { id: 'fltr-l', name: 'FLTR-L', powerModifier: 1.0, resistModifier: 1.0, extractionPowerModifier: 0.9, inertMaterialsModifier: 0.77, category: 'passive' },
  { id: 'fltr-xl', name: 'FLTR-XL', powerModifier: 1.0, resistModifier: 1.0, extractionPowerModifier: 0.95, inertMaterialsModifier: 0.76, category: 'passive' },
  { id: 'focus', name: 'Focus', powerModifier: 0.85, resistModifier: 1.0, chargeWindowModifier: 1.3, category: 'passive' },
  { id: 'focus-2', name: 'Focus II', powerModifier: 0.9, resistModifier: 1.0, chargeWindowModifier: 1.37, category: 'passive' },
  { id: 'focus-3', name: 'Focus III', powerModifier: 0.95, resistModifier: 1.0, chargeWindowModifier: 1.4, category: 'passive' },
  { id: 'rieger', name: 'Rieger', powerModifier: 1.15, resistModifier: 1.0, chargeWindowModifier: 0.9, category: 'passive' },
  { id: 'rieger-c2', name: 'Rieger-C2', powerModifier: 1.2, resistModifier: 1.0, chargeWindowModifier: 0.97, category: 'passive' },
  { id: 'rieger-c3', name: 'Rieger-C3', powerModifier: 1.25, resistModifier: 1.0, chargeWindowModifier: 0.99, category: 'passive' },
  { id: 'torrent', name: 'Torrent', powerModifier: 1.0, resistModifier: 1.0, chargeWindowModifier: 0.9, chargeRateModifier: 1.3, category: 'passive' },
  { id: 'torrent-2', name: 'Torrent II', powerModifier: 1.0, resistModifier: 1.0, chargeWindowModifier: 0.97, chargeRateModifier: 1.35, category: 'passive' },
  { id: 'torrent-3', name: 'Torrent III', powerModifier: 1.0, resistModifier: 1.0, chargeWindowModifier: 0.99, chargeRateModifier: 1.4, category: 'passive' },
  { id: 'vaux', name: 'Vaux', powerModifier: 1.0, resistModifier: 1.0, chargeRateModifier: 0.8, extractionPowerModifier: 1.15, category: 'passive' },
  { id: 'vaux-c2', name: 'Vaux-C2', powerModifier: 1.0, resistModifier: 1.0, chargeRateModifier: 0.85, extractionPowerModifier: 1.2, category: 'passive' },
  { id: 'vaux-c3', name: 'Vaux-C3', powerModifier: 1.0, resistModifier: 1.0, chargeRateModifier: 0.95, extractionPowerModifier: 1.25, category: 'passive' },
  { id: 'xtr', name: 'XTR', powerModifier: 1.0, resistModifier: 1.0, chargeWindowModifier: 1.15, extractionPowerModifier: 0.85, inertMaterialsModifier: 0.95, category: 'passive' },
  { id: 'xtr-l', name: 'XTR-L', powerModifier: 1.0, resistModifier: 1.0, chargeWindowModifier: 1.22, extractionPowerModifier: 0.9, inertMaterialsModifier: 0.94, category: 'passive' },
  { id: 'xtr-xl', name: 'XTR-XL', powerModifier: 1.0, resistModifier: 1.0, chargeWindowModifier: 1.25, extractionPowerModifier: 0.95, inertMaterialsModifier: 0.94, category: 'passive' },
];

// Gadgets database - values from RedMonsterSC's Mining Cheatsheet
export const GADGETS: Gadget[] = [
  { id: 'none', name: '---', resistModifier: 1, description: 'No gadget' },
  { id: 'boremax', name: 'BoreMax', resistModifier: 1.1, instabilityModifier: 0.3, clusterModifier: 1.3, description: 'Reduces instability significantly. Increases clustering.' },
  { id: 'okunis', name: 'Okunis', resistModifier: 1.5, chargeWindowModifier: 2.0, clusterModifier: 0.8, description: 'Doubles charge window. Reduces clustering.' },
  { id: 'optimax', name: 'OptiMax', resistModifier: 0.7, instabilityModifier: 0.7, clusterModifier: 1.6, description: 'Reduces resistance and instability. Increases clustering significantly.' },
  { id: 'sabir', name: 'Sabir', resistModifier: 0.5, instabilityModifier: 1.15, chargeWindowModifier: 1.5, description: 'Best resistance reduction. Slightly increases instability.' },
  { id: 'stalwart', name: 'Stalwart', resistModifier: 1.0, instabilityModifier: 0.65, chargeWindowModifier: 0.7, chargeRateModifier: 1.5, clusterModifier: 1.3, description: 'Reduces instability. Increases charge rate and clustering.' },
  { id: 'waveshift', name: 'Waveshift', resistModifier: 1.0, instabilityModifier: 0.65, chargeWindowModifier: 2.0, chargeRateModifier: 0.7, description: 'Doubles charge window. Reduces instability and charge rate.' },
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
