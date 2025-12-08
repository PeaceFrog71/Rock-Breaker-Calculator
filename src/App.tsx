import { useState, useEffect, useMemo } from "react";
import "./App.css";
import type { MiningConfiguration, Ship, Rock, MiningGroup, Gadget } from "./types";
import { SHIPS, GADGETS } from "./types";
import {
  calculateBreakability,
  calculateGroupBreakability,
} from "./utils/calculator";
import {
  initializeDefaultLasersForShip,
} from "./utils/shipDefaults";
import {
  formatGadgetTooltip,
  getGadgetEffects,
} from "./utils/formatters";
import {
  saveCurrentConfiguration,
  loadCurrentConfiguration,
} from "./utils/storage";
import ShipSelector from "./components/ShipSelector";
import LaserPanel from "./components/LaserPanel";
import ResultDisplay from "./components/ResultDisplay";
import ConfigManager from "./components/ConfigManager";
import ShipPoolManager from "./components/ShipPoolManager";
import TabNavigation, { type TabType } from "./components/TabNavigation";
import HelpModal from "./components/HelpModal";
import ResistanceModeSelector from "./components/ResistanceModeSelector";
import pfLogo from "./assets/PFlogo.png";
import { version } from "../package.json";

function App() {
  // Load saved state or use defaults
  const loadedState = loadCurrentConfiguration();
  const [selectedShip, setSelectedShip] = useState<Ship>(
    loadedState?.ship || SHIPS[0]
  );
  const [config, setConfig] = useState<MiningConfiguration>(
    loadedState?.config || initializeDefaultLasersForShip(SHIPS[0])
  );
  const [rock, setRock] = useState<Rock>({
    mass: 25000,
    resistance: 30,
    name: "The Rock",
    resistanceMode: 'base',
    includeGadgetsInScan: false,
  });
  const [miningGroup, setMiningGroup] = useState<MiningGroup>({
    ships: [],
  });
  const [gadgets, setGadgets] = useState<(Gadget | null)[]>([null, null, null]);
  const [gadgetCount, setGadgetCount] = useState(3);
  const [gadgetEnabled, setGadgetEnabled] = useState<boolean[]>([true, true, true]);

  // Update gadgetEnabled array and trim gadgets array when gadgetCount changes
  useEffect(() => {
    setGadgetEnabled(prev => {
      const newEnabled = Array(gadgetCount).fill(true);
      // Preserve existing enabled states up to the new count
      for (let i = 0; i < Math.min(prev.length, gadgetCount); i++) {
        newEnabled[i] = prev[i];
      }
      return newEnabled;
    });
    // Trim gadgets array to match the new count (fix for issue #34)
    setGadgets(prev => {
      if (prev.length > gadgetCount) {
        return prev.slice(0, gadgetCount);
      }
      // Expand with nulls if count increased
      if (prev.length < gadgetCount) {
        return [...prev, ...Array(gadgetCount - prev.length).fill(null)];
      }
      return prev;
    });
  }, [gadgetCount]);
  const [useMiningGroup, setUseMiningGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [backgroundMode, setBackgroundMode] = useState<'starfield' | 'landscape'>('starfield');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Auto-save when config or ship changes
  useEffect(() => {
    saveCurrentConfiguration(selectedShip, config);
  }, [selectedShip, config]);

  // Smart hint detection: Show hint if resistance is low and equipment modifiers exist
  const showResistanceHint = useMemo(() => {
    if (rock.resistance === 0 || rock.resistance >= 20) return false;

    // Check if any equipment has resistance modifiers
    const hasEquipmentModifiers = config.lasers.some(laser =>
      laser.laserHead && laser.laserHead.resistModifier !== 1
    );

    return hasEquipmentModifiers;
  }, [rock.resistance, config.lasers]);

  // Resistance mode handlers
  const handleResistanceModeToggle = () => {
    setRock({
      ...rock,
      resistanceMode: rock.resistanceMode === 'base' ? 'modified' : 'base',
    });
  };

  const handleResistanceChange = (value: number) => {
    setRock({ ...rock, resistance: value });
  };

  const handleGadgetInclusionToggle = () => {
    setRock({
      ...rock,
      includeGadgetsInScan: !rock.includeGadgetsInScan,
    });
  };

  const handleSetScanningShip = (shipId: string, laserIndex: number) => {
    // If clicking the already-selected sensor, deselect it
    if (rock.scannedByShipId === shipId && rock.scannedByLaserIndex === laserIndex) {
      setRock({
        ...rock,
        scannedByShipId: undefined,
        scannedByLaserIndex: undefined,
      });
    } else {
      setRock({
        ...rock,
        scannedByShipId: shipId,
        scannedByLaserIndex: laserIndex,
      });
    }
  };

  // Auto-clear scanning ship when switching to base mode
  // Auto-select single ship when switching to modified mode (for Prospector/GOLEM)
  useEffect(() => {
    if (rock.resistanceMode === 'base') {
      setRock(prev => ({
        ...prev,
        scannedByShipId: undefined,
        scannedByLaserIndex: undefined,
      }));
    } else if (rock.resistanceMode === 'modified' && !useMiningGroup && !rock.scannedByShipId) {
      // Auto-select for single-laser ships (Prospector/GOLEM)
      if (selectedShip.id === 'prospector' || selectedShip.id === 'golem') {
        setRock(prev => ({
          ...prev,
          scannedByShipId: selectedShip.id,
          scannedByLaserIndex: 0,
        }));
      }
    }
  }, [rock.resistanceMode, useMiningGroup, selectedShip.id, rock.scannedByShipId]);

  // Create a stable reference for equipment config (only laser heads and modules, not manned state)
  // This is used to detect when the sensor selection should be cleared
  const equipmentConfigKey = useMemo(() => {
    return JSON.stringify(config.lasers.map(laser => ({
      laserHeadId: laser.laserHead?.id,
      moduleIds: laser.modules.map(m => m?.id),
      moduleActive: laser.moduleActive,
    })));
  }, [config.lasers]);

  // Clear scanning ship when equipment config changes in modified mode
  // This should NOT trigger when just toggling laser manned state (isManned)
  useEffect(() => {
    if (rock.resistanceMode === 'modified' && rock.scannedByShipId) {
      setRock(prev => ({
        ...prev,
        scannedByShipId: undefined,
        scannedByLaserIndex: undefined,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentConfigKey]);

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
    const newConfig = initializeDefaultLasersForShip(ship);
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

        return {
          ...s,
          config: { ...s.config, lasers: updatedLasers },
          // Ship active state is not affected by laser toggling
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

  const handleToggleModule = (laserIndex: number, moduleIndex: number) => {
    const updatedLasers = [...config.lasers];
    const currentLaser = updatedLasers[laserIndex];

    // Initialize moduleActive array if it doesn't exist (default to OFF)
    if (!currentLaser.moduleActive) {
      currentLaser.moduleActive = currentLaser.modules.map(() => false);
    }

    // Toggle the module active state
    const updatedModuleActive = [...currentLaser.moduleActive];
    updatedModuleActive[moduleIndex] = !updatedModuleActive[moduleIndex];

    updatedLasers[laserIndex] = {
      ...currentLaser,
      moduleActive: updatedModuleActive,
    };

    setConfig({ ...config, lasers: updatedLasers });
  };

  const handleGroupToggleModule = (shipId: string, laserIndex: number, moduleIndex: number) => {
    const updatedShips = miningGroup.ships.map((s) => {
      if (s.id === shipId) {
        const updatedLasers = [...s.config.lasers];
        const currentLaser = updatedLasers[laserIndex];

        // Initialize moduleActive array if it doesn't exist (default to OFF)
        if (!currentLaser.moduleActive) {
          currentLaser.moduleActive = currentLaser.modules.map(() => false);
        }

        // Toggle the module active state
        const updatedModuleActive = [...currentLaser.moduleActive];
        updatedModuleActive[moduleIndex] = !updatedModuleActive[moduleIndex];

        updatedLasers[laserIndex] = {
          ...currentLaser,
          moduleActive: updatedModuleActive,
        };

        return {
          ...s,
          config: { ...s.config, lasers: updatedLasers },
        };
      }
      return s;
    });
    setMiningGroup({ ...miningGroup, ships: updatedShips });
  };

  return (
    <div className="app">
      <header className="app-header">
        <a href="https://peacefroggaming.com" target="_blank" rel="noopener noreferrer" title="Peacefrog Gaming">
          <img src={pfLogo} alt="Peacefrog Gaming" className="header-logo" />
        </a>
        <div className="header-title">
          <h1>PeaceFrog's Rock Breaker</h1>
          <span className="version-tag">v{version}</span>
        </div>
        <button
          className="help-button"
          onClick={() => setShowHelpModal(true)}
          title="Help & User Guides"
        >
          ?
        </button>
      </header>

      <div className="content-wrapper">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="overview-tab">
              {/* Left Sidebar - Rock Parameters */}
              <div className="overview-sidebar overview-left">
                <div className="sidebar-panel">
                  <h2>Rock Properties</h2>
                  <div className="compact-form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={rock.name || ''}
                      onChange={(e) => setRock({ ...rock, name: e.target.value })}
                      placeholder="Rock name"
                    />
                  </div>
                  <div className="compact-form-group">
                    <label>Mass</label>
                    <input
                      type="number"
                      value={rock.mass === 0 ? '' : rock.mass}
                      onChange={(e) => setRock({ ...rock, mass: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <ResistanceModeSelector
                    value={rock.resistance}
                    mode={rock.resistanceMode || 'base'}
                    includeGadgets={rock.includeGadgetsInScan || false}
                    showHint={showResistanceHint}
                    onChange={handleResistanceChange}
                    onModeToggle={handleResistanceModeToggle}
                    onGadgetToggle={handleGadgetInclusionToggle}
                  />
                  <div className="compact-form-group">
                    <label>Instability</label>
                    <input
                      type="number"
                      value={!rock.instability ? '' : rock.instability}
                      onChange={(e) => setRock({ ...rock, instability: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              {/* Center - Mining Graphic */}
              <div className="overview-center">
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
                  onSetScanningShip={rock.resistanceMode === 'modified' ? handleSetScanningShip : undefined}
                  onSingleShipToggleLaser={!useMiningGroup && selectedShip.id === 'mole' ? handleSingleShipToggleLaser : undefined}
                  onToggleModule={!useMiningGroup ? handleToggleModule : undefined}
                  onGroupToggleModule={useMiningGroup ? handleGroupToggleModule : undefined}
                  backgroundMode={backgroundMode}
                  onToggleBackground={() => setBackgroundMode(prev => prev === 'starfield' ? 'landscape' : 'starfield')}
                />
              </div>

              {/* Right Sidebar - Gadgets */}
              <div className="overview-sidebar overview-right">
                <div className="sidebar-panel">
                  <div className="gadget-header-compact">
                    <h2>Gadgets</h2>
                    <div className="gadget-count-stepper">
                      <button
                        className="stepper-btn"
                        onClick={() => setGadgetCount(Math.max(0, gadgetCount - 1))}
                        disabled={gadgetCount <= 0}
                      >
                        ▼
                      </button>
                      <span className="stepper-value">{gadgetCount}</span>
                      <button
                        className="stepper-btn"
                        onClick={() => setGadgetCount(Math.min(10, gadgetCount + 1))}
                        disabled={gadgetCount >= 10}
                      >
                        ▲
                      </button>
                    </div>
                  </div>
                  {Array.from({ length: gadgetCount }).map((_, index) => {
                    const gadget = gadgets[index];
                    const isEnabled = gadgetEnabled[index] !== false;
                    const effects = getGadgetEffects(gadget);

                    return (
                    <div key={index} className="compact-form-group gadget-select-wrapper">
                      <label>Gadget {index + 1}</label>
                      <select
                        value={gadgets[index]?.id || 'none'}
                        onChange={(e) => {
                          const gadget = GADGETS.find((g) => g.id === e.target.value) || null;
                          const newGadgets = [...gadgets];
                          newGadgets[index] = gadget;
                          setGadgets(newGadgets);
                        }}
                        title={gadgets[index] && gadgets[index].id !== 'none' ?
                          formatGadgetTooltip(gadgets[index]) : 'Select a gadget'}
                      >
                        {GADGETS.map((gadget) => (
                          <option
                            key={gadget.id}
                            value={gadget.id}
                            title={formatGadgetTooltip(gadget)}
                          >
                            {gadget.name}
                          </option>
                        ))}
                      </select>

                      {/* Gadget Info Box - directly below selector */}
                      {gadget && gadget.id !== 'none' && effects.length > 0 && (
                        <div
                          className={`gadget-info-item ${!isEnabled ? 'disabled' : ''}`}
                          onClick={() => handleToggleGadget(index)}
                        >
                          <div className="gadget-info-effects">
                            {effects.map((effect, i) => (
                              <span key={i} className={`gadget-effect ${effect.isPositive ? 'positive' : 'negative'}`}>
                                {effect.label}: {effect.pct}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );})}
                </div>
              </div>
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

      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
}

export default App;
