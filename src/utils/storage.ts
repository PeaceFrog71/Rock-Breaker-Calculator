import type { MiningConfiguration, Ship } from '../types';

const STORAGE_KEY = 'rock-breaker-configs';
const CURRENT_CONFIG_KEY = 'rock-breaker-current';

export interface SavedConfiguration {
  id: string;
  name: string;
  ship: Ship;
  config: MiningConfiguration;
  createdAt: number;
  updatedAt: number;
}

/**
 * Get all saved configurations
 */
export function getSavedConfigurations(): SavedConfiguration[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading saved configurations:', error);
    return [];
  }
}

/**
 * Save a new configuration
 */
export function saveConfiguration(
  name: string,
  ship: Ship,
  config: MiningConfiguration
): SavedConfiguration {
  const configs = getSavedConfigurations();

  const newConfig: SavedConfiguration = {
    id: Date.now().toString(),
    name,
    ship,
    config,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  configs.push(newConfig);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));

  return newConfig;
}

/**
 * Update an existing configuration
 */
export function updateConfiguration(
  id: string,
  name: string,
  ship: Ship,
  config: MiningConfiguration
): SavedConfiguration | null {
  const configs = getSavedConfigurations();
  const index = configs.findIndex((c) => c.id === id);

  if (index === -1) return null;

  configs[index] = {
    ...configs[index],
    name,
    ship,
    config,
    updatedAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  return configs[index];
}

/**
 * Delete a configuration
 */
export function deleteConfiguration(id: string): boolean {
  const configs = getSavedConfigurations();
  const filtered = configs.filter((c) => c.id !== id);

  if (filtered.length === configs.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Load a configuration by ID
 */
export function loadConfiguration(id: string): SavedConfiguration | null {
  const configs = getSavedConfigurations();
  return configs.find((c) => c.id === id) || null;
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
 * Export configuration as JSON file
 */
export function exportConfiguration(savedConfig: SavedConfiguration): void {
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
 * Import configuration from JSON file
 */
export function importConfiguration(file: File): Promise<SavedConfiguration> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const newConfig = saveConfiguration(
          imported.name || 'Imported Config',
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
