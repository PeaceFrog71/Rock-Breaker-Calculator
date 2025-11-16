import { useState } from 'react';
import type { Ship, ShipInstance, MiningConfiguration, LaserConfiguration } from '../types';
import { SHIPS, LASER_HEADS } from '../types';
import { createEmptyConfig } from '../utils/calculator';
import LaserPanel from './LaserPanel';
import './ShipConfigModal.css';

interface ShipConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shipInstance: ShipInstance) => void;
  editingShip?: ShipInstance; // If provided, we're editing an existing ship
}

export default function ShipConfigModal({ isOpen, onClose, onSave, editingShip }: ShipConfigModalProps) {
  const [selectedShip, setSelectedShip] = useState<Ship>(
    editingShip?.ship || SHIPS[0]
  );
  const [shipName, setShipName] = useState<string>(
    editingShip?.name || `${SHIPS[0].name} 1`
  );
  const [config, setConfig] = useState<MiningConfiguration>(
    editingShip?.config || createEmptyConfig(SHIPS[0].laserSlots)
  );

  if (!isOpen) return null;

  const handleShipChange = (shipId: string) => {
    const ship = SHIPS.find((s) => s.id === shipId);
    if (!ship) return;

    setSelectedShip(ship);
    const newConfig = createEmptyConfig(ship.laserSlots);

    // If GOLEM, automatically set Pitman laser
    if (ship.id === 'golem') {
      const pitmanLaser = LASER_HEADS.find((h) => h.id === 'pitman');
      if (pitmanLaser) {
        newConfig.lasers[0].laserHead = pitmanLaser;
      }
    }

    setConfig(newConfig);
  };

  const handleSave = () => {
    const shipInstance: ShipInstance = {
      id: editingShip?.id || `ship-${Date.now()}`,
      ship: selectedShip,
      name: shipName,
      config: config,
      position: editingShip?.position,
    };

    onSave(shipInstance);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingShip ? 'Edit Ship Configuration' : 'Add Ship to Mining Group'}</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Ship Name</label>
            <input
              type="text"
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
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
                {selectedShip.id === 'mole' && (
                  <div className="manned-toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={laser.isManned !== false}
                        onChange={(e) => {
                          const newLasers = [...config.lasers];
                          newLasers[index] = { ...laser, isManned: e.target.checked };
                          setConfig({ ...config, lasers: newLasers });
                        }}
                      />
                      <span>Manned</span>
                    </label>
                  </div>
                )}
                <LaserPanel
                  laserIndex={index}
                  laser={laser}
                  selectedShip={selectedShip}
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
