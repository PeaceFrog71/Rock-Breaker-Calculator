import { useState } from 'react';
import type { MiningConfiguration, Ship, LaserConfiguration } from '../types';
import { useMobileDetection } from '../hooks/useMobileDetection';
import LaserPanel from './LaserPanel';
import './LasersSetup.css';

interface LasersSetupProps {
  config: MiningConfiguration;
  selectedShip: Ship;
  onLaserChange: (index: number, laser: LaserConfiguration) => void;
}

export default function LasersSetup({ config, selectedShip, onLaserChange }: LasersSetupProps) {
  const isMobile = useMobileDetection();

  // Check if any laser is configured
  const hasAnyLaser = config.lasers.some(laser => laser.laserHead && laser.laserHead.id !== 'none');

  // Start collapsed on mobile if already configured, expanded if not
  const [isExpanded, setIsExpanded] = useState(!hasAnyLaser);

  const handleHeaderClick = () => {
    if (isMobile) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`lasers-setup panel ${isMobile ? 'mobile' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="lasers-header" onClick={handleHeaderClick}>
        <h2>Laser Setup</h2>
        {isMobile && (
          <span className="expand-indicator">{isExpanded ? '▲' : '▼'}</span>
        )}
      </div>

      {(!isMobile || isExpanded) && (
        <div className="lasers-content">
          {config.lasers.map((laser, index) => (
            <LaserPanel
              key={index}
              laserIndex={index}
              laser={laser}
              selectedShip={selectedShip}
              showMannedToggle={selectedShip.id === 'mole'}
              onChange={(updatedLaser) => onLaserChange(index, updatedLaser)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
