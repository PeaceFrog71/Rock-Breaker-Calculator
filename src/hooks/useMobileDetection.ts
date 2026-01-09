import { useState, useEffect, useCallback } from 'react';

/**
 * Shared hook for detecting mobile devices
 * Uses user agent detection with viewport size and touch capability as fallbacks
 */
export function useMobileDetection(): boolean {
  const checkIsMobile = useCallback(() => {
    // Check for mobile device via user agent (most reliable for iOS/Android)
    const userAgent = navigator.userAgent || '';
    const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // Also check screen size as fallback (for devices not caught by UA)
    const isSmallViewport = window.innerWidth <= 768 || window.innerHeight <= 500;

    // Check touch capability
    const hasTouchScreen = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

    // Mobile if: user agent says mobile, OR (small viewport AND touch screen)
    return isMobileDevice || (isSmallViewport && hasTouchScreen);
  }, []);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return checkIsMobile();
    }
    return false;
  });

  useEffect(() => {
    // Re-check on mount
    setIsMobile(checkIsMobile());

    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    // Delay check after orientation change since dimensions may not update immediately
    const handleOrientationChange = () => {
      setTimeout(() => setIsMobile(checkIsMobile()), 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [checkIsMobile]);

  return isMobile;
}
