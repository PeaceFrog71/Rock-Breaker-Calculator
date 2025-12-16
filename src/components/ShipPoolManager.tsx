import { useState } from 'react';
import type { MiningGroup, ShipInstance } from '../types';
import ShipConfigModal from './ShipConfigModal';
import ShipPoolLibrary from './ShipPoolLibrary';
import MiningGroupManager from './MiningGroupManager';
import { saveShipConfig, updateShipConfig, getSavedShipConfigs } from '../utils/storage';
import { calculateLaserPower } from '../utils/calculator';
import './ShipPoolManager.css';
import './ConfigManager.css';

interface ShipPoolManagerProps {
  miningGroup: MiningGroup;
  onChange: (miningGroup: MiningGroup) => void;
}

export default function ShipPoolManager({ miningGroup, onChange }: ShipPoolManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<ShipInstance | undefined>(undefined);

  const handleAddShip = () => {
    // Check max ships limit
    if (miningGroup.ships.length >= 4) {
      alert('Maximum of 4 ships allowed in mining group');
      return;
    }

    // Open modal to configure new ship
    setEditingShip(undefined);
    setIsModalOpen(true);
  };

  const handleEditShip = (ship: ShipInstance) => {
    setEditingShip(ship);
    setIsModalOpen(true);
  };

  const handleRemoveShip = (shipId: string) => {
    const updatedShips = miningGroup.ships.filter((s) => s.id !== shipId);
    onChange({ ...miningGroup, ships: updatedShips });
  };

  const handleToggleActive = (shipId: string) => {
    const updatedShips = miningGroup.ships.map((s) =>
      s.id === shipId ? { ...s, isActive: !s.isActive } : s
    );
    onChange({ ...miningGroup, ships: updatedShips });
  };

  const handleSaveShip = (shipInstance: ShipInstance) => {
    let updatedShips: ShipInstance[];

    if (editingShip) {
      // Update existing ship
      updatedShips = miningGroup.ships.map((s) =>
        s.id === shipInstance.id ? shipInstance : s
      );
    } else {
      // Add new ship (max 4 ships)
      if (miningGroup.ships.length >= 4) {
        alert('Maximum of 4 ships allowed in mining group');
        return;
      }

      shipInstance.isActive = true; // New ships are active by default
      updatedShips = [...miningGroup.ships, shipInstance];
    }

    onChange({ ...miningGroup, ships: updatedShips });
  };

  const handleSaveShipToLibrary = (ship: ShipInstance) => {
    const name = prompt('Enter a name for this ship configuration:', ship.name);
    if (!name || !name.trim()) return;

    const trimmedName = name.trim();
    const savedConfigs = getSavedShipConfigs();
    const existing = savedConfigs.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      if (!confirm(`"${existing.name}" already exists. Overwrite?`)) {
        return;
      }
      const updated = updateShipConfig(existing.id, trimmedName, ship.ship, ship.config);
      if (!updated) {
        alert('Failed to update the existing ship configuration. Saving as a new configuration instead.');
        saveShipConfig(trimmedName, ship.ship, ship.config);
      }
    } else {
      saveShipConfig(trimmedName, ship.ship, ship.config);
    }
  };

  const handleLoadShipFromLibrary = (shipInstance: ShipInstance) => {
    if (miningGroup.ships.length >= 4) {
      alert('Maximum of 4 ships allowed in mining group');
      return;
    }

    shipInstance.isActive = true;
    onChange({ ...miningGroup, ships: [...miningGroup.ships, shipInstance] });
  };

  const handleLoadMiningGroup = (loadedGroup: MiningGroup) => {
    onChange(loadedGroup);
  };

  return (
    <div className="ship-pool-manager">
      <div className="ship-pool-header">
        <h2>
          Mining Group
          {miningGroup.name && <span className="group-name">: {miningGroup.name}</span>}
        </h2>
        <button className="add-ship-button" onClick={handleAddShip}>
          + Add Ship
        </button>
      </div>

      <div className="ship-pool-content">
        {miningGroup.ships.length === 0 ? (
          <div className="empty-state">
            <p>No ships in mining group</p>
            <p className="hint">Click "Add Ship" to start building your mining fleet</p>
          </div>
        ) : (
          <div className="ships-list">
            {miningGroup.ships.map((ship) => (
              <div
                key={ship.id}
                className={`ship-card ${ship.isActive === false ? 'inactive' : 'active'}`}
                onClick={() => handleToggleActive(ship.id)}
                title={ship.isActive === false ? 'Click to activate ship' : 'Click to deactivate ship'}
              >
                <div className="ship-card-header">
                  <div className="ship-info">
                    <h3>
                      {ship.name}
                      <span className={`status-indicator ${ship.isActive === false ? 'off' : 'on'}`}>
                        {ship.isActive === false ? ' [OFF]' : ' [ON]'}
                      </span>
                    </h3>
                    <p className="ship-type">{ship.ship.name}</p>
                  </div>
                  <div className="ship-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="edit-button"
                      onClick={() => handleEditShip(ship)}
                      title="Edit ship configuration"
                    >
                      Edit
                    </button>
                    <button
                      className="save-library-button"
                      onClick={() => handleSaveShipToLibrary(ship)}
                      title="Save to Ship Library"
                    >
                      💾
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveShip(ship.id)}
                      title="Remove ship from group"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="ship-card-body">
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
                      const activeLasers = ship.config.lasers.filter(l => l.laserHead && l.laserHead.id !== 'none');
                      if (activeLasers.length <= 1) return null; // Only show sum for multi-laser ships (Mole)
                      const totalPower = activeLasers.reduce((sum, laser) => sum + calculateLaserPower(laser, true), 0);
                      return totalPower > 0 ? (
                        <span className="config-box stats-box">Σ {totalPower.toFixed(0)}</span>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ShipConfigModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingShip(undefined);
        }}
        onSave={handleSaveShip}
        editingShip={editingShip}
      />

      <MiningGroupManager
        currentMiningGroup={miningGroup}
        onLoad={handleLoadMiningGroup}
      />

      <ShipPoolLibrary onLoadShip={handleLoadShipFromLibrary} />
    </div>
  );
}
