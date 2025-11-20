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
  const [gadgetCount, setGadgetCount] = useState(3);
  const [gadgetEnabled, setGadgetEnabled] = useState<boolean[]>([true, true, true]);

  // Update gadgetEnabled array when gadgetCount changes
  useEffect(() => {
    setGadgetEnabled(prev => {
      const newEnabled = Array(gadgetCount).fill(true);
      // Preserve existing enabled states up to the new count
      for (let i = 0; i < Math.min(prev.length, gadgetCount); i++) {
        newEnabled[i] = prev[i];
      }
      return newEnabled;
    });
  }, [gadgetCount]);
  const [useMiningGroup, setUseMiningGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Auto-save when config or ship changes
  useEffect(() => {
    saveCurrentConfiguration(selectedShip, config);
  }, [selectedShip, config]);

  // Filter gadgets to only include enabled ones
  const enabledGadgets = gadgets.map((gadget, index) =>
    gadgetEnabled[index] ? gadget : null
  );

  // Calculate result based on mode (single ship or mining group)
  const result = useMiningGroup
    ? calculateGroupBreakability(miningGroup, rock, enabledGadgets)
    : calculateBreakability(config, rock, enabledGadgets, selectedShip.id);

  // Handle toggling gadget enabled state
  const handleToggleGadget = (index: number) => {
    const newEnabled = [...gadgetEnabled];
    newEnabled[index] = !newEnabled[index];
    setGadgetEnabled(newEnabled);
  };

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

  const handleToggleLaser = (shipId: string, laserIndex: number) => {
    const updatedShips = miningGroup.ships.map((s) => {
      if (s.id === shipId) {
        const updatedLasers = [...s.config.lasers];
        const currentLaser = updatedLasers[laserIndex];
        // Toggle isManned state (undefined or true -> false, false -> true)
        updatedLasers[laserIndex] = {
          ...currentLaser,
          isManned: currentLaser.isManned === false ? true : false,
        };

        // Check if all lasers are unmanned
        const allUnmanned = updatedLasers.every(laser => laser.isManned === false);
        // Check if any laser is manned
        const anyManned = updatedLasers.some(laser => laser.isManned !== false);

        return {
          ...s,
          config: { ...s.config, lasers: updatedLasers },
          // If all lasers are unmanned, deactivate the ship
          // If any laser is manned and ship was inactive, activate the ship
          isActive: allUnmanned ? false : (anyManned ? true : s.isActive),
        };
      }
      return s;
    });
    setMiningGroup({ ...miningGroup, ships: updatedShips });
  };

  const handleSingleShipToggleLaser = (laserIndex: number) => {
    const updatedLasers = [...config.lasers];
    const currentLaser = updatedLasers[laserIndex];

    // Count how many lasers are currently manned
    const mannedCount = updatedLasers.filter(laser => laser.isManned !== false).length;

    // If this is the last manned laser and we're trying to unman it, don't allow it
    if (mannedCount === 1 && currentLaser.isManned !== false) {
      return; // Prevent unmanning the last laser
    }

    // Toggle isManned state (undefined or true -> false, false -> true)
    updatedLasers[laserIndex] = {
      ...currentLaser,
      isManned: currentLaser.isManned === false ? true : false,
    };
    setConfig({ ...config, lasers: updatedLasers });
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
                gadgetEnabled={gadgetEnabled}
                onToggleGadget={handleToggleGadget}
                miningGroup={useMiningGroup ? miningGroup : undefined}
                selectedShip={!useMiningGroup ? selectedShip : undefined}
                config={!useMiningGroup ? config : undefined}
                onToggleShip={useMiningGroup ? handleToggleShip : undefined}
                onToggleLaser={useMiningGroup ? handleToggleLaser : undefined}
                onSingleShipToggleLaser={!useMiningGroup && selectedShip.id === 'mole' ? handleSingleShipToggleLaser : undefined}
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
                gadgetCount={gadgetCount}
                onGadgetCountChange={setGadgetCount}
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
