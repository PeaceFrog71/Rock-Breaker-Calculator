import { describe, it, expect } from 'vitest';
import { GADGETS, MODULES, LASER_HEADS } from './index';

/**
 * Equipment Data Validation Tests
 *
 * These tests validate that equipment modifier values in the database match
 * the reference data from the community mining spreadsheets (CSV).
 *
 * Why this matters: calculation logic tests pass even when data is wrong —
 * they test math, not accuracy. These tests catch data entry errors like
 * shifted columns or wrong modifier types.
 *
 * Reference: ref data/Mining Data/Laser and Gadgets.csv
 */

// Helper: find equipment by id with a clear error if missing
const findGadget = (id: string) => {
  const gadget = GADGETS.find(g => g.id === id);
  if (!gadget) throw new Error(`Gadget '${id}' not found in GADGETS array`);
  return gadget;
};

const findModule = (id: string) => {
  const module = MODULES.find(m => m.id === id);
  if (!module) throw new Error(`Module '${id}' not found in MODULES array`);
  return module;
};

const findLaser = (id: string) => {
  const laser = LASER_HEADS.find(l => l.id === id);
  if (!laser) throw new Error(`Laser '${id}' not found in LASER_HEADS array`);
  return laser;
};

describe('Regression: Issue #281 - Okunis and Optimax incorrect modifiers', () => {
  it('Okunis should have no resistance effect (resistModifier = 1)', () => {
    const okunis = findGadget('okunis');
    expect(okunis.resistModifier).toBe(1);
  });

  it('Okunis should have chargeWindowModifier of 1.5 (+50%)', () => {
    const okunis = findGadget('okunis');
    expect(okunis.chargeWindowModifier).toBe(1.5);
  });

  it('Okunis should have chargeRateModifier of 2.0 (+100%)', () => {
    const okunis = findGadget('okunis');
    expect(okunis.chargeRateModifier).toBe(2.0);
  });

  it('Okunis should NOT have an instability modifier', () => {
    const okunis = findGadget('okunis');
    expect(okunis.instabilityModifier).toBeUndefined();
  });

  it('Optimax should NOT have an instability modifier', () => {
    const optimax = findGadget('optimax');
    expect(optimax.instabilityModifier).toBeUndefined();
  });

  it('Optimax should have chargeWindowModifier of 0.7 (-30%)', () => {
    const optimax = findGadget('optimax');
    expect(optimax.chargeWindowModifier).toBe(0.7);
  });
});

describe('Gadget Data Validation', () => {
  describe('BoreMax', () => {
    it('should have correct modifiers', () => {
      const g = findGadget('boremax');
      expect(g.resistModifier).toBe(1.1);
      expect(g.instabilityModifier).toBe(0.3);
      expect(g.clusterModifier).toBe(1.3);
      expect(g.chargeWindowModifier).toBeUndefined();
      expect(g.chargeRateModifier).toBeUndefined();
    });
  });

  describe('Okunis', () => {
    it('should have correct modifiers', () => {
      const g = findGadget('okunis');
      expect(g.resistModifier).toBe(1);
      expect(g.chargeWindowModifier).toBe(1.5);
      expect(g.chargeRateModifier).toBe(2.0);
      expect(g.clusterModifier).toBe(0.8);
      expect(g.instabilityModifier).toBeUndefined();
    });
  });

  describe('OptiMax', () => {
    it('should have correct modifiers', () => {
      const g = findGadget('optimax');
      expect(g.resistModifier).toBe(0.7);
      expect(g.chargeWindowModifier).toBe(0.7);
      expect(g.clusterModifier).toBe(1.6);
      expect(g.instabilityModifier).toBeUndefined();
    });
  });

  describe('Sabir', () => {
    it('should have correct modifiers', () => {
      const g = findGadget('sabir');
      expect(g.resistModifier).toBe(0.5);
      expect(g.instabilityModifier).toBe(1.15);
      expect(g.chargeWindowModifier).toBe(1.5);
      expect(g.clusterModifier).toBeUndefined();
      expect(g.chargeRateModifier).toBeUndefined();
    });
  });

  describe('Stalwart', () => {
    it('should have correct modifiers', () => {
      const g = findGadget('stalwart');
      expect(g.resistModifier).toBe(1.0);
      expect(g.instabilityModifier).toBe(0.65);
      expect(g.chargeWindowModifier).toBe(0.7);
      expect(g.chargeRateModifier).toBe(1.5);
      expect(g.clusterModifier).toBe(1.3);
    });
  });

  describe('Waveshift', () => {
    it('should have correct modifiers', () => {
      const g = findGadget('waveshift');
      expect(g.resistModifier).toBe(1.0);
      expect(g.instabilityModifier).toBe(0.65);
      expect(g.chargeWindowModifier).toBe(2.0);
      expect(g.chargeRateModifier).toBe(0.7);
      expect(g.clusterModifier).toBeUndefined();
    });
  });

  describe('None gadget', () => {
    it('should have neutral modifiers', () => {
      const g = findGadget('none');
      expect(g.resistModifier).toBe(1);
      expect(g.instabilityModifier).toBeUndefined();
      expect(g.chargeWindowModifier).toBeUndefined();
      expect(g.chargeRateModifier).toBeUndefined();
      expect(g.clusterModifier).toBeUndefined();
    });
  });
});

