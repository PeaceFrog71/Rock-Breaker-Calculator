import { describe, it, expect } from 'vitest';
import { mapLaserHead, mapModule, mapShip, mapRegolithLoadout } from './regolithMapping';
import type { RegolithLoadout } from './regolithMapping';

describe('mapLaserHead', () => {
  it('maps all known Regolith laser enums', () => {
    const expected: [string, string][] = [
      ['ArborMH1', 'arbor-mh1'],
      ['ArborMH2', 'arbor-mh2'],
      ['HelixI', 'helix-1'],
      ['HelixII', 'helix-2'],
      ['HofstedeS1', 'hofstede-s1'],
      ['HofstedeS2', 'hofstede-s2'],
      ['ImpactI', 'impact-1'],
      ['ImpactII', 'impact-2'],
      ['KleinS1', 'klein-s1'],
      ['KleinS2', 'klein-s2'],
      ['LancetMH1', 'lancet-mh1'],
      ['LancetMH2', 'lancet-mh2'],
      ['Pitman', 'pitman'],
    ];

    for (const [regolith, expectedId] of expected) {
      const result = mapLaserHead(regolith);
      expect(result, `Failed for ${regolith}`).not.toBeNull();
      expect(result!.id).toBe(expectedId);
    }
  });

  it('returns null for unsupported lasers', () => {
    expect(mapLaserHead('ArborMHV')).toBeNull();
    expect(mapLaserHead('Helix0')).toBeNull();
    expect(mapLaserHead('HofstedeS0')).toBeNull();
    expect(mapLaserHead('KleinS0')).toBeNull();
    expect(mapLaserHead('Lawson')).toBeNull();
    expect(mapLaserHead('NonExistent')).toBeNull();
  });
});

describe('mapModule', () => {
  it('matches PascalCase Regolith names to kebab-case IDs', () => {
    // "RiegerC3" → normalize("riegerc3") → matches "rieger-c3"
    const rieger = mapModule('RiegerC3');
    expect(rieger).not.toBeNull();
    expect(rieger!.id).toBe('rieger-c3');
  });

  it('matches various module name formats', () => {
    expect(mapModule('Surge')?.id).toBe('surge');
    expect(mapModule('Brandt')?.id).toBe('brandt');
    expect(mapModule('FLTR')?.id).toBe('fltr');
    expect(mapModule('FocusII')?.id).toBe('focus-2');
    expect(mapModule('FocusIII')?.id).toBe('focus-3');
    expect(mapModule('TorrentII')?.id).toBe('torrent-2');
    expect(mapModule('TorrentIII')?.id).toBe('torrent-3');
    expect(mapModule('VauxC2')?.id).toBe('vaux-c2');
    expect(mapModule('VauxC3')?.id).toBe('vaux-c3');
  });

  it('returns null for unknown modules', () => {
    expect(mapModule('NonExistentModule')).toBeNull();
  });
});

describe('mapShip', () => {
  it('maps supported ships', () => {
    expect(mapShip('PROSPECTOR')?.id).toBe('prospector');
    expect(mapShip('MOLE')?.id).toBe('mole');
    expect(mapShip('GOLEM')?.id).toBe('golem');
  });

  it('returns null for unsupported ships', () => {
    expect(mapShip('ROC')).toBeNull();
    expect(mapShip('CARRACK')).toBeNull();
  });
});

