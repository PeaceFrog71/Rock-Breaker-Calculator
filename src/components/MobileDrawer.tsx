import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSwipeToClose } from '../hooks/useSwipeToClose';
import './MobileDrawer.css';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  side: 'left' | 'right' | 'bottom';
  title: string;
  tabLabel: string;
  tabImage?: string;  // Optional image URL for tab label (for classic iPad support)
  children: ReactNode;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  onOpen,
  side,
  title,
  tabLabel,
  tabImage,
  children,
}: MobileDrawerProps) {
  const drawerRef = useSwipeToClose({ side, isOpen, onClose });

  // Toggle body class to hide Ko-fi overlay when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('drawer-open');
    }
    return () => {
      // Only remove if no other drawers are open
      const openDrawers = document.querySelectorAll('.mobile-drawer.open');
      if (openDrawers.length === 0) {
        document.body.classList.remove('drawer-open');
      }
    };
  }, [isOpen]);

  // Render backdrop and drawer via portal to escape all stacking contexts
  const drawerContent = (
    <>
      {/* Backdrop - visible when drawer is open */}
      {isOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close drawer"
        />
      )}

      {/* Drawer Panel */}
      <div ref={drawerRef} className={`mobile-drawer ${side} ${isOpen ? 'open' : ''}`}>
        {title ? (
          <div className="mobile-drawer-header">
            <h3>{title}</h3>
            <button
              className="mobile-drawer-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="mobile-drawer-content">
          {!title && (
            <button
              className="mobile-drawer-close mobile-drawer-close-inline"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          )}
          {children}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Edge Tab - stays in normal DOM flow for positioning */}
      {!isOpen && (
        <button
          className={`mobile-drawer-tab ${side}`}
          onClick={onOpen}
          aria-label={`Open ${title || tabLabel}`}
        >
          {tabImage ? (
            <img
              src={tabImage}
              alt={tabLabel}
              className="mobile-drawer-tab-image"
            />
          ) : (
            <span className="mobile-drawer-tab-text">{tabLabel}</span>
          )}
        </button>
      )}

      {/* Portal: render backdrop + drawer directly on document.body to escape stacking contexts */}
      {createPortal(drawerContent, document.body)}
    </>
  );
}
