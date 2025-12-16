import { describe, it, expect } from 'vitest';
import { formatPct, formatModuleTooltip, formatGadgetTooltip, getGadgetEffects } from './formatters';
import type { Module, Gadget } from '../types';

describe('formatters', () => {
  describe('formatPct', () => {
    it('should return null for undefined', () => {
      expect(formatPct(undefined)).toBeNull();
    });

    it('should return null for value of 1 (no effect)', () => {
      expect(formatPct(1)).toBeNull();
    });

    it('should format values greater than 1 as positive percentages', () => {
      expect(formatPct(1.15)).toBe('+15%');
      expect(formatPct(1.35)).toBe('+35%');
      expect(formatPct(1.5)).toBe('+50%');
    });

    it('should format values less than 1 as negative percentages', () => {
      expect(formatPct(0.85)).toBe('-15%');
      expect(formatPct(0.7)).toBe('-30%');
      expect(formatPct(0.5)).toBe('-50%');
    });

    it('should round to whole percentages', () => {
      expect(formatPct(1.154)).toBe('+15%');
      expect(formatPct(0.856)).toBe('-14%');
    });
  });

  describe('formatModuleTooltip', () => {
    it('should return empty string for null module', () => {
      expect(formatModuleTooltip(null as unknown as Module)).toBe('');
    });

    it('should return empty string for "none" module', () => {
      const noneModule: Module = {
        id: 'none',
        name: '---',
        powerModifier: 1,
        resistModifier: 1,
        category: 'passive',
      };
      expect(formatModuleTooltip(noneModule)).toBe('');
    });

    it('should format passive module with effects', () => {
      const riegerModule: Module = {
        id: 'rieger',
        name: 'Rieger',
        powerModifier: 1.15,
        resistModifier: 1,
        chargeWindowModifier: 0.9,
        category: 'passive',
      };
      const tooltip = formatModuleTooltip(riegerModule);
      expect(tooltip).toContain('Rieger:');
      expect(tooltip).toContain('Power: +15%');
      expect(tooltip).toContain('Window: -10%');
    });

    it('should format active module with duration and uses', () => {
      const surgeModule: Module = {
        id: 'surge',
        name: 'Surge',
        powerModifier: 1.5,
        resistModifier: 0.85,
        instabilityModifier: 1.1,
        category: 'active',
        duration: '15s',
        uses: 7,
      };
      const tooltip = formatModuleTooltip(surgeModule);
      expect(tooltip).toContain('Surge:');
      expect(tooltip).toContain('Power: +50%');
      expect(tooltip).toContain('Resist: -15%');
      expect(tooltip).toContain('Instability: +10%');
      expect(tooltip).toContain('15s/7 uses');
    });

    it('should return "No stat effects" for module with all 1 values', () => {
      const noEffectModule: Module = {
        id: 'test',
        name: 'TestModule',
        powerModifier: 1,
        resistModifier: 1,
        category: 'passive',
      };
      expect(formatModuleTooltip(noEffectModule)).toBe('TestModule: No stat effects');
    });
  });

  describe('formatGadgetTooltip', () => {
    it('should return empty string for null gadget', () => {
      expect(formatGadgetTooltip(null)).toBe('');
    });

    it('should return empty string for "none" gadget', () => {
      const noneGadget: Gadget = {
        id: 'none',
        name: '---',
        resistModifier: 1,
        description: 'No gadget',
      };
      expect(formatGadgetTooltip(noneGadget)).toBe('');
    });

    it('should format gadget with multiple effects', () => {
      const sabirGadget: Gadget = {
        id: 'sabir',
        name: 'Sabir',
        resistModifier: 0.5,
        instabilityModifier: 1.15,
        chargeWindowModifier: 1.5,
        description: 'Best resistance reduction',
      };
      const tooltip = formatGadgetTooltip(sabirGadget);
      expect(tooltip).toContain('Sabir:');
      expect(tooltip).toContain('Resist: -50%');
      expect(tooltip).toContain('Instability: +15%');
      expect(tooltip).toContain('Window: +50%');
    });

    it('should return "No stat effects" for gadget with all 1 values', () => {
      const noEffectGadget: Gadget = {
        id: 'test',
        name: 'TestGadget',
        resistModifier: 1,
        description: 'No effects',
      };
      expect(formatGadgetTooltip(noEffectGadget)).toBe('TestGadget: No stat effects');
    });
  });

  describe('getGadgetEffects', () => {
    it('should return empty array for null gadget', () => {
      expect(getGadgetEffects(null)).toEqual([]);
    });

    it('should return empty array for "none" gadget', () => {
      const noneGadget: Gadget = {
        id: 'none',
        name: '---',
        resistModifier: 1,
        description: 'No gadget',
      };
      expect(getGadgetEffects(noneGadget)).toEqual([]);
    });

    it('should mark resistance decrease as positive (lower is better)', () => {
      const optimaxGadget: Gadget = {
        id: 'optimax',
        name: 'OptiMax',
        resistModifier: 0.7,
        description: 'Reduces resistance',
      };
      const effects = getGadgetEffects(optimaxGadget);
      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        label: 'Resist',
        pct: '-30%',
        isPositive: true, // Lower resist is good
      });
    });

    it('should mark instability decrease as positive (lower is better)', () => {
      const boreMaxGadget: Gadget = {
        id: 'boremax',
        name: 'BoreMax',
        resistModifier: 1.1,
        instabilityModifier: 0.3,
        description: 'Reduces instability',
      };
      const effects = getGadgetEffects(boreMaxGadget);
      const instabilityEffect = effects.find(e => e.label === 'Instability');
      expect(instabilityEffect).toEqual({
        label: 'Instability',
        pct: '-70%',
        isPositive: true, // Lower instability is good
      });
    });

    it('should mark window increase as positive', () => {
      const testGadget: Gadget = {
        id: 'test',
        name: 'Test',
        resistModifier: 1,
        chargeWindowModifier: 1.5,
        description: 'Increases window',
      };
      const effects = getGadgetEffects(testGadget);
      expect(effects[0]).toEqual({
        label: 'Window',
        pct: '+50%',
        isPositive: true,
      });
    });

    it('should return multiple effects in correct order', () => {
      const sabirGadget: Gadget = {
        id: 'sabir',
        name: 'Sabir',
        resistModifier: 0.5,
        instabilityModifier: 1.15,
        chargeWindowModifier: 1.5,
        description: 'Complex gadget',
      };
      const effects = getGadgetEffects(sabirGadget);
      expect(effects).toHaveLength(3);
      expect(effects[0].label).toBe('Resist');
      expect(effects[1].label).toBe('Instability');
      expect(effects[2].label).toBe('Window');
    });
  });
});
