import { useState, useEffect } from 'react';
import type { ShipInstance } from '../types';
import type { SavedShipConfig } from '../utils/storage';
import {
  getSavedShipConfigs,
  deleteShipConfig,
  createShipInstanceFromConfig,
} from '../utils/storage';
import { calculateLaserPower } from '../utils/calculator';
import { useMobileDetection } from '../hooks/useMobileDetection';
import './ConfigManager.css';

interface ShipPoolLibraryProps {
  onLoadShip: (shipInstance: ShipInstance) => void;
}

export default function ShipPoolLibrary({ onLoadShip }: ShipPoolLibraryProps) {
  const isMobile = useMobileDetection();
  const [savedShips, setSavedShips] = useState<SavedShipConfig[]>(
    getSavedShipConfigs()
  );

  // Refresh the ship list periodically to catch new saves
  useEffect(() => {
    const interval = setInterval(() => {
      setSavedShips(getSavedShipConfigs());
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  const handleLoad = (id: string) => {
    const ships = getSavedShipConfigs();
    const ship = ships.find((s) => s.id === id);
    if (ship) {
      // Create a ship instance from the saved config (makes a copy)
      const newShipInstance = createShipInstanceFromConfig(ship);
      onLoadShip(newShipInstance);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete saved ship "${name}"?`)) {
      deleteShipConfig(id);
      setSavedShips(getSavedShipConfigs());
    }
  };

  return (
    <div className="config-manager panel">
      <h2>Ship Library</h2>
      {!isMobile && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Load ships from your saved configurations. Ships saved from Single Ship mode or Mining Group mode appear here.
        </p>
      )}

      <div className="configs-list">
        {savedShips.length === 0 ? (
          <p className="empty-message">No saved ships. Save ships from Single Ship mode or click "Save to Library" in a ship card.</p>
        ) : (
          savedShips.sort((a, b) => a.name.localeCompare(b.name)).map((ship) => (
            <div key={ship.id} className="config-item">
              <div className="config-info">
                <div className="config-header">
                  <div className="config-name">{ship.name}</div>
                  <div className="config-meta">{ship.ship.name}</div>
                </div>
                <div className="config-details">
                  {ship.config.lasers
                    .filter(laser => laser.laserHead && laser.laserHead.id !== 'none')
                    .map((laser, idx) => {
                      const moduleCount = laser.modules.filter(m => m && m.id !== 'none').length;
                      const power = calculateLaserPower(laser, true);
                      return (
                        <span key={idx} className="config-box laser-box">
                          {laser.laserHead!.name}
                          {moduleCount > 0 && <span className="module-count">+{moduleCount}</span>}
                          <span className="power">{power.toFixed(0)}</span>
                        </span>
                      );
                    })}
                  {(() => {
                    const totalPower = ship.config.lasers.reduce((sum, laser) =>
                      sum + (laser.laserHead && laser.laserHead.id !== 'none' ? calculateLaserPower(laser, true) : 0), 0);
                    return totalPower > 0 ? (
                      <span className="config-box stats-box">Σ {totalPower.toFixed(0)}</span>
                    ) : null;
                  })()}
                </div>
                <div className="config-date">
                  {new Date(ship.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="config-buttons">
                <button
                  onClick={() => handleLoad(ship.id)}
                  className="btn-load"
                  title="Add to Mining Group"
                >
                  + Add
                </button>
                <button
                  onClick={() => handleDelete(ship.id, ship.name)}
                  className="btn-delete"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
