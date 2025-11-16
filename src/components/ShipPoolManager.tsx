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
    onChange({ ships: updatedShips });
  };

  const handleSaveShip = (shipInstance: ShipInstance) => {
    let updatedShips: ShipInstance[];

    if (editingShip) {
      // Update existing ship
      updatedShips = miningGroup.ships.map((s) =>
        s.id === shipInstance.id ? shipInstance : s
      );
    } else {
      // Add new ship
      // Assign a position around the rock (evenly distributed)
      const position = (miningGroup.ships.length * 360) / (miningGroup.ships.length + 1);
      shipInstance.position = position;
      updatedShips = [...miningGroup.ships, shipInstance];
    }

    // Recalculate positions to evenly distribute ships
    updatedShips = updatedShips.map((ship, index) => ({
      ...ship,
      position: (index * 360) / updatedShips.length,
    }));

    onChange({ ships: updatedShips });
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
              <div key={ship.id} className="ship-card">
                <div className="ship-card-header">
                  <div className="ship-info">
                    <h3>{ship.name}</h3>
                    <p className="ship-type">{ship.ship.name}</p>
                  </div>
                  <div className="ship-actions">
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
                    <div className="summary-item">
                      <span className="label">Gadgets:</span>
                      <span className="value">
                        {ship.config.gadgets.filter((g) => g && g.id !== 'none').length} / 3
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
