import type { MiningConfiguration, Ship, MiningGroup, ShipInstance } from '../types';
import { STARTER_CONFIGS } from '../data/starterConfigs';

// Unified ship library (replaces both single configs and ship pool)
const SHIP_LIBRARY_KEY = 'rock-breaker-ship-library';
const CURRENT_CONFIG_KEY = 'rock-breaker-current';
const MINING_GROUPS_KEY = 'rock-breaker-mining-groups';
const REGOLITH_API_KEY = 'regolith-api-key';

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
  isStarter?: boolean;
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
 * Get all saved ship configurations from unified library.
 * Starter configs (built into the app) are always prepended to user configs.
 */
export function getSavedShipConfigs(): SavedShipConfig[] {
  migrateLegacyData(); // Auto-migrate on first access
  try {
    const data = localStorage.getItem(SHIP_LIBRARY_KEY);
    const userConfigs: SavedShipConfig[] = data ? JSON.parse(data) : [];
    return [...STARTER_CONFIGS, ...userConfigs];
  } catch (error) {
    console.error('Error loading ship library:', error);
    return [...STARTER_CONFIGS];
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
  // Work with user configs only (starters are not in localStorage)
  const data = localStorage.getItem(SHIP_LIBRARY_KEY);
  const userConfigs: SavedShipConfig[] = data ? JSON.parse(data) : [];

  // Block saving with a starter config name — UI should catch this first
  const isStarterName = STARTER_CONFIGS.some(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (isStarterName) {
    throw new Error('Cannot save with a starter config name. Please choose a different name.');
  }
  const saveName = name;

  // Prevent duplicates: if a user config with the same name exists, update it
  const existingIndex = userConfigs.findIndex(
    (s) => s.name.toLowerCase() === saveName.toLowerCase()
  );

  if (existingIndex !== -1) {
    userConfigs[existingIndex] = {
      ...userConfigs[existingIndex],
      name: saveName,
      ship,
      config,
      updatedAt: Date.now(),
    };
    localStorage.setItem(SHIP_LIBRARY_KEY, JSON.stringify(userConfigs));
    return userConfigs[existingIndex];
  }

  const newShip: SavedShipConfig = {
    id: Date.now().toString(),
    name: saveName,
    ship,
    config,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  userConfigs.push(newShip);
  localStorage.setItem(SHIP_LIBRARY_KEY, JSON.stringify(userConfigs));

  return newShip;
}

/**
 * Update an existing ship configuration.
 * Starter configs cannot be updated.
 */
export function updateShipConfig(
  id: string,
  name: string,
  ship: Ship,
  config: MiningConfiguration
): SavedShipConfig | null {
  // Block updates to starter configs
  if (STARTER_CONFIGS.some(s => s.id === id)) return null;

  // Work with user configs only
  const data = localStorage.getItem(SHIP_LIBRARY_KEY);
  const userConfigs: SavedShipConfig[] = data ? JSON.parse(data) : [];
  const index = userConfigs.findIndex((s) => s.id === id);

  if (index === -1) return null;

  userConfigs[index] = {
    ...userConfigs[index],
    name,
    ship,
    config,
    updatedAt: Date.now(),
  };

  localStorage.setItem(SHIP_LIBRARY_KEY, JSON.stringify(userConfigs));
  return userConfigs[index];
}

/**
 * Delete a ship configuration.
 * Starter configs (isStarter: true) cannot be deleted.
 */
export function deleteShipConfig(id: string): boolean {
  const ships = getSavedShipConfigs();
  const target = ships.find(s => s.id === id);

  // Block deletion of starter configs
  if (target?.isStarter) return false;

  // Only filter user configs (starters aren't in localStorage)
  const data = localStorage.getItem(SHIP_LIBRARY_KEY);
  const userConfigs: SavedShipConfig[] = data ? JSON.parse(data) : [];
  const filtered = userConfigs.filter((s) => s.id !== id);

  if (filtered.length === userConfigs.length) return false;

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
 * Check if File System Access API is available (Chrome, Edge, Opera).
 * When available, users can choose save/open location and the browser caches it.
 */
export function supportsFileSystemAccess(): boolean {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

/**
 * Export ship configuration as JSON file.
 * Uses File System Access API when available (user chooses location, browser caches it).
 * Falls back to download link for unsupported browsers (Firefox, Safari).
 */
export async function exportShipConfig(savedConfig: SavedShipConfig): Promise<void> {
  const dataStr = JSON.stringify(savedConfig, null, 2);

  const safeName = savedConfig.name.replace(/[^a-z0-9]/gi, '_');
  const safeShipName = savedConfig.ship.name.replace(/[^a-z0-9]/gi, '_');
  const filename = `${safeName}_${safeShipName}.json`;

  // Try File System Access API first (user chooses location, browser remembers it)
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        id: 'rockbreaker-ships',
        suggestedName: filename,
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(dataStr);
      await writable.close();
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Fall through to legacy download method
    }
  }

  // Fallback: invisible download link (goes to browser's Downloads folder)
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
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
 * Import ship configuration using File System Access API picker.
 * Browser remembers the last directory used (via id: 'rockbreaker').
 */
export async function importShipConfigWithPicker(): Promise<SavedShipConfig> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fileHandle] = await (window as any).showOpenFilePicker({
    id: 'rockbreaker-ships',
    types: [{
      description: 'JSON Files',
      accept: { 'application/json': ['.json'] },
    }],
  });
  const file = await fileHandle.getFile();
  return importShipConfig(file);
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

  // Prevent duplicates: if a group with the same name exists, update it instead
  const existingIndex = groups.findIndex(
    (g) => g.name.toLowerCase() === name.toLowerCase()
  );

  if (existingIndex !== -1) {
    groups[existingIndex] = {
      ...groups[existingIndex],
      name,
      miningGroup,
      updatedAt: Date.now(),
    };
    localStorage.setItem(MINING_GROUPS_KEY, JSON.stringify(groups));
    return groups[existingIndex];
  }

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

/**
 * Export mining group as JSON file download
 * Filename format: groupname_group.json
 */
export async function exportMiningGroup(savedGroup: SavedMiningGroup): Promise<void> {
  const dataStr = JSON.stringify(savedGroup, null, 2);

  const safeName = savedGroup.name.replace(/[^a-z0-9]/gi, '_');
  const filename = `${safeName}_group.json`;

  // Try File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        id: 'rockbreaker-groups',
        suggestedName: filename,
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(dataStr);
      await writable.close();
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  // Fallback: invisible download link
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Import mining group from JSON file
 */
export function importMiningGroup(file: File): Promise<SavedMiningGroup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const newGroup = saveMiningGroup(
          imported.name || 'Imported Group',
          imported.miningGroup
        );
        resolve(newGroup);
      } catch (error) {
        reject(new Error('Invalid mining group file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Import mining group using File System Access API picker.
 * Browser remembers the last directory used (via id: 'rockbreaker').
 */
export async function importMiningGroupWithPicker(): Promise<SavedMiningGroup> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fileHandle] = await (window as any).showOpenFilePicker({
    id: 'rockbreaker-groups',
    types: [{
      description: 'JSON Files',
      accept: { 'application/json': ['.json'] },
    }],
  });
  const file = await fileHandle.getFile();
  return importMiningGroup(file);
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

// ─── Regolith API Key (localStorage path) ────────────────────────────────────

export function getRegolithApiKeyLocal(): string | null {
  try {
    return localStorage.getItem(REGOLITH_API_KEY);
  } catch {
    return null;
  }
}

export function saveRegolithApiKeyLocal(key: string): void {
  try {
    localStorage.setItem(REGOLITH_API_KEY, key);
  } catch (error) {
    console.error('Error saving Regolith API key:', error);
  }
}

export function clearRegolithApiKeyLocal(): void {
  try {
    localStorage.removeItem(REGOLITH_API_KEY);
  } catch (error) {
    console.error('Error clearing Regolith API key:', error);
  }
}
