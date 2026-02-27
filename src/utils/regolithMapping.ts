import { SHIPS, LASER_HEADS, MODULES } from '../types';
import type { Ship, LaserHead, Module, LaserConfiguration, MiningConfiguration } from '../types';

/**
 * Regolith loadout types (from profile.loadouts query)
 */
export interface RegolithActiveLaser {
  laser: string;
  laserActive: boolean;
  modules: string[];
  modulesActive: boolean[];
}

export interface RegolithLoadout {
  loadoutId: string;
  name: string;
  ship: string; // "PROSPECTOR" | "MOLE" | "GOLEM" | "ROC"
  activeLasers: RegolithActiveLaser[];
}

/**
 * Result of mapping a Regolith loadout to Rock Breaker types.
 */
export interface LoadoutMappingResult {
  ship: Ship;
  config: MiningConfiguration;
  name: string;
  unmapped: string[]; // Equipment names that couldn't be matched
}

// ── Explicit laser mapping (Regolith PascalCase enum → Rock Breaker kebab-case ID) ──

const LASER_MAP: Record<string, string> = {
  'ArborMH1': 'arbor-mh1',
  'ArborMH2': 'arbor-mh2',
  'HelixI': 'helix-1',
  'HelixII': 'helix-2',
  'HofstedeS1': 'hofstede-s1',
  'HofstedeS2': 'hofstede-s2',
  'ImpactI': 'impact-1',
  'ImpactII': 'impact-2',
  'KleinS1': 'klein-s1',
  'KleinS2': 'klein-s2',
  'LancetMH1': 'lancet-mh1',
  'LancetMH2': 'lancet-mh2',
  'Pitman': 'pitman',
};

// ── Ship mapping ──

const SHIP_MAP: Record<string, string> = {
  'PROSPECTOR': 'prospector',
  'MOLE': 'mole',
  'GOLEM': 'golem',
};

// ── Fuzzy normalize for module matching ──

/**
 * Normalize a name for fuzzy matching: lowercase, strip hyphens/underscores/spaces.
 * "RiegerC3" → "riegerc3", "rieger-c3" → "riegerc3", "Focus II" → "focusii"
 */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[-_\s]+/g, '');
}

/**
 * Look up a laser head by Regolith enum name.
 */
export function mapLaserHead(regolithName: string): LaserHead | null {
  const id = LASER_MAP[regolithName];
  if (id) {
    return LASER_HEADS.find(lh => lh.id === id) ?? null;
  }
  return null;
}

/**
 * Look up a module by Regolith name using fuzzy matching.
 */
export function mapModule(regolithName: string): Module | null {
  const norm = normalize(regolithName);

  // Try normalized ID match
  const byId = MODULES.find(m => m.id !== 'none' && normalize(m.id) === norm);
  if (byId) return byId;

  // Try normalized name match
  const byName = MODULES.find(m => m.id !== 'none' && normalize(m.name) === norm);
  if (byName) return byName;

  return null;
}

/**
 * Look up a ship by Regolith enum name.
 */
export function mapShip(regolithName: string): Ship | null {
  const id = SHIP_MAP[regolithName];
  if (id) {
    return SHIPS.find(s => s.id === id) ?? null;
  }
  return null;
}

/**
 * Map a complete Regolith loadout to Rock Breaker Ship + MiningConfiguration.
 * Returns null if the ship type is unsupported (e.g., ROC).
 */
export function mapRegolithLoadout(loadout: RegolithLoadout): LoadoutMappingResult | null {
  const ship = mapShip(loadout.ship);
  if (!ship) return null;

  const unmapped: string[] = [];

  // Build laser configurations
  const lasers: LaserConfiguration[] = [];

  for (let i = 0; i < ship.laserSlots; i++) {
    const regolithLaser = loadout.activeLasers[i];

    if (!regolithLaser) {
      // No laser data for this slot — leave empty
      lasers.push({
        laserHead: null,
        modules: [],
      });
      continue;
    }

    // Map laser head
    let laserHead = mapLaserHead(regolithLaser.laser);
    if (!laserHead) {
      // GOLEM always uses Pitman regardless of what Regolith says
      if (ship.id === 'golem') {
        laserHead = LASER_HEADS.find(lh => lh.id === 'pitman') ?? null;
      } else {
        unmapped.push(regolithLaser.laser);
      }
    }

    // Map modules (respect slot count from the laser head)
    const maxModules = laserHead?.moduleSlots ?? 0;
    const modules: (Module | null)[] = [];
    const moduleActive: boolean[] = [];

    for (let j = 0; j < maxModules; j++) {
      const regolithModuleName = regolithLaser.modules[j];
      if (!regolithModuleName) {
        modules.push(null);
        moduleActive.push(false);
        continue;
      }

      const mod = mapModule(regolithModuleName);
      if (mod) {
        modules.push(mod);
        // For active modules, use Regolith's activation state
        // For passive modules, they're always active (moduleActive doesn't matter for passive)
        moduleActive.push(regolithLaser.modulesActive[j] ?? false);
      } else {
        unmapped.push(regolithModuleName);
        modules.push(null);
        moduleActive.push(false);
      }
    }

    // Warn if Regolith has more modules than slots allow
    if (regolithLaser.modules.length > maxModules) {
      for (let j = maxModules; j < regolithLaser.modules.length; j++) {
        if (regolithLaser.modules[j]) {
          unmapped.push(`${regolithLaser.modules[j]} (no slot)`);
        }
      }
    }

    lasers.push({
      laserHead,
      modules,
      moduleActive,
      isManned: regolithLaser.laserActive,
    });
  }

  return {
    ship,
    config: { lasers },
    name: loadout.name,
    unmapped,
  };
}