describe('mapRegolithLoadout', () => {
  it('maps a Prospector loadout', () => {
    const loadout: RegolithLoadout = {
      loadoutId: 'test-1',
      name: 'My Prospector',
      ship: 'PROSPECTOR',
      activeLasers: [{
        laser: 'HelixI',
        laserActive: true,
        modules: ['RiegerC3', 'RiegerC3'],
        modulesActive: [true, true],
      }],
    };

    const result = mapRegolithLoadout(loadout);
    expect(result).not.toBeNull();
    expect(result!.ship.id).toBe('prospector');
    expect(result!.name).toBe('My Prospector');
    expect(result!.config.lasers).toHaveLength(1);
    expect(result!.config.lasers[0].laserHead?.id).toBe('helix-1');
    expect(result!.config.lasers[0].modules).toHaveLength(2);
    expect(result!.config.lasers[0].modules[0]?.id).toBe('rieger-c3');
    expect(result!.config.lasers[0].modules[1]?.id).toBe('rieger-c3');
    expect(result!.unmapped).toHaveLength(0);
  });

  it('maps a MOLE loadout with 3 lasers', () => {
    const loadout: RegolithLoadout = {
      loadoutId: 'test-2',
      name: 'Mining MOLE',
      ship: 'MOLE',
      activeLasers: [
        { laser: 'HelixII', laserActive: true, modules: ['Surge', 'Brandt', 'RiegerC3'], modulesActive: [true, false, true] },
        { laser: 'ArborMH2', laserActive: true, modules: ['Surge', 'Stampede'], modulesActive: [false, true] },
        { laser: 'LancetMH2', laserActive: false, modules: ['Forel', 'RiegerC2'], modulesActive: [true, true] },
      ],
    };

    const result = mapRegolithLoadout(loadout);
    expect(result).not.toBeNull();
    expect(result!.ship.id).toBe('mole');
    expect(result!.config.lasers).toHaveLength(3);

    // First laser: Helix II with 3 module slots
    expect(result!.config.lasers[0].laserHead?.id).toBe('helix-2');
    expect(result!.config.lasers[0].modules).toHaveLength(3);
    expect(result!.config.lasers[0].isManned).toBe(true);

    // Second laser: Arbor MH2 with 2 module slots
    expect(result!.config.lasers[1].laserHead?.id).toBe('arbor-mh2');
    expect(result!.config.lasers[1].modules).toHaveLength(2);

    // Third laser: Lancet MH2 with 2 module slots
    expect(result!.config.lasers[2].laserHead?.id).toBe('lancet-mh2');
    expect(result!.config.lasers[2].isManned).toBe(false);
  });

  it('tracks unmapped equipment', () => {
    const loadout: RegolithLoadout = {
      loadoutId: 'test-3',
      name: 'Unknown Gear',
      ship: 'PROSPECTOR',
      activeLasers: [{
        laser: 'ArborMHV',
        laserActive: true,
        modules: ['FakeModule'],
        modulesActive: [true],
      }],
    };

    const result = mapRegolithLoadout(loadout);
    expect(result).not.toBeNull();
    expect(result!.unmapped).toContain('ArborMHV');
  });

  it('returns null for unsupported ships', () => {
    const loadout: RegolithLoadout = {
      loadoutId: 'test-4',
      name: 'ROC Build',
      ship: 'ROC',
      activeLasers: [],
    };

    expect(mapRegolithLoadout(loadout)).toBeNull();
  });

  it('handles GOLEM with fixed Pitman laser', () => {
    const loadout: RegolithLoadout = {
      loadoutId: 'test-5',
      name: 'My Golem',
      ship: 'GOLEM',
      activeLasers: [{
        laser: 'UnknownLaser',
        laserActive: true,
        modules: ['Surge', 'Brandt'],
        modulesActive: [true, true],
      }],
    };

    const result = mapRegolithLoadout(loadout);
    expect(result).not.toBeNull();
    expect(result!.config.lasers[0].laserHead?.id).toBe('pitman');
    // Pitman has 2 module slots, so both modules should be mapped
    expect(result!.config.lasers[0].modules).toHaveLength(2);
    expect(result!.unmapped).toHaveLength(0);
  });

  it('truncates modules to laser slot count', () => {
    // Arbor MH1 has only 1 module slot
    const loadout: RegolithLoadout = {
      loadoutId: 'test-6',
      name: 'Overflow Modules',
      ship: 'PROSPECTOR',
      activeLasers: [{
        laser: 'ArborMH1',
        laserActive: true,
        modules: ['Surge', 'Brandt'],
        modulesActive: [true, true],
      }],
    };

    const result = mapRegolithLoadout(loadout);
    expect(result).not.toBeNull();
    // Arbor MH1 has 1 module slot
    expect(result!.config.lasers[0].modules).toHaveLength(1);
    // Brandt should be flagged as unmapped (no slot)
    expect(result!.unmapped.some(u => u.includes('Brandt'))).toBe(true);
  });

  it('preserves module active states', () => {
    const loadout: RegolithLoadout = {
      loadoutId: 'test-7',
      name: 'Active Test',
      ship: 'PROSPECTOR',
      activeLasers: [{
        laser: 'HelixI',
        laserActive: true,
        modules: ['Surge', 'RiegerC3'],
        modulesActive: [true, false],
      }],
    };

    const result = mapRegolithLoadout(loadout);
    expect(result).not.toBeNull();
    expect(result!.config.lasers[0].moduleActive).toEqual([true, false]);
  });
});
