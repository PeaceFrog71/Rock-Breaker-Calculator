import { useState } from 'react';
import type { Ship } from '../types';
import { SHIPS } from '../types';
import { useMobileDetection } from '../hooks/useMobileDetection';
import './ShipSelector.css';

interface ShipSelectorProps {
  selectedShip: Ship;
  onShipChange: (ship: Ship) => void;
  configName?: string;
  onSave?: () => void;
  onClear?: () => void;
}

export default function ShipSelector({ selectedShip, onShipChange, configName, onSave, onClear }: ShipSelectorProps) {
  const isMobile = useMobileDetection();
  const [isExpanded, setIsExpanded] = useState(false);

  // On mobile: show only selected ship when collapsed, all ships when expanded
  // On desktop: always show all ships
  const shipsToShow = isMobile && !isExpanded
    ? SHIPS.filter(ship => ship.id === selectedShip.id)
    : SHIPS;

  const handleShipClick = (ship: Ship) => {
    if (ship.id === selectedShip.id) {
      // Clicking selected ship toggles expansion on mobile
      if (isMobile) {
        setIsExpanded(!isExpanded);
      }
    } else {
      // Clicking different ship selects it and auto-collapses
      onShipChange(ship);
      if (isMobile) {
        setIsExpanded(false);
      }
    }
  };

  return (
    <div className={`ship-selector panel ${isMobile ? 'mobile' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="ship-selector-header">
        <h2>
          <span className="select-label">Select Ship</span>
          {configName && <span className="config-name">{configName}</span>}
        </h2>
        {(onSave || onClear) && (
          <div className="ship-selector-actions">
            {onSave && (
              <button className="ship-action-btn save-btn" onClick={onSave} title="Save configuration">
                💾
              </button>
            )}
            {onClear && (
              <button className="ship-action-btn clear-btn" onClick={onClear} title="Clear to defaults">
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
      <div className="ship-grid">
        {shipsToShow.map((ship) => (
          <button
            key={ship.id}
            className={`ship-button ${selectedShip.id === ship.id ? 'active' : ''}`}
            onClick={() => handleShipClick(ship)}
          >
            <div className="ship-name">{ship.name}</div>
            <div className="ship-lasers">{ship.laserSlots} Laser{ship.laserSlots > 1 ? 's' : ''}</div>
            {/* Expand indicator on mobile when collapsed */}
            {isMobile && !isExpanded && selectedShip.id === ship.id && (
              <span className="expand-indicator">▼</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