describe('Module Data Validation - Active Modules', () => {
  describe('Brandt', () => {
    it('should have correct modifiers', () => {
      const m = findModule('brandt');
      expect(m.powerModifier).toBe(1.35);
      expect(m.resistModifier).toBe(1.15);
      expect(m.shatterDamageModifier).toBe(0.7);
      expect(m.category).toBe('active');
      expect(m.activationType).toBe('sustained');
      expect(m.instabilityModifier).toBeUndefined();
    });
  });

  describe('Forel', () => {
    it('should have correct modifiers', () => {
      const m = findModule('forel');
      expect(m.powerModifier).toBe(1.0);
      expect(m.resistModifier).toBe(1.15);
      expect(m.overchargeRateModifier).toBe(0.4);
      expect(m.extractionPowerModifier).toBe(1.5);
      expect(m.category).toBe('active');
      expect(m.activationType).toBe('sustained');
    });
  });

  describe('Lifeline', () => {
    it('should have correct modifiers', () => {
      const m = findModule('lifeline');
      expect(m.powerModifier).toBe(1.0);
      expect(m.resistModifier).toBe(0.85);
      expect(m.instabilityModifier).toBe(0.8);
      expect(m.overchargeRateModifier).toBe(1.6);
      expect(m.category).toBe('active');
      expect(m.activationType).toBe('sustained');
    });
  });

  describe('Optimum', () => {
    it('should have correct modifiers', () => {
      const m = findModule('optimum');
      expect(m.powerModifier).toBe(0.85);
      expect(m.resistModifier).toBe(1.0);
      expect(m.instabilityModifier).toBe(0.9);
      expect(m.overchargeRateModifier).toBe(0.2);
      expect(m.category).toBe('active');
      expect(m.activationType).toBe('sustained');
    });
  });

  describe('Rime', () => {
    it('should have correct modifiers', () => {
      const m = findModule('rime');
      expect(m.powerModifier).toBe(0.85);
      expect(m.resistModifier).toBe(0.75);
      expect(m.shatterDamageModifier).toBe(0.9);
      expect(m.category).toBe('active');
      expect(m.activationType).toBe('sustained');
    });
  });

  describe('Stampede', () => {
    it('should have correct modifiers', () => {
      const m = findModule('stampede');
      expect(m.powerModifier).toBe(1.35);
      expect(m.resistModifier).toBe(1.0);
      expect(m.instabilityModifier).toBe(0.9);
      expect(m.shatterDamageModifier).toBe(0.9);
      expect(m.extractionPowerModifier).toBe(0.85);
      expect(m.category).toBe('active');
      expect(m.activationType).toBe('sustained');
    });
  });

  describe('Surge', () => {
    it('should have correct modifiers', () => {
      const m = findModule('surge');
      expect(m.powerModifier).toBe(1.5);
      expect(m.resistModifier).toBe(0.85);
      expect(m.instabilityModifier).toBe(1.1);
      expect(m.category).toBe('active');
      expect(m.activationType).toBe('stackable');
    });
  });

  describe('Torpid', () => {
    it('should have correct modifiers', () => {
      const m = findModule('torpid');
      expect(m.powerModifier).toBe(1.0);
      expect(m.resistModifier).toBe(1.0);
      expect(m.chargeRateModifier).toBe(1.6);
      expect(m.overchargeRateModifier).toBe(0.4);
      expect(m.shatterDamageModifier).toBe(1.4);
      expect(m.category).toBe('active');
      expect(m.activationType).toBe('sustained');
    });
  });
});

