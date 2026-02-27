import { useRef, useEffect, useCallback } from 'react';

type DrawerSide = 'left' | 'right' | 'bottom';

interface UseSwipeToCloseOptions {
  side: DrawerSide;
  isOpen: boolean;
  onClose: () => void;
  threshold?: number; // Fraction of drawer size to trigger close (0-1, default 0.3)
}

/**
 * Hook that adds swipe-to-close gesture support for a drawer element.
 * Returns a ref to attach to the drawer panel element.
 *
 * - Left drawer: swipe left to close
 * - Right drawer: swipe right to close
 * - Bottom drawer: swipe down to close
 *
 * During the swipe, the drawer follows the finger via inline transform.
 * On release, it either snaps back or completes the close animation.
 */
export function useSwipeToClose({
  side,
  isOpen,
  onClose,
  threshold = 0.3,
}: UseSwipeToCloseOptions) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchState = useRef<{
    startX: number;
    startY: number;
    startedOnScrollable: boolean;
    tracking: boolean;
    directionLocked: boolean;
  } | null>(null);

  const isHorizontal = side === 'left' || side === 'right';

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];

    // Check if the touch started on a scrollable element
    let el = e.target as HTMLElement | null;
    let startedOnScrollable = false;
    while (el && el !== drawerRef.current) {
      if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
        const style = window.getComputedStyle(el);
        const overflow = style.overflowY;
        if (overflow === 'auto' || overflow === 'scroll') {
          startedOnScrollable = true;
          break;
        }
      }
      el = el.parentElement;
    }

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startedOnScrollable,
      tracking: false,
      directionLocked: false,
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const state = touchState.current;
    if (!state) return;

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    // Lock direction after enough movement (10px)
    if (!state.directionLocked) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 10 && absDy < 10) return; // Not enough movement yet

      state.directionLocked = true;

      if (isHorizontal) {
        // For left/right drawers, we need horizontal movement dominant
        if (absDy > absDx) {
          // Vertical dominant — let it scroll, don't track
          touchState.current = null;
          return;
        }
      } else {
        // For bottom drawer, we need downward movement dominant
        if (absDx > absDy) {
          // Horizontal dominant — don't track
          touchState.current = null;
          return;
        }
      }

      // Check if scrollable content can scroll in the scroll direction
      if (state.startedOnScrollable && !isHorizontal) {
        // Bottom drawer: only intercept if content is scrolled to top and swiping down
        let el = e.target as HTMLElement | null;
        while (el && el !== drawerRef.current) {
          if (el.scrollHeight > el.clientHeight) {
            const style = window.getComputedStyle(el);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
              if (el.scrollTop > 0 && dy > 0) {
                // Content has scroll position and user is swiping down — let content scroll
                touchState.current = null;
                return;
              }
              break;
            }
          }
          el = el.parentElement;
        }
      }

      state.tracking = true;
    }

    if (!state.tracking) return;

    // Calculate the dismiss-direction offset
    let offset: number;
    if (side === 'left') {
      offset = Math.min(0, dx); // Only allow swiping left (negative)
    } else if (side === 'right') {
      offset = Math.max(0, dx); // Only allow swiping right (positive)
    } else {
      offset = Math.max(0, dy); // Only allow swiping down (positive)
    }

    if (offset === 0) return;

    // Prevent page scroll while we're tracking the swipe
    e.preventDefault();

    // Apply inline transform to follow the finger
    const drawer = drawerRef.current;
    if (drawer) {
      if (isHorizontal) {
        drawer.style.transform = `translateX(${offset}px)`;
      } else {
        drawer.style.transform = `translateY(${offset}px)`;
      }
      drawer.style.transition = 'none';
    }
  }, [side, isHorizontal]);

  const handleTouchEnd = useCallback(() => {
    const state = touchState.current;
    const drawer = drawerRef.current;
    touchState.current = null;

    if (!state?.tracking || !drawer) {
      // No swipe was tracked — clean up
      if (drawer) {
        drawer.style.transform = '';
        drawer.style.transition = '';
      }
      return;
    }

    // Get how far the drawer was dragged
    const rect = drawer.getBoundingClientRect();
    const drawerSize = isHorizontal ? rect.width : rect.height;
    const currentTransform = new DOMMatrix(window.getComputedStyle(drawer).transform);
    const offset = isHorizontal
      ? Math.abs(currentTransform.m41)
      : Math.abs(currentTransform.m42);

    const fraction = offset / drawerSize;

    if (fraction >= threshold) {
      // Past threshold — close the drawer with animation
      drawer.style.transition = 'transform 0.2s ease-out';
      if (side === 'left') {
        drawer.style.transform = 'translateX(-100%)';
      } else if (side === 'right') {
        drawer.style.transform = 'translateX(100%)';
      } else {
        drawer.style.transform = 'translateY(100%)';
      }

      // Wait for animation to finish, then trigger actual close
      const onTransitionEnd = () => {
        drawer.removeEventListener('transitionend', onTransitionEnd);
        drawer.style.transform = '';
        drawer.style.transition = '';
        onClose();
      };
      drawer.addEventListener('transitionend', onTransitionEnd);
    } else {
      // Below threshold — snap back
      drawer.style.transition = 'transform 0.2s ease-out';
      drawer.style.transform = isHorizontal ? 'translateX(0)' : 'translateY(0)';

      const onTransitionEnd = () => {
        drawer.removeEventListener('transitionend', onTransitionEnd);
        drawer.style.transform = '';
        drawer.style.transition = '';
      };
      drawer.addEventListener('transitionend', onTransitionEnd);
    }
  }, [side, isHorizontal, threshold, onClose]);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer || !isOpen) return;

    drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
    drawer.addEventListener('touchmove', handleTouchMove, { passive: false });
    drawer.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      drawer.removeEventListener('touchstart', handleTouchStart);
      drawer.removeEventListener('touchmove', handleTouchMove);
      drawer.removeEventListener('touchend', handleTouchEnd);
      // Clean up any lingering inline styles
      drawer.style.transform = '';
      drawer.style.transition = '';
    };
  }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return drawerRef;
}
