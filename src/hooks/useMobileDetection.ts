import { useState, useEffect, useCallback } from 'react';

/**
 * Shared hook for detecting mobile devices
 * Uses user agent detection with viewport size and touch capability as fallbacks
 */
export function useMobileDetection(): boolean {
  const checkIsMobile = useCallback(() => {
    // Check for mobile device via user agent
    // Note: iPadOS 13+ reports as "Macintosh" so this may not catch iPads
    const userAgent = navigator.userAgent || '';
    const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // Check touch capability - this catches iPads that report as Macintosh
    const hasTouchScreen = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

    // Mobile/tablet if: user agent says mobile, OR has touch screen with narrow viewport
    // Viewport check prevents desktop users with virtual touch devices (Game Glass, Tobii eye tracker,
    // RODECaster, drawing tablets) from incorrectly getting mobile layout
    return isMobileDevice || (hasTouchScreen && window.innerWidth <= 1024);
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