describe('Module Data Validation - Passive Modules', () => {
  describe('FLTR family', () => {
    it('FLTR should have correct modifiers', () => {
      const m = findModule('fltr');
      expect(m.powerModifier).toBe(1.0);
      expect(m.resistModifier).toBe(1.0);
      expect(m.extractionPowerModifier).toBe(0.85);
      expect(m.inertMaterialsModifier).toBe(0.8);
      expect(m.category).toBe('passive');
    });

    it('FLTR-L should have correct modifiers', () => {
      const m = findModule('fltr-l');
      expect(m.extractionPowerModifier).toBe(0.9);
      expect(m.inertMaterialsModifier).toBe(0.77);
    });

    it('FLTR-XL should have correct modifiers', () => {
      const m = findModule('fltr-xl');
      expect(m.extractionPowerModifier).toBe(0.95);
      expect(m.inertMaterialsModifier).toBe(0.76);
    });
  });

  describe('Focus family', () => {
    it('Focus should have correct modifiers', () => {
      const m = findModule('focus');
      expect(m.powerModifier).toBe(0.85);
      expect(m.chargeWindowModifier).toBe(1.3);
      expect(m.category).toBe('passive');
    });

    it('Focus II should have correct modifiers', () => {
      const m = findModule('focus-2');
      expect(m.powerModifier).toBe(0.9);
      expect(m.chargeWindowModifier).toBe(1.37);
    });

    it('Focus III should have correct modifiers', () => {
      const m = findModule('focus-3');
      expect(m.powerModifier).toBe(0.95);
      expect(m.chargeWindowModifier).toBe(1.4);
    });
  });

  describe('Rieger family', () => {
    it('Rieger should have correct modifiers', () => {
      const m = findModule('rieger');
      expect(m.powerModifier).toBe(1.15);
      expect(m.chargeWindowModifier).toBe(0.9);
      expect(m.category).toBe('passive');
    });

    it('Rieger-C2 should have correct modifiers', () => {
      const m = findModule('rieger-c2');
      expect(m.powerModifier).toBe(1.2);
      expect(m.chargeWindowModifier).toBe(0.97);
    });

    it('Rieger-C3 should have correct modifiers', () => {
      const m = findModule('rieger-c3');
      expect(m.powerModifier).toBe(1.25);
      expect(m.chargeWindowModifier).toBe(0.99);
    });
  });

  describe('Torrent family', () => {
    it('Torrent should have correct modifiers', () => {
      const m = findModule('torrent');
      expect(m.chargeWindowModifier).toBe(0.9);
      expect(m.chargeRateModifier).toBe(1.3);
      expect(m.category).toBe('passive');
    });

    it('Torrent II should have correct modifiers', () => {
      const m = findModule('torrent-2');
      expect(m.chargeWindowModifier).toBe(0.97);
      expect(m.chargeRateModifier).toBe(1.35);
    });

    it('Torrent III should have correct modifiers', () => {
      const m = findModule('torrent-3');
      expect(m.chargeWindowModifier).toBe(0.99);
      expect(m.chargeRateModifier).toBe(1.4);
    });
  });

  describe('Vaux family', () => {
    it('Vaux should have correct modifiers', () => {
      const m = findModule('vaux');
      expect(m.chargeRateModifier).toBe(0.8);
      expect(m.extractionPowerModifier).toBe(1.15);
      expect(m.category).toBe('passive');
    });

    it('Vaux-C2 should have correct modifiers', () => {
      const m = findModule('vaux-c2');
      expect(m.chargeRateModifier).toBe(0.85);
      expect(m.extractionPowerModifier).toBe(1.2);
    });

    it('Vaux-C3 should have correct modifiers', () => {
      const m = findModule('vaux-c3');
      expect(m.chargeRateModifier).toBe(0.95);
      expect(m.extractionPowerModifier).toBe(1.25);
    });
  });

  describe('XTR family', () => {
    it('XTR should have correct modifiers', () => {
      const m = findModule('xtr');
      expect(m.chargeWindowModifier).toBe(1.15);
      expect(m.extractionPowerModifier).toBe(0.85);
      expect(m.inertMaterialsModifier).toBe(0.95);
      expect(m.category).toBe('passive');
    });

    it('XTR-L should have correct modifiers', () => {
      const m = findModule('xtr-l');
      expect(m.chargeWindowModifier).toBe(1.22);
      expect(m.extractionPowerModifier).toBe(0.9);
      expect(m.inertMaterialsModifier).toBe(0.94);
    });

    it('XTR-XL should have correct modifiers', () => {
      const m = findModule('xtr-xl');
      expect(m.chargeWindowModifier).toBe(1.25);
      expect(m.extractionPowerModifier).toBe(0.95);
      expect(m.inertMaterialsModifier).toBe(0.94);
    });
  });
});

