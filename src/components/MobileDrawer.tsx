import type { ReactNode } from 'react';
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
  return (
    <>
      {/* Edge Tab - visible when drawer is closed */}
      {!isOpen && (
        <button
          className={`mobile-drawer-tab ${side}`}
          onClick={onOpen}
          aria-label={`Open ${title}`}
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
      <div className={`mobile-drawer ${side} ${isOpen ? 'open' : ''}`}>
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
        <div className="mobile-drawer-content">
          {children}
        </div>
      </div>
    </>
  );
}
