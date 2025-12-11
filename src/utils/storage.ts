import type { MiningConfiguration, Ship, MiningGroup, ShipInstance } from '../types';

// Unified ship library (replaces both single configs and ship pool)
const SHIP_LIBRARY_KEY = 'rock-breaker-ship-library';
const CURRENT_CONFIG_KEY = 'rock-breaker-current';
const MINING_GROUPS_KEY = 'rock-breaker-mining-groups';

// Legacy keys for migration
const LEGACY_CONFIGS_KEY = 'rock-breaker-configs';
const LEGACY_SHIP_POOL_KEY = 'rock-breaker-ship-pool';

export interface SavedShipConfig {
  id: string;
  name: string;
  ship: Ship;
  config: MiningConfiguration;
  createdAt: number;
  updatedAt: number;
}

export interface SavedMiningGroup {
  id: string;
  name: string;
  miningGroup: MiningGroup; // Contains full ShipInstance data (no references)
  createdAt: number;
  updatedAt: number;
}

// Legacy interface for backward compatibility
export interface SavedConfiguration extends SavedShipConfig {}

/**
 * Migrate legacy data to unified ship library (runs automatically)
 */
function migrateLegacyData(): void {
  try {
    const shipLibrary = localStorage.getItem(SHIP_LIBRARY_KEY);
    if (shipLibrary) return; // Already migrated

    const ships: SavedShipConfig[] = [];

    // Migrate old single ship configs
    const legacyConfigs = localStorage.getItem(LEGACY_CONFIGS_KEY);
    if (legacyConfigs) {
      const configs: SavedConfiguration[] = JSON.parse(legacyConfigs);
      ships.push(...configs);
    }

    // Migrate old ship pool instances
    const legacyPool = localStorage.getItem(LEGACY_SHIP_POOL_KEY);
    if (legacyPool) {
      const pool = JSON.parse(legacyPool);
      pool.forEach((savedInstance: any) => {
        const instance: ShipInstance = savedInstance.shipInstance;
        ships.push({
          id: savedInstance.id,
          name: savedInstance.name,
          ship: instance.ship,
          config: instance.config,
          createdAt: savedInstance.createdAt,
          updatedAt: savedInstance.updatedAt,
        });
      });
    }

    if (ships.length > 0) {
      localStorage.setItem(SHIP_LIBRARY_KEY, JSON.stringify(ships));
    }
  } catch (error) {
    console.error('Error migrating legacy data:', error);
  }
}

// ===== UNIFIED SHIP LIBRARY =====

/**
 * Get all saved ship configurations from unified library
 */
