import { useState, useEffect } from 'react';
import type { Ship, ShipInstance, MiningConfiguration, LaserConfiguration } from '../types';
import { SHIPS } from '../types';
import { initializeDefaultLasersForShip } from '../utils/shipDefaults';
import LaserPanel from './LaserPanel';
import './ShipConfigModal.css';

interface ShipConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shipInstance: ShipInstance) => void;
  editingShip?: ShipInstance; // If provided, we're editing an existing ship
}

export default function ShipConfigModal({ isOpen, onClose, onSave, editingShip }: ShipConfigModalProps) {
  const [selectedShip, setSelectedShip] = useState<Ship>(SHIPS[0]);
  const [shipName, setShipName] = useState<string>(SHIPS[0].name);
  const [config, setConfig] = useState<MiningConfiguration>(initializeDefaultLasersForShip(SHIPS[0]));
  const [isNameCustomized, setIsNameCustomized] = useState<boolean>(false);

  // Update state when editingShip or isOpen changes
  useEffect(() => {
    if (isOpen) {
      if (editingShip) {
        setSelectedShip(editingShip.ship);
        setShipName(editingShip.name);
        setConfig(editingShip.config);
        setIsNameCustomized(editingShip.name !== editingShip.ship.name);
      } else {
        const defaultShip = SHIPS[0];
        setSelectedShip(defaultShip);
        setShipName(defaultShip.name);
        setConfig(initializeDefaultLasersForShip(defaultShip));
        setIsNameCustomized(false);
      }
    }
  }, [isOpen, editingShip]);

  if (!isOpen) return null;

  const handleShipChange = (shipId: string) => {
    const ship = SHIPS.find((s) => s.id === shipId);
    if (!ship) return;

    setSelectedShip(ship);

    // Only update ship name if user hasn't customized it
    if (!isNameCustomized) {
      setShipName(ship.name);
    }

    setConfig(initializeDefaultLasersForShip(ship));
  };

  const handleNameChange = (newName: string) => {
    setShipName(newName);
    // Mark as customized if user changes name to something other than ship type
    setIsNameCustomized(newName !== selectedShip.name);
  };

  const handleSave = () => {
    const shipInstance: ShipInstance = {
      id: editingShip?.id || `ship-${Date.now()}`,
      ship: selectedShip,
      name: shipName,
      config: config,
      isActive: editingShip?.isActive !== undefined ? editingShip.isActive : true,
    };

    onSave(shipInstance);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingShip ? 'Edit Ship Configuration' : 'Add Ship to Mining Group'}</h2>
          <button className="close-button" onClick={handleCancel} title="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Ship Name</label>
            <input
              type="text"
              value={shipName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter ship name..."
            />
          </div>

          <div className="form-group">
            <label>Ship Type</label>
            <select
              value={selectedShip.id}
              onChange={(e) => handleShipChange(e.target.value)}
            >
              {SHIPS.map((ship) => (
                <option key={ship.id} value={ship.id}>
                  {ship.name} ({ship.description})
                </option>
              ))}
            </select>
          </div>

          <div className="laser-configuration">
            <h3>Laser Configuration</h3>
            {config.lasers.map((laser, index) => (
              <div key={index} className="laser-config-row">
                <LaserPanel
                  laserIndex={index}
                  laser={laser}
                  selectedShip={selectedShip}
                  showMannedToggle={selectedShip.id === 'mole'}
                  onChange={(updatedLaser: LaserConfiguration) => {
                    const newLasers = [...config.lasers];
                    newLasers[index] = updatedLaser;
                    setConfig({ ...config, lasers: newLasers });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {editingShip ? 'Save Changes' : 'Add Ship'}
          </button>
        </div>
      </div>
    </div>
  );
}
