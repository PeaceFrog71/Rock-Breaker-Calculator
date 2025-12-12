import { describe, it, expect } from 'vitest';
import { toggleModuleActive } from './moduleHelpers';
import type { Module } from '../types';

// Test module fixtures
const createModule = (overrides: Partial<Module>): Module => ({
  id: 'test',
  name: 'Test',
  powerModifier: 1,
  resistModifier: 1,
  category: 'passive',
  ...overrides,
});

const surgeModule = createModule({
  id: 'surge',
  name: 'Surge',
  category: 'active',
  activationType: 'stackable',
  powerModifier: 1.5,
});

const rimeModule = createModule({
  id: 'rime',
  name: 'Rime',
  category: 'active',
  activationType: 'sustained',
  powerModifier: 0.85,
});

const brandtModule = createModule({
  id: 'brandt',
  name: 'Brandt',
  category: 'active',
  activationType: 'sustained',
  powerModifier: 1.35,
});

const passiveModule = createModule({
  id: 'rieger',
  name: 'Rieger',
  category: 'passive',
  powerModifier: 1.15,
});

describe('toggleModuleActive', () => {
  describe('basic toggle behavior', () => {
    it('activates an inactive module', () => {
      const modules = [rimeModule, null, null];
      const currentActive = [false, false, false];

      const result = toggleModuleActive(modules, currentActive, 0);

      expect(result[0]).toBe(true);
    });

    it('deactivates an active module', () => {
      const modules = [rimeModule, null, null];
      const currentActive = [true, false, false];

      const result = toggleModuleActive(modules, currentActive, 0);

      expect(result[0]).toBe(false);
    });

    it('does not affect other modules when deactivating', () => {
      const modules = [rimeModule, surgeModule, passiveModule];
      const currentActive = [true, true, false];

      const result = toggleModuleActive(modules, currentActive, 0);

      expect(result[0]).toBe(false);
      expect(result[1]).toBe(true); // Surge stays active
      expect(result[2]).toBe(false);
    });
  });

  describe('sustained module stacking rules', () => {
    it('deactivates other sustained modules when activating a sustained module', () => {
      const modules = [rimeModule, brandtModule, null];
      const currentActive = [true, false, false]; // Rime is active

      const result = toggleModuleActive(modules, currentActive, 1); // Activate Brandt

      expect(result[0]).toBe(false); // Rime should be deactivated
      expect(result[1]).toBe(true); // Brandt should be activated
    });

    it('deactivates multiple sustained modules when activating a new one', () => {
      const modules = [rimeModule, brandtModule, createModule({
        id: 'stampede',
        name: 'Stampede',
        category: 'active',
        activationType: 'sustained',
      })];
      // This shouldn't happen in normal use, but test the logic anyway
      const currentActive = [true, true, false];

      const result = toggleModuleActive(modules, currentActive, 2); // Activate Stampede

      expect(result[0]).toBe(false); // Rime deactivated
      expect(result[1]).toBe(false); // Brandt deactivated
      expect(result[2]).toBe(true); // Stampede activated
    });
  });

  describe('stackable module (Surge) behavior', () => {
    it('does not deactivate sustained modules when activating Surge', () => {
      const modules = [rimeModule, surgeModule, null];
      const currentActive = [true, false, false]; // Rime is active

      const result = toggleModuleActive(modules, currentActive, 1); // Activate Surge

      expect(result[0]).toBe(true); // Rime stays active
      expect(result[1]).toBe(true); // Surge also active
    });

    it('does not deactivate other Surge modules when activating Surge', () => {
      const modules = [surgeModule, surgeModule, surgeModule];
      const currentActive = [true, true, false]; // Two Surges active

      const result = toggleModuleActive(modules, currentActive, 2); // Activate third Surge

      expect(result[0]).toBe(true);
      expect(result[1]).toBe(true);
      expect(result[2]).toBe(true); // All three active
    });

    it('sustained module does not deactivate Surge modules', () => {
      const modules = [surgeModule, rimeModule, null];
      const currentActive = [true, false, false]; // Surge is active

      const result = toggleModuleActive(modules, currentActive, 1); // Activate Rime

      expect(result[0]).toBe(true); // Surge stays active
      expect(result[1]).toBe(true); // Rime also active
    });
  });

  describe('passive module behavior', () => {
    it('passive modules are not affected by sustained module activation', () => {
      const modules = [passiveModule, rimeModule, brandtModule];
      const currentActive = [true, true, false]; // Passive and Rime active

      const result = toggleModuleActive(modules, currentActive, 2); // Activate Brandt

      expect(result[0]).toBe(true); // Passive stays (not affected by stacking rules)
      expect(result[1]).toBe(false); // Rime deactivated
      expect(result[2]).toBe(true); // Brandt activated
    });

    it('activating a passive module does not affect active modules', () => {
      const modules = [rimeModule, passiveModule, surgeModule];
      const currentActive = [true, false, true]; // Rime and Surge active

      const result = toggleModuleActive(modules, currentActive, 1); // Activate passive

      expect(result[0]).toBe(true); // Rime stays
      expect(result[1]).toBe(true); // Passive activated
      expect(result[2]).toBe(true); // Surge stays
    });
  });

  describe('edge cases', () => {
    it('handles null modules in the array', () => {
      const modules = [null, rimeModule, null];
      const currentActive = [false, false, false];

      const result = toggleModuleActive(modules, currentActive, 1);

      expect(result[1]).toBe(true);
    });

    it('handles empty modules array', () => {
      const modules: (Module | null)[] = [];
      const currentActive: boolean[] = [];

      // This shouldn't crash
      expect(() => toggleModuleActive(modules, currentActive, 0)).not.toThrow();
    });

    it('handles modules without activationType (legacy data)', () => {
      const legacyModule = createModule({
        id: 'legacy',
        name: 'Legacy',
        category: 'active',
        // No activationType set
      });
      const modules = [legacyModule, rimeModule];
      const currentActive = [false, true]; // Rime active

      // Legacy module without activationType should not trigger deactivation
      const result = toggleModuleActive(modules, currentActive, 0);

      expect(result[0]).toBe(true); // Legacy activated
      expect(result[1]).toBe(true); // Rime stays (no activationType = no deactivation logic)
    });
  });
});
