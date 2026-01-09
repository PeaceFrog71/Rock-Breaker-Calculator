import { useState } from 'react';
import type { Ship } from '../types';
import { SHIPS } from '../types';
import { useMobileDetection } from '../hooks/useMobileDetection';
import './ShipSelector.css';

interface ShipSelectorProps {
  selectedShip: Ship;
  onShipChange: (ship: Ship) => void;
  configName?: string;
}

export default function ShipSelector({ selectedShip, onShipChange, configName }: ShipSelectorProps) {
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
      // Clicking different ship selects it and collapses
      onShipChange(ship);
      setIsExpanded(false);
    }
  };

  return (
    <div className={`ship-selector panel ${isMobile ? 'mobile' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <h2>
        Select Ship
        {configName && <span className="config-name">{isMobile ? '' : ': '}{configName}</span>}
      </h2>
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
