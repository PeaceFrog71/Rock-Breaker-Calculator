import { describe, it, expect } from 'vitest';
import { getDefaultLaserForShip, createEmptyConfig, initializeDefaultLasersForShip } from './shipDefaults';
import { SHIPS, LASER_HEADS } from '../types';
import type { Ship } from '../types';

describe('shipDefaults', () => {
  // Get ships for testing
  const prospector = SHIPS.find(s => s.id === 'prospector')!;
  const mole = SHIPS.find(s => s.id === 'mole')!;
  const golem = SHIPS.find(s => s.id === 'golem')!;

  describe('getDefaultLaserForShip', () => {
    it('should return Pitman laser for Golem', () => {
      const laser = getDefaultLaserForShip(golem);
      expect(laser).not.toBeNull();
      expect(laser!.id).toBe('pitman');
      expect(laser!.name).toBe('Pitman');
    });

    it('should return Arbor MH1 for Prospector', () => {
      const laser = getDefaultLaserForShip(prospector);
      expect(laser).not.toBeNull();
      expect(laser!.id).toBe('arbor-mh1');
      expect(laser!.size).toBe(1);
    });

    it('should return Arbor MH2 for MOLE', () => {
      const laser = getDefaultLaserForShip(mole);
      expect(laser).not.toBeNull();
      expect(laser!.id).toBe('arbor-mh2');
      expect(laser!.size).toBe(2);
    });

    it('should return a matching laser for unknown ship based on maxLaserSize', () => {
      const unknownShip: Ship = {
        id: 'unknown',
        name: 'Unknown Ship',
        laserSlots: 2,
        maxLaserSize: 1,
        description: 'Test ship',
      };
      const laser = getDefaultLaserForShip(unknownShip);
      // Should find a size 1 laser that isn't 'none' or 'pitman'
      expect(laser).not.toBeNull();
      expect(laser!.size).toBe(1);
      expect(laser!.id).not.toBe('none');
      expect(laser!.id).not.toBe('pitman');
    });
  });

  describe('createEmptyConfig', () => {
    it('should create config with correct number of laser slots', () => {
      const config1 = createEmptyConfig(1);
      expect(config1.lasers).toHaveLength(1);

      const config3 = createEmptyConfig(3);
      expect(config3.lasers).toHaveLength(3);
    });

    it('should initialize each laser with null laserHead', () => {
      const config = createEmptyConfig(2);
      config.lasers.forEach(laser => {
        expect(laser.laserHead).toBeNull();
      });
    });

    it('should initialize each laser with empty modules array', () => {
      const config = createEmptyConfig(2);
      config.lasers.forEach(laser => {
        expect(laser.modules).toEqual([]);
      });
    });

    it('should set isManned to true by default', () => {
      const config = createEmptyConfig(3);
      config.lasers.forEach(laser => {
        expect(laser.isManned).toBe(true);
      });
    });
  });

  describe('initializeDefaultLasersForShip', () => {
    it('should initialize Prospector with 1 Arbor MH1 laser', () => {
      const config = initializeDefaultLasersForShip(prospector);
      expect(config.lasers).toHaveLength(1);
      expect(config.lasers[0].laserHead).not.toBeNull();
      expect(config.lasers[0].laserHead!.id).toBe('arbor-mh1');
    });

    it('should initialize MOLE with 3 Arbor MH2 lasers', () => {
      const config = initializeDefaultLasersForShip(mole);
      expect(config.lasers).toHaveLength(3);
      config.lasers.forEach(laser => {
        expect(laser.laserHead).not.toBeNull();
        expect(laser.laserHead!.id).toBe('arbor-mh2');
      });
    });

    it('should initialize Golem with 1 Pitman laser', () => {
      const config = initializeDefaultLasersForShip(golem);
      expect(config.lasers).toHaveLength(1);
      expect(config.lasers[0].laserHead).not.toBeNull();
      expect(config.lasers[0].laserHead!.id).toBe('pitman');
    });

    it('should initialize modules array based on laser module slots', () => {
      const config = initializeDefaultLasersForShip(prospector);
      const arborMh1 = LASER_HEADS.find(l => l.id === 'arbor-mh1')!;
      expect(config.lasers[0].modules).toHaveLength(arborMh1.moduleSlots);
    });

    it('should initialize moduleActive array with false values', () => {
      const config = initializeDefaultLasersForShip(prospector);
      config.lasers[0].moduleActive!.forEach(active => {
        expect(active).toBe(false);
      });
    });

    it('should set all lasers as manned by default', () => {
      const config = initializeDefaultLasersForShip(mole);
      config.lasers.forEach(laser => {
        expect(laser.isManned).toBe(true);
      });
    });
  });
});
