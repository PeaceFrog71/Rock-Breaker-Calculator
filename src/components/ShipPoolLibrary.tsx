import { useState } from 'react';
import type { ShipInstance } from '../types';
import type { SavedShipInstance, SavedConfiguration } from '../utils/storage';
import {
  getSavedShipInstances,
  deleteShipInstance,
  loadShipInstance,
  getSavedConfigurations,
  loadConfiguration,
} from '../utils/storage';
import './ConfigManager.css';

interface ShipPoolLibraryProps {
  onLoadShip: (shipInstance: ShipInstance) => void;
}

export default function ShipPoolLibrary({ onLoadShip }: ShipPoolLibraryProps) {
  const [savedShips, setSavedShips] = useState<SavedShipInstance[]>(
    getSavedShipInstances()
  );
  const [savedConfigs] = useState<SavedConfiguration[]>(
    getSavedConfigurations()
  );

  const handleLoad = (id: string) => {
    const ship = loadShipInstance(id);
    if (ship) {
      // Create a new ship instance with a new ID to avoid conflicts
      const newShipInstance: ShipInstance = {
        ...ship.shipInstance,
        id: `ship-${Date.now()}`,
        position: undefined, // Will be assigned when added to group
      };
      onLoadShip(newShipInstance);
      alert(`Loaded ship "${ship.name}"`);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete saved ship "${name}"?`)) {
      deleteShipInstance(id);
      setSavedShips(getSavedShipInstances());
    }
  };

  const handleLoadFromConfig = (id: string) => {
    const config = loadConfiguration(id);
    if (config) {
      // Convert single ship configuration to ship instance
      const newShipInstance: ShipInstance = {
        id: `ship-${Date.now()}`,
        name: config.name,
        ship: config.ship,
        config: config.config,
        isActive: true,
        position: undefined, // Will be assigned when added to group
      };
      onLoadShip(newShipInstance);
      alert(`Loaded ship "${config.name}" from Single Ship Library`);
    }
  };

  return (
    <div className="config-manager panel">
      <h2>Ship Library</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
        Load ships from your saved configurations or from the single ship library.
      </p>

      {/* Single Ship Configurations */}
      <h3 style={{ marginTop: '1.5rem', fontSize: '1rem', color: 'var(--accent-cyan)' }}>Single Ship Library</h3>
      <div className="configs-list">
        {savedConfigs.length === 0 ? (
          <p className="empty-message">No saved single ships. Save ships in Single Ship mode.</p>
        ) : (
          savedConfigs.map((config) => (
            <div key={config.id} className="config-item">
              <div className="config-info">
                <div className="config-name">{config.name}</div>
                <div className="config-meta">
                  {config.ship.name} • {config.config.lasers.filter(l => l.laserHead && l.laserHead.id !== 'none').length}/{config.ship.laserSlots} lasers configured
                </div>
                <div className="config-date">
                  {new Date(config.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="config-buttons">
                <button
                  onClick={() => handleLoadFromConfig(config.id)}
                  className="btn-load"
                  title="Add to Mining Group"
                >
                  + Add
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mining Group Ship Instances */}
      <h3 style={{ marginTop: '1.5rem', fontSize: '1rem', color: 'var(--accent-cyan)' }}>Mining Group Library</h3>
      <div className="configs-list">
        {savedShips.length === 0 ? (
          <p className="empty-message">No saved group ships. Click "Save to Library" in ship card actions.</p>
        ) : (
          savedShips.map((savedShip) => (
            <div key={savedShip.id} className="config-item">
              <div className="config-info">
                <div className="config-name">{savedShip.name}</div>
                <div className="config-meta">
                  {savedShip.shipInstance.ship.name} • {savedShip.shipInstance.config.lasers.filter(l => l.laserHead && l.laserHead.id !== 'none').length}/{savedShip.shipInstance.ship.laserSlots} lasers configured
                </div>
                <div className="config-date">
                  {new Date(savedShip.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="config-buttons">
                <button
                  onClick={() => handleLoad(savedShip.id)}
                  className="btn-load"
                  title="Add to Mining Group"
                >
                  + Add
                </button>
                <button
                  onClick={() => handleDelete(savedShip.id, savedShip.name)}
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
