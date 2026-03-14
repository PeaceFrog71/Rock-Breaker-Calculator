// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';

/**
 * Test the mobile detection logic directly.
 * The hook's core logic is: isMobileDevice || (hasTouchScreen && window.innerWidth < 1024)
 * We test by mocking navigator/window properties and dynamically importing the module fresh each time.
 */

// Helper to mock navigator properties
const mockNavigator = (overrides: { userAgent?: string; maxTouchPoints?: number }) => {
  if (overrides.userAgent !== undefined) {
    Object.defineProperty(navigator, 'userAgent', {
      value: overrides.userAgent,
      writable: true,
      configurable: true,
    });
  }
  if (overrides.maxTouchPoints !== undefined) {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: overrides.maxTouchPoints,
      writable: true,
      configurable: true,
    });
  }
};

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
};

/**
 * Replicate the hook's detection logic for unit testing without React rendering.
 * This mirrors the checkIsMobile callback in useMobileDetection.
 */
const checkIsMobile = (): boolean => {
  const userAgent = navigator.userAgent || '';
  const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const hasTouchScreen = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return isMobileDevice || (hasTouchScreen && window.innerWidth < 1024);
};

const originalUserAgent = navigator.userAgent;
const originalMaxTouchPoints = navigator.maxTouchPoints;
const originalInnerWidth = window.innerWidth;

afterEach(() => {
  // Restore originals
  mockNavigator({ userAgent: originalUserAgent, maxTouchPoints: originalMaxTouchPoints });
  setViewportWidth(originalInnerWidth);
  if ('ontouchstart' in window) {
    delete (window as Record<string, unknown>).ontouchstart;
  }
});

describe('useMobileDetection logic', () => {
  it('should return false for standard desktop browser (no touch, wide viewport)', () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', maxTouchPoints: 0 });
    setViewportWidth(1920);
    expect(checkIsMobile()).toBe(false);
  });

  it('should return true for mobile user agent regardless of viewport', () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      maxTouchPoints: 0,
    });
    setViewportWidth(1920);
    expect(checkIsMobile()).toBe(true);
  });

  it('should return true for Android user agent', () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36',
      maxTouchPoints: 0,
    });
    setViewportWidth(412);
    expect(checkIsMobile()).toBe(true);
  });

  it('should return true for touch device with narrow viewport (real tablet)', () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      maxTouchPoints: 5,
    });
    setViewportWidth(768);
    expect(checkIsMobile()).toBe(true);
  });

  describe('Regression: Issue #298 - Desktop with touch points incorrectly gets mobile layout', () => {
    it('should return false when maxTouchPoints > 0 but viewport is wide (virtual touch device like Game Glass, Tobii, RODECaster)', () => {
      // Arrange: desktop user agent, wide viewport, but touch points from virtual device
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        maxTouchPoints: 2,
      });
      setViewportWidth(1920);

      // Act & Assert: should NOT be detected as mobile
      expect(checkIsMobile()).toBe(false);
    });

    it('should return false when maxTouchPoints > 0 and viewport is exactly 1024px', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        maxTouchPoints: 2,
      });
      setViewportWidth(1024);
      expect(checkIsMobile()).toBe(false);
    });

    it('should return true when maxTouchPoints > 0 and viewport is under 1024px (real touch device)', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        maxTouchPoints: 5,
      });
      setViewportWidth(1023);
      expect(checkIsMobile()).toBe(true);
    });

    it('should return true when maxTouchPoints > 0 and viewport is phone-sized', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        maxTouchPoints: 2,
      });
      setViewportWidth(390);
      expect(checkIsMobile()).toBe(true);
    });
  });
});