describe('Laser Data Validation', () => {
  it('should have all expected laser heads', () => {
    const expectedIds = [
      'none', 'pitman', 'arbor-mh1', 'arbor-mh2', 'helix-1', 'helix-2',
      'hofstede-s1', 'hofstede-s2', 'impact-1', 'impact-2', 'klein-s1',
      'klein-s2', 'lancet-mh1', 'lancet-mh2',
    ];
    expectedIds.forEach(id => {
      expect(LASER_HEADS.find(l => l.id === id), `Missing laser: ${id}`).toBeDefined();
    });
  });

  describe('Pitman (Size 0 - Golem bespoke)', () => {
    it('should have correct modifiers', () => {
      const l = findLaser('pitman');
      expect(l.maxPower).toBe(3150);
      expect(l.resistModifier).toBe(1.25);
      expect(l.size).toBe(0);
      expect(l.moduleSlots).toBe(2);
      expect(l.instabilityModifier).toBe(1.35);
      expect(l.chargeRateModifier).toBe(0.6);
      expect(l.chargeWindowModifier).toBe(1.4);
      expect(l.inertMaterialsModifier).toBe(0.6);
    });
  });

  describe('Size 1 Lasers', () => {
    it('Arbor MH1 should have correct modifiers', () => {
      const l = findLaser('arbor-mh1');
      expect(l.maxPower).toBe(1890);
      expect(l.resistModifier).toBe(1.25);
      expect(l.size).toBe(1);
      expect(l.moduleSlots).toBe(1);
      expect(l.instabilityModifier).toBe(0.65);
      expect(l.chargeWindowModifier).toBe(1.4);
      expect(l.inertMaterialsModifier).toBe(0.7);
    });

    it('Helix I should have correct modifiers', () => {
      const l = findLaser('helix-1');
      expect(l.maxPower).toBe(3150);
      expect(l.resistModifier).toBe(0.7);
      expect(l.size).toBe(1);
      expect(l.moduleSlots).toBe(2);
      expect(l.chargeWindowModifier).toBe(0.6);
      expect(l.inertMaterialsModifier).toBe(0.7);
      expect(l.instabilityModifier).toBeUndefined();
    });

    it('Hofstede-S1 should have correct modifiers', () => {
      const l = findLaser('hofstede-s1');
      expect(l.maxPower).toBe(2100);
      expect(l.resistModifier).toBe(0.7);
      expect(l.instabilityModifier).toBe(1.1);
      expect(l.chargeRateModifier).toBe(1.2);
      expect(l.chargeWindowModifier).toBe(1.6);
      expect(l.inertMaterialsModifier).toBe(0.7);
    });

    it('Impact I should have correct modifiers', () => {
      const l = findLaser('impact-1');
      expect(l.maxPower).toBe(2100);
      expect(l.resistModifier).toBe(1.1);
      expect(l.instabilityModifier).toBe(0.9);
      expect(l.chargeRateModifier).toBe(0.6);
      expect(l.chargeWindowModifier).toBe(1.2);
      expect(l.inertMaterialsModifier).toBe(0.7);
    });

    it('Klein-S1 should have correct modifiers', () => {
      const l = findLaser('klein-s1');
      expect(l.maxPower).toBe(2220);
      expect(l.resistModifier).toBe(0.55);
      expect(l.moduleSlots).toBe(0);
      expect(l.instabilityModifier).toBe(1.35);
      expect(l.chargeWindowModifier).toBe(1.2);
      expect(l.inertMaterialsModifier).toBe(0.7);
    });

    it('Lancet MH1 should have correct modifiers', () => {
      const l = findLaser('lancet-mh1');
      expect(l.maxPower).toBe(2520);
      expect(l.resistModifier).toBe(1.0);
      expect(l.instabilityModifier).toBe(0.9);
      expect(l.chargeRateModifier).toBe(1.4);
      expect(l.chargeWindowModifier).toBe(0.4);
      expect(l.inertMaterialsModifier).toBe(0.7);
    });
  });

  describe('Size 2 Lasers', () => {
    it('Arbor MH2 should have correct modifiers', () => {
      const l = findLaser('arbor-mh2');
      expect(l.maxPower).toBe(2400);
      expect(l.resistModifier).toBe(1.25);
      expect(l.size).toBe(2);
      expect(l.moduleSlots).toBe(2);
      expect(l.instabilityModifier).toBe(0.65);
      expect(l.chargeWindowModifier).toBe(1.4);
      expect(l.inertMaterialsModifier).toBe(0.6);
    });

    it('Helix II should have correct modifiers', () => {
      const l = findLaser('helix-2');
      expect(l.maxPower).toBe(4080);
      expect(l.resistModifier).toBe(0.7);
      expect(l.size).toBe(2);
      expect(l.moduleSlots).toBe(3);
      expect(l.chargeWindowModifier).toBe(0.6);
      expect(l.inertMaterialsModifier).toBe(0.6);
    });

    it('Hofstede-S2 should have correct modifiers', () => {
      const l = findLaser('hofstede-s2');
      expect(l.maxPower).toBe(3360);
      expect(l.resistModifier).toBe(0.7);
      expect(l.instabilityModifier).toBe(1.1);
      expect(l.chargeRateModifier).toBe(1.2);
      expect(l.chargeWindowModifier).toBe(1.6);
      expect(l.inertMaterialsModifier).toBe(0.6);
    });

    it('Impact II should have correct modifiers', () => {
      const l = findLaser('impact-2');
      expect(l.maxPower).toBe(3360);
      expect(l.resistModifier).toBe(1.1);
      expect(l.instabilityModifier).toBe(0.9);
      expect(l.chargeRateModifier).toBe(0.6);
      expect(l.chargeWindowModifier).toBe(1.2);
      expect(l.inertMaterialsModifier).toBe(0.6);
    });

    it('Klein-S2 should have correct modifiers', () => {
      const l = findLaser('klein-s2');
      expect(l.maxPower).toBe(3600);
      expect(l.resistModifier).toBe(0.55);
      expect(l.moduleSlots).toBe(1);
      expect(l.instabilityModifier).toBe(1.35);
      expect(l.chargeWindowModifier).toBe(1.2);
      expect(l.inertMaterialsModifier).toBe(0.6);
    });

    it('Lancet MH2 should have correct modifiers', () => {
      const l = findLaser('lancet-mh2');
      expect(l.maxPower).toBe(3600);
      expect(l.resistModifier).toBe(1.0);
      expect(l.instabilityModifier).toBe(0.9);
      expect(l.chargeRateModifier).toBe(1.4);
      expect(l.chargeWindowModifier).toBe(0.4);
      expect(l.inertMaterialsModifier).toBe(0.6);
    });
  });
});

describe('Equipment Array Integrity', () => {
  it('should have 7 gadgets (including none)', () => {
    expect(GADGETS).toHaveLength(7);
  });

  it('should have 27 modules (including none)', () => {
    expect(MODULES).toHaveLength(27);
  });

  it('should have 14 laser heads (including none)', () => {
    expect(LASER_HEADS).toHaveLength(14);
  });

  it('all gadgets should have unique ids', () => {
    const ids = GADGETS.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all modules should have unique ids', () => {
    const ids = MODULES.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all laser heads should have unique ids', () => {
    const ids = LASER_HEADS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
