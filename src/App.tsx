import { useState, useEffect } from 'react';
import './App.css';
import type { MiningConfiguration, Ship, Rock, MiningGroup } from './types';
import { SHIPS, LASER_HEADS } from './types';
import { createEmptyConfig, calculateBreakability, calculateGroupBreakability } from './utils/calculator';
import { saveCurrentConfiguration, loadCurrentConfiguration } from './utils/storage';
import ShipSelector from './components/ShipSelector';
import LaserPanel from './components/LaserPanel';
import RockInput from './components/RockInput';
import ResultDisplay from './components/ResultDisplay';
import GadgetSelector from './components/GadgetSelector';
import ConfigManager from './components/ConfigManager';
import ShipPoolManager from './components/ShipPoolManager';
import TabNavigation, { TabType } from './components/TabNavigation';

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
  const [miningGroup, setMiningGroup] = useState<MiningGroup>({
    ships: [],
    gadgets: [null, null, null],
  });
  const [useMiningGroup, setUseMiningGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Auto-save when config or ship changes
  useEffect(() => {
    saveCurrentConfiguration(selectedShip, config);
  }, [selectedShip, config]);

  // Calculate result based on mode (single ship or mining group)
  const result = useMiningGroup
    ? calculateGroupBreakability(miningGroup, rock)
    : calculateBreakability(config, rock);

  const handleShipChange = (ship: Ship) => {
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

      <div className="content-wrapper">
        {/* Mode toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-button ${!useMiningGroup ? 'active' : ''}`}
            onClick={() => setUseMiningGroup(false)}
          >
            Single Ship
          </button>
          <button
            className={`mode-button ${useMiningGroup ? 'active' : ''}`}
            onClick={() => setUseMiningGroup(true)}
          >
            Mining Group
          </button>
        </div>

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <ResultDisplay
                result={result}
                rock={rock}
                miningGroup={useMiningGroup ? miningGroup : undefined}
              />
            </div>
          )}

          {/* Rock Config Tab */}
          {activeTab === 'rock' && (
            <div className="rock-config-tab">
              <RockInput rock={rock} onChange={setRock} />

              {useMiningGroup ? (
                <GadgetSelector
                  gadgets={miningGroup.gadgets}
                  onChange={(gadgets) => setMiningGroup({ ...miningGroup, gadgets })}
                />
              ) : (
                <GadgetSelector
                  gadgets={config.gadgets}
                  onChange={(gadgets) => setConfig({ ...config, gadgets })}
                />
              )}
            </div>
          )}

          {/* Mining Config Tab */}
          {activeTab === 'mining' && (
            <div className="mining-config-tab">
              {useMiningGroup ? (
                <ShipPoolManager
                  miningGroup={miningGroup}
                  onChange={setMiningGroup}
                />
              ) : (
                <>
                  <ShipSelector
                    selectedShip={selectedShip}
                    onShipChange={handleShipChange}
                  />

                  <div className="lasers-container">
                    <h2>Laser Configuration</h2>
                    {config.lasers.map((laser, index) => (
                      <LaserPanel
                        key={index}
                        laserIndex={index}
                        laser={laser}
                        selectedShip={selectedShip}
                        onChange={(updatedLaser) => {
                          const newLasers = [...config.lasers];
                          newLasers[index] = updatedLaser;
                          setConfig({ ...config, lasers: newLasers });
                        }}
                      />
                    ))}
                  </div>

                  <ConfigManager
                    currentShip={selectedShip}
                    currentConfig={config}
                    onLoad={handleLoadConfiguration}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
