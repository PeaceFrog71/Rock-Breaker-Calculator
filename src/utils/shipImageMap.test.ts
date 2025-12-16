import { describe, it, expect } from 'vitest';
import {
  getShipImageConfig,
  hasShipImage,
  SHIP_IMAGE_CONFIG,
  SHIP_IMAGE_CONFIG_SMALL,
} from './shipImageMap';

describe('shipImageMap', () => {
  describe('SHIP_IMAGE_CONFIG', () => {
    it('should have config for golem', () => {
      expect(SHIP_IMAGE_CONFIG.golem).toBeDefined();
      expect(SHIP_IMAGE_CONFIG.golem.alt).toBe('GOLEM');
    });

    it('should have config for mole', () => {
      expect(SHIP_IMAGE_CONFIG.mole).toBeDefined();
      expect(SHIP_IMAGE_CONFIG.mole.alt).toBe('MOLE');
    });

    it('should have config for prospector', () => {
      expect(SHIP_IMAGE_CONFIG.prospector).toBeDefined();
      expect(SHIP_IMAGE_CONFIG.prospector.alt).toBe('Prospector');
    });

    it('should have width and height for all ships', () => {
      Object.values(SHIP_IMAGE_CONFIG).forEach(config => {
        expect(config.width).toBeDefined();
        expect(config.height).toBeDefined();
        expect(config.width).toMatch(/^\d+(\.\d+)?px$/);
        expect(config.height).toMatch(/^\d+(\.\d+)?px$/);
      });
    });
  });

  describe('SHIP_IMAGE_CONFIG_SMALL', () => {
    it('should have smaller dimensions than standard config', () => {
      const ships = ['golem', 'mole', 'prospector'];
      ships.forEach(shipId => {
        const standard = SHIP_IMAGE_CONFIG[shipId];
        const small = SHIP_IMAGE_CONFIG_SMALL[shipId];

        const standardWidth = parseFloat(standard.width);
        const smallWidth = parseFloat(small.width);

        expect(smallWidth).toBeLessThan(standardWidth);
      });
    });

    it('should have same ships as standard config', () => {
      const standardShips = Object.keys(SHIP_IMAGE_CONFIG);
      const smallShips = Object.keys(SHIP_IMAGE_CONFIG_SMALL);
      expect(smallShips.sort()).toEqual(standardShips.sort());
    });
  });

  describe('getShipImageConfig', () => {
    it('should return standard config by default', () => {
      const config = getShipImageConfig('prospector');
      expect(config).toEqual(SHIP_IMAGE_CONFIG.prospector);
    });

    it('should return standard config when small is false', () => {
      const config = getShipImageConfig('mole', false);
      expect(config).toEqual(SHIP_IMAGE_CONFIG.mole);
    });

    it('should return small config when small is true', () => {
      const config = getShipImageConfig('golem', true);
      expect(config).toEqual(SHIP_IMAGE_CONFIG_SMALL.golem);
    });

    it('should return null for unknown ship', () => {
      const config = getShipImageConfig('unknown-ship');
      expect(config).toBeNull();
    });

    it('should return null for empty string', () => {
      const config = getShipImageConfig('');
      expect(config).toBeNull();
    });
  });

  describe('hasShipImage', () => {
    it('should return true for golem', () => {
      expect(hasShipImage('golem')).toBe(true);
    });

    it('should return true for mole', () => {
      expect(hasShipImage('mole')).toBe(true);
    });

    it('should return true for prospector', () => {
      expect(hasShipImage('prospector')).toBe(true);
    });

    it('should return false for unknown ship', () => {
      expect(hasShipImage('unknown')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasShipImage('')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(hasShipImage('Golem')).toBe(false);
      expect(hasShipImage('GOLEM')).toBe(false);
    });
  });
});
