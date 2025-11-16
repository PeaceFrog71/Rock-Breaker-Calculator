import { useState, useEffect } from 'react';
import './App.css';
import type { MiningConfiguration, Ship, Rock } from './types';
import { SHIPS } from './types';
import { createEmptyConfig, calculateBreakability } from './utils/calculator';
import { saveCurrentConfiguration, loadCurrentConfiguration } from './utils/storage';
import ShipSelector from './components/ShipSelector';
import LaserPanel from './components/LaserPanel';
import RockInput from './components/RockInput';
import ResultDisplay from './components/ResultDisplay';
import GadgetSelector from './components/GadgetSelector';
import ConfigManager from './components/ConfigManager';

function App() {
  // Load saved state or use defaults
  const loadedState = loadCurrentConfiguration();
  const [selectedShip, setSelectedShip] = useState<Ship>(
    loadedState?.ship || SHIPS[0]
  );
  const [config, setConfig] = useState<MiningConfiguration>(
    loadedState?.config || createEmptyConfig(SHIPS[0].laserSlots)
  );
  const [rock, setRock] = useState<Rock>({
    mass: 8431,
    resistance: 32,
    name: 'Example Rock',
  });

  // Auto-save when config or ship changes
  useEffect(() => {
    saveCurrentConfiguration(selectedShip, config);
  }, [selectedShip, config]);

  const result = calculateBreakability(config, rock);

  const handleShipChange = (ship: Ship) => {
    setSelectedShip(ship);
    setConfig(createEmptyConfig(ship.laserSlots));
  };

  const handleLoadConfiguration = (ship: Ship, loadedConfig: MiningConfiguration) => {
    setSelectedShip(ship);
    setConfig(loadedConfig);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Rock Breaker Calculator</h1>
        <p className="subtitle">Star Citizen Mining Tool</p>
      </header>

      <div className="main-container">
        <div className="left-panel">
          <ShipSelector
            selectedShip={selectedShip}
            onShipChange={handleShipChange}
          />

          <GadgetSelector
            gadgets={config.gadgets}
            onChange={(gadgets) => setConfig({ ...config, gadgets })}
          />

          <RockInput rock={rock} onChange={setRock} />

          <ConfigManager
            currentShip={selectedShip}
            currentConfig={config}
            onLoad={handleLoadConfiguration}
          />
        </div>

        <div className="center-panel">
          <ResultDisplay result={result} rock={rock} />
        </div>

        <div className="right-panel">
          <div className="lasers-container">
            <h2>Laser Configuration</h2>
            {config.lasers.map((laser, index) => (
              <LaserPanel
                key={index}
                laserIndex={index}
                laser={laser}
                onChange={(updatedLaser) => {
                  const newLasers = [...config.lasers];
                  newLasers[index] = updatedLaser;
                  setConfig({ ...config, lasers: newLasers });
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
