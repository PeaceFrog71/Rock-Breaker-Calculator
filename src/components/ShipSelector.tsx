import type { Ship } from '../types';
import { SHIPS } from '../types';
import './ShipSelector.css';

interface ShipSelectorProps {
  selectedShip: Ship;
  onShipChange: (ship: Ship) => void;
  configName?: string;
}

export default function ShipSelector({ selectedShip, onShipChange, configName }: ShipSelectorProps) {
  return (
    <div className="ship-selector panel">
      <h2>
        Select Ship
        {configName && <span className="config-name">: {configName}</span>}
      </h2>
      <div className="ship-grid">
        {SHIPS.map((ship) => (
          <button
            key={ship.id}
            className={`ship-button ${selectedShip.id === ship.id ? 'active' : ''}`}
            onClick={() => onShipChange(ship)}
          >
            <div className="ship-name">{ship.name}</div>
            <div className="ship-lasers">{ship.laserSlots} Laser{ship.laserSlots > 1 ? 's' : ''}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
