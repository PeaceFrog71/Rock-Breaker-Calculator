import { useState } from 'react';
import type { MiningGroup, ShipInstance } from '../types';
import ShipConfigModal from './ShipConfigModal';
import './ShipPoolManager.css';

interface ShipPoolManagerProps {
  miningGroup: MiningGroup;
  onChange: (miningGroup: MiningGroup) => void;
}

export default function ShipPoolManager({ miningGroup, onChange }: ShipPoolManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<ShipInstance | undefined>(undefined);

  const handleAddShip = () => {
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

      // Assign position at 45-degree intervals (0, 45, 90, 135, 180, 225, 270, 315)
      const positions = [0, 45, 90, 135, 180, 225, 270, 315];
      const usedPositions = miningGroup.ships.map(s => s.position);
      const availablePosition = positions.find(pos => !usedPositions.includes(pos)) || 0;

      shipInstance.position = availablePosition;
      shipInstance.isActive = true; // New ships are active by default
      updatedShips = [...miningGroup.ships, shipInstance];
    }

    onChange({ ...miningGroup, ships: updatedShips });
  };

  return (
    <div className="ship-pool-manager">
      <div className="ship-pool-header">
        <h2>Mining Group</h2>
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
                      className="remove-button"
                      onClick={() => handleRemoveShip(ship.id)}
                      title="Remove ship from group"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="ship-card-body">
                  <div className="ship-summary">
                    <div className="summary-item">
                      <span className="label">Lasers:</span>
                      <span className="value">
                        {ship.config.lasers.filter((l) => l.laserHead && l.laserHead.id !== 'none').length} / {ship.ship.laserSlots}
                      </span>
                    </div>
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
    </div>
  );
}
