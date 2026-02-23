// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRegolithApiKeyLocal,
  saveRegolithApiKeyLocal,
  clearRegolithApiKeyLocal,
} from './storage';

const REGOLITH_KEY = 'regolith-api-key';

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
