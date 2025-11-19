import { useState, useEffect } from "react";
import "./App.css";
import type { MiningConfiguration, Ship, Rock, MiningGroup, Gadget } from "./types";
import { SHIPS, LASER_HEADS } from "./types";
import {
  createEmptyConfig,
  calculateBreakability,
  calculateGroupBreakability,
} from "./utils/calculator";
import {
  saveCurrentConfiguration,
  loadCurrentConfiguration,
} from "./utils/storage";
import ShipSelector from "./components/ShipSelector";
import LaserPanel from "./components/LaserPanel";
import RockInput from "./components/RockInput";
import ResultDisplay from "./components/ResultDisplay";
import GadgetSelector from "./components/GadgetSelector";
import ConfigManager from "./components/ConfigManager";
import ShipPoolManager from "./components/ShipPoolManager";
import TabNavigation, { type TabType } from "./components/TabNavigation";

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
    mass: 25000,
    resistance: 30,
    name: "The Rock",
  });
  const [miningGroup, setMiningGroup] = useState<MiningGroup>({
    ships: [],
  });
  const [gadgets, setGadgets] = useState<(Gadget | null)[]>([null, null, null]);
  const [useMiningGroup, setUseMiningGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Auto-save when config or ship changes
  useEffect(() => {
    saveCurrentConfiguration(selectedShip, config);
  }, [selectedShip, config]);

  // Calculate result based on mode (single ship or mining group)
  const result = useMiningGroup
    ? calculateGroupBreakability(miningGroup, rock, gadgets)
    : calculateBreakability(config, rock, gadgets);

  const handleShipChange = (ship: Ship) => {
    setSelectedShip(ship);
    const newConfig = createEmptyConfig(ship.laserSlots);

    // Set default laser heads based on ship type
    if (ship.id === "golem") {
      // GOLEM: Fixed Pitman laser
      const pitmanLaser = LASER_HEADS.find((h) => h.id === "pitman");
      if (pitmanLaser) {
        newConfig.lasers[0].laserHead = pitmanLaser;
        newConfig.lasers[0].modules = Array(pitmanLaser.moduleSlots).fill(null);
      }
    } else if (ship.id === "prospector") {
      // Prospector: Default to first S1 laser (Arbor MH1)
      const defaultS1Laser = LASER_HEADS.find((h) => h.size === 1 && h.id !== 'none' && h.id !== 'pitman');
      if (defaultS1Laser) {
        newConfig.lasers[0].laserHead = defaultS1Laser;
        newConfig.lasers[0].modules = Array(defaultS1Laser.moduleSlots).fill(null);
      }
    } else if (ship.id === "mole") {
      // MOLE: Default all 3 lasers to first S2 laser (Arbor MH2)
      const defaultS2Laser = LASER_HEADS.find((h) => h.size === 2 && h.id !== 'none');
      if (defaultS2Laser) {
        newConfig.lasers.forEach((laser) => {
          laser.laserHead = defaultS2Laser;
          laser.modules = Array(defaultS2Laser.moduleSlots).fill(null);
          laser.isManned = true; // Initialize as manned by default
        });
      }
    }

    setConfig(newConfig);
  };

  const handleLoadConfiguration = (
    ship: Ship,
    loadedConfig: MiningConfiguration
  ) => {
    setSelectedShip(ship);
    setConfig(loadedConfig);
  };

  const handleToggleShip = (shipId: string) => {
    const updatedShips = miningGroup.ships.map((s) =>
      s.id === shipId ? { ...s, isActive: !s.isActive } : s
    );
    setMiningGroup({ ...miningGroup, ships: updatedShips });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Rock Breaker Calculator</h1>
      </header>

      <div className="content-wrapper">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="overview-tab">
              <ResultDisplay
                result={result}
                rock={rock}
                gadgets={gadgets}
                miningGroup={useMiningGroup ? miningGroup : undefined}
                config={!useMiningGroup ? config : undefined}
                selectedShip={!useMiningGroup ? selectedShip : undefined}
                onToggleShip={useMiningGroup ? handleToggleShip : undefined}
              />
            </div>
          )}

          {/* Rock Config Tab */}
          {activeTab === "rock" && (
            <div className="rock-config-tab">
              <RockInput rock={rock} onChange={setRock} />

              <GadgetSelector
                gadgets={gadgets}
                onChange={setGadgets}
              />
            </div>
          )}

          {/* Mining Config Tab */}
          {activeTab === "mining" && (
            <div className="mining-config-tab">
              {/* Mode toggle */}
              <div className="mode-toggle">
                <button
                  className={`mode-button ${!useMiningGroup ? "active" : ""}`}
                  onClick={() => setUseMiningGroup(false)}>
                  Single Ship
                </button>
                <button
                  className={`mode-button ${useMiningGroup ? "active" : ""}`}
                  onClick={() => setUseMiningGroup(true)}>
                  Mining Group
                </button>
              </div>

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
                        showMannedToggle={selectedShip.id === 'mole'}
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