export function getSavedShipConfigs(): SavedShipConfig[] {
  migrateLegacyData(); // Auto-migrate on first access
  try {
    const data = localStorage.getItem(SHIP_LIBRARY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading ship library:', error);
    return [];
  }
}

/**
 * Save a new ship configuration to library
 */
export function saveShipConfig(
  name: string,
  ship: Ship,
  config: MiningConfiguration
): SavedShipConfig {
  const ships = getSavedShipConfigs();

  const newShip: SavedShipConfig = {
    id: Date.now().toString(),
    name,
    ship,
    config,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  ships.push(newShip);
  localStorage.setItem(SHIP_LIBRARY_KEY, JSON.stringify(ships));

  return newShip;
}

/**
 * Update an existing ship configuration
 */
export function updateShipConfig(
  id: string,
  name: string,
  ship: Ship,
  config: MiningConfiguration
): SavedShipConfig | null {
  const ships = getSavedShipConfigs();
  const index = ships.findIndex((s) => s.id === id);

  if (index === -1) return null;

  ships[index] = {
    ...ships[index],
    name,
    ship,
    config,
    updatedAt: Date.now(),
  };

  localStorage.setItem(SHIP_LIBRARY_KEY, JSON.stringify(ships));
  return ships[index];
}

/**
 * Delete a ship configuration
 */
export function deleteShipConfig(id: string): boolean {
  const ships = getSavedShipConfigs();
  const filtered = ships.filter((s) => s.id !== id);

  if (filtered.length === ships.length) return false;

  localStorage.setItem(SHIP_LIBRARY_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Load a ship configuration by ID
 */
export function loadShipConfig(id: string): SavedShipConfig | null {
  const ships = getSavedShipConfigs();
  return ships.find((s) => s.id === id) || null;
}

// ===== LEGACY FUNCTIONS (for backward compatibility) =====

/**
 * @deprecated Use getSavedShipConfigs() instead
 */
export function getSavedConfigurations(): SavedConfiguration[] {
  return getSavedShipConfigs();
}

/**
 * @deprecated Use saveShipConfig() instead
 */
export function saveConfiguration(
  name: string,
  ship: Ship,
  config: MiningConfiguration
): SavedConfiguration {
  return saveShipConfig(name, ship, config);
}

/**
 * @deprecated Use updateShipConfig() instead
 */
export function updateConfiguration(
  id: string,
  name: string,
  ship: Ship,
  config: MiningConfiguration
): SavedConfiguration | null {
  return updateShipConfig(id, name, ship, config);
}

/**
 * @deprecated Use deleteShipConfig() instead
 */
export function deleteConfiguration(id: string): boolean {
  return deleteShipConfig(id);
}

/**
 * @deprecated Use loadShipConfig() instead
 */
export function loadConfiguration(id: string): SavedConfiguration | null {
  return loadShipConfig(id);
}

/**
 * Save current configuration (auto-save)
 */
export function saveCurrentConfiguration(ship: Ship, config: MiningConfiguration): void {
  try {
    const data = {
      ship,
      config,
      timestamp: Date.now(),
    };
    localStorage.setItem(CURRENT_CONFIG_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving current configuration:', error);
  }
}

/**
 * Load current configuration (auto-save)
 */
export function loadCurrentConfiguration(): { ship: Ship; config: MiningConfiguration } | null {
  try {
    const data = localStorage.getItem(CURRENT_CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading current configuration:', error);
    return null;
  }
}

/**
 * Export ship configuration as JSON file
 */
export function exportShipConfig(savedConfig: SavedShipConfig): void {
  const dataStr = JSON.stringify(savedConfig, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${savedConfig.name.replace(/[^a-z0-9]/gi, '_')}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Import ship configuration from JSON file
 */
export function importShipConfig(file: File): Promise<SavedShipConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const newConfig = saveShipConfig(
          imported.name || 'Imported Ship',
          imported.ship,
          imported.config
        );
        resolve(newConfig);
      } catch (error) {
        reject(new Error('Invalid configuration file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * @deprecated Use exportShipConfig() instead
 */
export function exportConfiguration(savedConfig: SavedConfiguration): void {
  exportShipConfig(savedConfig);
}

/**
 * @deprecated Use importShipConfig() instead
 */
export function importConfiguration(file: File): Promise<SavedConfiguration> {
  return importShipConfig(file);
}

// ===== MINING GROUP STORAGE =====

/**
 * Get all saved mining groups
 */
export function getSavedMiningGroups(): SavedMiningGroup[] {
  try {
    const data = localStorage.getItem(MINING_GROUPS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading saved mining groups:', error);
    return [];
  }
}

/**
 * Save a new mining group
 */
export function saveMiningGroup(name: string, miningGroup: MiningGroup): SavedMiningGroup {
  const groups = getSavedMiningGroups();

  const newGroup: SavedMiningGroup = {
    id: Date.now().toString(),
    name,
    miningGroup,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  groups.push(newGroup);
  localStorage.setItem(MINING_GROUPS_KEY, JSON.stringify(groups));

  return newGroup;
}

/**
 * Update an existing mining group
 */
export function updateMiningGroup(
  id: string,
  name: string,
  miningGroup: MiningGroup
): SavedMiningGroup | null {
  const groups = getSavedMiningGroups();
  const index = groups.findIndex((g) => g.id === id);

  if (index === -1) return null;

  groups[index] = {
    ...groups[index],
    name,
    miningGroup,
    updatedAt: Date.now(),
  };

  localStorage.setItem(MINING_GROUPS_KEY, JSON.stringify(groups));
  return groups[index];
}

/**
 * Delete a mining group
 */
export function deleteMiningGroup(id: string): boolean {
  const groups = getSavedMiningGroups();
  const filtered = groups.filter((g) => g.id !== id);

  if (filtered.length === groups.length) return false;

  localStorage.setItem(MINING_GROUPS_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Load a mining group by ID
 */
export function loadMiningGroup(id: string): SavedMiningGroup | null {
  const groups = getSavedMiningGroups();
  return groups.find((g) => g.id === id) || null;
}

// ===== HELPER FUNCTIONS =====

/**
 * Create a ShipInstance from a SavedShipConfig (for adding to mining groups)
 * This creates a copy - changes to the group won't affect the library
 */
export function createShipInstanceFromConfig(savedConfig: SavedShipConfig, customName?: string): ShipInstance {
  return {
    id: Date.now().toString() + Math.random(), // Unique ID for this instance
    ship: savedConfig.ship,
    name: customName || savedConfig.name,
    config: JSON.parse(JSON.stringify(savedConfig.config)), // Deep copy to break reference
    isActive: true,
  };
}
