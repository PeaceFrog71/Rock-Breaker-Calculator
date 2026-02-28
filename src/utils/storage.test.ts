// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedShipConfigs,
  saveShipConfig,
  updateShipConfig,
  deleteShipConfig,
  loadShipConfig,
  getRegolithApiKeyLocal,
  saveRegolithApiKeyLocal,
  clearRegolithApiKeyLocal,
} from './storage';
import { STARTER_CONFIGS } from '../data/starterConfigs';
import { SHIPS } from '../types';

const REGOLITH_KEY = 'regolith-api-key';

const prospector = SHIPS.find(s => s.id === 'prospector')!;
const emptyConfig = { lasers: [{ laserHead: null, modules: [] }] };

describe('storage.ts — Regolith API key helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getRegolithApiKeyLocal', () => {
    it('returns null when no key has been saved', () => {
      expect(getRegolithApiKeyLocal()).toBeNull();
    });

    it('returns the stored key after saving', () => {
      localStorage.setItem(REGOLITH_KEY, 'my-api-key');
      expect(getRegolithApiKeyLocal()).toBe('my-api-key');
    });
  });

  describe('saveRegolithApiKeyLocal', () => {
    it('persists the key in localStorage', () => {
      saveRegolithApiKeyLocal('abc-123');
      expect(localStorage.getItem(REGOLITH_KEY)).toBe('abc-123');
    });

    it('overwrites a previously saved key', () => {
      saveRegolithApiKeyLocal('old-key');
      saveRegolithApiKeyLocal('new-key');
      expect(localStorage.getItem(REGOLITH_KEY)).toBe('new-key');
    });
  });

  describe('clearRegolithApiKeyLocal', () => {
    it('removes the key from localStorage', () => {
      localStorage.setItem(REGOLITH_KEY, 'some-key');
      clearRegolithApiKeyLocal();
      expect(localStorage.getItem(REGOLITH_KEY)).toBeNull();
    });

    it('does not throw when no key exists', () => {
      expect(() => clearRegolithApiKeyLocal()).not.toThrow();
    });
  });

  describe('round-trip', () => {
    it('save → get → clear → get returns null', () => {
      saveRegolithApiKeyLocal('round-trip-key');
      expect(getRegolithApiKeyLocal()).toBe('round-trip-key');
      clearRegolithApiKeyLocal();
      expect(getRegolithApiKeyLocal()).toBeNull();
    });
  });
});

describe('storage.ts — Starter Ship Configs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getSavedShipConfigs', () => {
    it('returns starter configs when localStorage is empty', () => {
      const configs = getSavedShipConfigs();
      expect(configs.length).toBe(STARTER_CONFIGS.length);
      expect(configs.every(c => c.isStarter)).toBe(true);
    });

    it('prepends starters before user configs', () => {
      saveShipConfig('My Custom Ship', prospector, emptyConfig);
      const configs = getSavedShipConfigs();

      expect(configs.length).toBe(STARTER_CONFIGS.length + 1);
      // Starters come first
      for (let i = 0; i < STARTER_CONFIGS.length; i++) {
        expect(configs[i].isStarter).toBe(true);
      }
      // User config is last
      expect(configs[configs.length - 1].name).toBe('My Custom Ship');
      expect(configs[configs.length - 1].isStarter).toBeUndefined();
    });

    it('includes all three starter ship types', () => {
      const configs = getSavedShipConfigs();
      const starterIds = configs.filter(c => c.isStarter).map(c => c.id);
      expect(starterIds).toContain('starter-golem');
      expect(starterIds).toContain('starter-prospector');
      expect(starterIds).toContain('starter-mole');
    });
  });

  describe('deleteShipConfig', () => {
    it('blocks deletion of starter configs', () => {
      const result = deleteShipConfig('starter-golem');
      expect(result).toBe(false);

      const configs = getSavedShipConfigs();
      expect(configs.some(c => c.id === 'starter-golem')).toBe(true);
    });

    it('allows deletion of user configs', () => {
      const saved = saveShipConfig('Deletable Ship', prospector, emptyConfig);
      const result = deleteShipConfig(saved.id);
      expect(result).toBe(true);

      const configs = getSavedShipConfigs();
      expect(configs.some(c => c.id === saved.id)).toBe(false);
    });
  });

  describe('saveShipConfig', () => {
    it('throws when saving with a starter config name', () => {
      expect(() => saveShipConfig('New Miner Golem', prospector, emptyConfig))
        .toThrow('Cannot save with a starter config name');
    });

    it('saves normally when name does not collide with starter', () => {
      const saved = saveShipConfig('My Unique Ship', prospector, emptyConfig);
      expect(saved.name).toBe('My Unique Ship');
    });
  });

  describe('updateShipConfig', () => {
    it('blocks updates to starter configs', () => {
      const result = updateShipConfig('starter-prospector', 'Hacked Name', prospector, emptyConfig);
      expect(result).toBeNull();
    });

    it('allows updates to user configs', () => {
      const saved = saveShipConfig('Original Name', prospector, emptyConfig);
      const updated = updateShipConfig(saved.id, 'Updated Name', prospector, emptyConfig);
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated Name');
    });
  });

  describe('loadShipConfig', () => {
    it('loads starter configs by ID', () => {
      const config = loadShipConfig('starter-mole');
      expect(config).not.toBeNull();
      expect(config!.name).toBe('New Miner Mole');
      expect(config!.isStarter).toBe(true);
    });

    it('loads user configs by ID', () => {
      const saved = saveShipConfig('Loadable Ship', prospector, emptyConfig);
      const loaded = loadShipConfig(saved.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('Loadable Ship');
    });
  });
});
