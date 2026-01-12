import { useState, useEffect, useMemo, useRef } from "react";
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
import { toggleModuleActive } from "./utils/moduleHelpers";
import {
  formatGadgetTooltip,
  getGadgetEffects,
} from "./utils/formatters";
import {
  saveCurrentConfiguration,
  loadCurrentConfiguration,
} from "./utils/storage";
import ShipSelector from "./components/ShipSelector";
import LasersSetup from "./components/LasersSetup";
import ResultDisplay from "./components/ResultDisplay";
import ConfigManager from "./components/ConfigManager";
import ShipPoolManager from "./components/ShipPoolManager";
import MiningGroupManager from "./components/MiningGroupManager";
import TabNavigation, { type TabType } from "./components/TabNavigation";
import HelpModal from "./components/HelpModal";
import ResistanceModeSelector from "./components/ResistanceModeSelector";
import MobileDrawer from "./components/MobileDrawer";
import { useMobileDetection } from "./hooks/useMobileDetection";
import pfLogo from "./assets/PFlogo.png";
import gadgetLabelVertical from "./assets/gadget label vertical.png";
import rockLabelVertical from "./assets/rocks_tray_label_small.png";
import shipLibraryLabelVertical from "./assets/ship_library_small.png";
import shipLibraryLabelHorz from "./assets/ship_library_small_horz.png";
import groupLibraryLabelVertical from "./assets/group_library_small.png";
import { version } from "../package.json";

// Default rock values for reset functionality
const DEFAULT_ROCK: Rock = {
  mass: 25000,
  resistance: 30,
  instability: 50,
  name: "The Rock",
  resistanceMode: 'base',
  includeGadgetsInScan: false,
};

function App() {
  // Load saved state or use defaults
  const loadedState = loadCurrentConfiguration();
  const [selectedShip, setSelectedShip] = useState<Ship>(
    loadedState?.ship || SHIPS[0]
  );
  const [config, setConfig] = useState<MiningConfiguration>(
    loadedState?.config || initializeDefaultLasersForShip(SHIPS[0])
  );
  const [currentConfigName, setCurrentConfigName] = useState<string | undefined>(undefined);
  // Load rock from active slot in localStorage (or default if not found)
  const [rock, setRock] = useState<Rock>(() => {
    try {
      const savedSlots = localStorage.getItem('rockbreaker-rock-slots');
      const savedActiveSlot = localStorage.getItem('rockbreaker-active-rock-slot');
      if (savedSlots && savedActiveSlot) {
        const slots = JSON.parse(savedSlots);
        const activeIndex = parseInt(savedActiveSlot, 10);
        if (slots[activeIndex]) {
          return { ...slots[activeIndex] };
        }
      }
      return { ...DEFAULT_ROCK };
    } catch {
      return { ...DEFAULT_ROCK };
    }
  });
  const [miningGroup, setMiningGroup] = useState<MiningGroup>(() => {
    try {
      const saved = localStorage.getItem('rockbreaker-mining-group');
      return saved ? JSON.parse(saved) : { ships: [] };
    } catch {
      return { ships: [] };
    }
  });
  const [gadgets, setGadgets] = useState<(Gadget | null)[]>([null, null, null]);
  const [gadgetCount, setGadgetCount] = useState(3);
  const [gadgetEnabled, setGadgetEnabled] = useState<boolean[]>([true, true, true]);
  const [gadgetInScan, setGadgetInScan] = useState<boolean[]>([false, false, false]);

  // Update gadgetEnabled/InScan arrays and trim gadgets array when gadgetCount changes
  useEffect(() => {
    setGadgetEnabled(prev => {
      const newEnabled = Array(gadgetCount).fill(true);
      // Preserve existing enabled states up to the new count
      for (let i = 0; i < Math.min(prev.length, gadgetCount); i++) {
        newEnabled[i] = prev[i];
      }
      return newEnabled;
    });
    setGadgetInScan(prev => {
      const newInScan = Array(gadgetCount).fill(false);
      // Preserve existing inScan states up to the new count
      for (let i = 0; i < Math.min(prev.length, gadgetCount); i++) {
        newInScan[i] = prev[i];
      }
      return newInScan;
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
  const [useMiningGroup, setUseMiningGroup] = useState(() => {
    try {
      const saved = localStorage.getItem('rockbreaker-use-mining-group');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [backgroundMode, setBackgroundMode] = useState<'starfield' | 'landscape'>('starfield');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Mobile drawer state
  const [rockDrawerOpen, setRockDrawerOpen] = useState(false);
  const [gadgetDrawerOpen, setGadgetDrawerOpen] = useState(false);
  const [libraryDrawerOpen, setLibraryDrawerOpen] = useState(false);
  const [shipLibraryDrawerOpen, setShipLibraryDrawerOpen] = useState(false);
  const [groupLibraryDrawerOpen, setGroupLibraryDrawerOpen] = useState(false);

  // Mobile detection via shared hook
  const isMobile = useMobileDetection();

  // Rock save slots (3 slots for quick save/load, pre-filled with defaults)
  const [rockSlots, setRockSlots] = useState<Rock[]>(() => {
    try {
      const saved = localStorage.getItem('rockbreaker-rock-slots');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old null slots to defaults
        return parsed.map((slot: Rock | null) => slot || { ...DEFAULT_ROCK });
      }
      return [{ ...DEFAULT_ROCK }, { ...DEFAULT_ROCK }, { ...DEFAULT_ROCK }];
    } catch {
      return [{ ...DEFAULT_ROCK }, { ...DEFAULT_ROCK }, { ...DEFAULT_ROCK }];
    }
  });

  // Track which rock slot is currently active (0, 1, or 2)
  const [activeRockSlot, setActiveRockSlot] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rockbreaker-active-rock-slot');
      if (!saved) return 0;
      const parsed = parseInt(saved, 10);
      // Validate slot is in valid range (0-2)
      return parsed >= 0 && parsed <= 2 ? parsed : 0;
    } catch {
      return 0;
    }
  });

  // Persist rock slots to localStorage
  useEffect(() => {
    localStorage.setItem('rockbreaker-rock-slots', JSON.stringify(rockSlots));
  }, [rockSlots]);

  // Persist active slot to localStorage
  useEffect(() => {
    localStorage.setItem('rockbreaker-active-rock-slot', activeRockSlot.toString());
  }, [activeRockSlot]);

  // Auto-save current rock to active slot when rock values change
  useEffect(() => {
    setRockSlots(prev => {
      const newSlots = [...prev];
      newSlots[activeRockSlot] = { ...rock };
      return newSlots;
    });
  }, [rock, activeRockSlot]);

  // Persist mining group mode to localStorage
  useEffect(() => {
    localStorage.setItem('rockbreaker-use-mining-group', useMiningGroup.toString());
  }, [useMiningGroup]);

  // Persist mining group data to localStorage
  useEffect(() => {
    localStorage.setItem('rockbreaker-mining-group', JSON.stringify(miningGroup));
  }, [miningGroup]);

  // Auto-save when config or ship changes
  useEffect(() => {
    saveCurrentConfiguration(selectedShip, config);
  }, [selectedShip, config]);

  // Smart hint detection: Show hint if resistance is low and modifiers might explain it
  // But don't show if gadgets could explain the low resistance (user should check "Gadgets in scan" instead)
  const showResistanceHint = useMemo(() => {
    if (rock.resistance === 0 || rock.resistance >= 20) return false;

    // Check if any equipment has resistance modifiers
    const hasEquipmentModifiers = config.lasers.some(laser =>
      laser.laserHead && laser.laserHead.resistModifier !== 1
    );

    // Check if gadgets with resist modifiers are selected (could explain low resistance)
    const hasGadgetModifiers = gadgets.some(gadget =>
      gadget && gadget.id !== 'none' && gadget.resistModifier !== 1
    );

    // Don't suggest "switch to Modified" if gadgets could explain the low resistance
    // User should use "Gadgets in scan" checkbox instead
    if (hasGadgetModifiers && !rock.includeGadgetsInScan) {
      return false;
    }

    return hasEquipmentModifiers;
  }, [rock.resistance, rock.includeGadgetsInScan, config.lasers, gadgets]);

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

  // Check if rock values match defaults
  const isRockAtDefaults = useMemo(() => {
    return rock.mass === DEFAULT_ROCK.mass &&
      rock.resistance === DEFAULT_ROCK.resistance &&
      (rock.instability ?? DEFAULT_ROCK.instability) === DEFAULT_ROCK.instability &&
      rock.name === DEFAULT_ROCK.name &&
      rock.resistanceMode === DEFAULT_ROCK.resistanceMode &&
      rock.includeGadgetsInScan === DEFAULT_ROCK.includeGadgetsInScan;
  }, [rock]);

  // Toggle between Reset (to defaults) and Clear (to empty)
  const handleRockResetClear = () => {
    if (isRockAtDefaults) {
      // At defaults → Clear all values (including scanning metadata)
      setRock({
        mass: 0,
        resistance: 0,
        instability: undefined,
        name: '',
        resistanceMode: 'base',
        includeGadgetsInScan: false,
        originalScannedValue: undefined,
        scannedByShipId: undefined,
        scannedByLaserIndex: undefined,
      });
    } else {
      // Custom or cleared values → Reset to defaults
      setRock({ ...DEFAULT_ROCK });
    }
  };

  // Handle rock slot switch: save current to old slot, load new slot
  const handleRockSlotSwitch = (newSlotIndex: number) => {
    if (newSlotIndex === activeRockSlot) return; // Already active, do nothing

    // Save current rock values to the currently active slot
    const newSlots = [...rockSlots];
    newSlots[activeRockSlot] = { ...rock };
    setRockSlots(newSlots);

    // Load the new slot's values from the updated slots array
    setRock({ ...newSlots[newSlotIndex] });

    // Set the new slot as active
    setActiveRockSlot(newSlotIndex);
  };

  // Track previous resistance mode to detect mode transitions
  const prevResistanceMode = useRef(rock.resistanceMode);

  // Auto-clear scanning ship only when TRANSITIONING to base mode (not continuously)
  // Auto-select single ship when switching to modified mode (for Prospector/GOLEM)
  useEffect(() => {
    const wasModified = prevResistanceMode.current === 'modified';
    const isBase = rock.resistanceMode === 'base';
    const isModified = rock.resistanceMode === 'modified';

    // Only clear when transitioning FROM modified TO base
    if (wasModified && isBase && rock.scannedByShipId) {
      setRock(prev => ({
        ...prev,
        scannedByShipId: undefined,
        scannedByLaserIndex: undefined,
      }));
    } else if (isModified && !useMiningGroup && !rock.scannedByShipId) {
      // Auto-select for single-laser ships (Prospector/GOLEM)
      if (selectedShip.id === 'prospector' || selectedShip.id === 'golem') {
        setRock(prev => ({
          ...prev,
          scannedByShipId: selectedShip.id,
          scannedByLaserIndex: 0,
        }));
      }
    }

    prevResistanceMode.current = rock.resistanceMode;
  }, [rock.resistanceMode, useMiningGroup, selectedShip.id, rock.scannedByShipId]);

  // Create a stable reference for equipment config (only laser heads and modules; excludes manned state)
  // This is used to detect when the sensor selection should be cleared
  // Note: moduleActive is intentionally excluded - toggling active modules shouldn't clear the scanning ship
  const equipmentConfigKey = useMemo(() => {
    return JSON.stringify(config.lasers.map(laser => ({
      laserHeadId: laser.laserHead?.id,
      moduleIds: laser.modules.map(m => m?.id),
    })));
  }, [config.lasers]);

  // Track the initial equipment config key to detect actual changes (not just initial load)
  const initialEquipmentConfigKey = useRef(equipmentConfigKey);

  // Clear scanning ship when equipment config ACTUALLY changes (not on initial load)
  // This should NOT trigger when just toggling laser manned state (isManned)
  useEffect(() => {
    // Skip if this is the initial config (same as what was loaded)
    if (equipmentConfigKey === initialEquipmentConfigKey.current) {
      return;
    }
    // Equipment config has actually changed - clear scanning ship if in modified mode
    if (rock.resistanceMode === 'modified' && rock.scannedByShipId) {
      setRock(prev => ({
        ...prev,
        scannedByShipId: undefined,
        scannedByLaserIndex: undefined,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentConfigKey]);

  // Filter gadgets to only include enabled ones (for forward calculation)
  const enabledGadgets = gadgets.map((gadget, index) =>
    gadgetEnabled[index] ? gadget : null
  );

  // Build scanGadgets array from gadgets marked "In Scan" (for reverse calculation)
  const scanGadgets = gadgets.map((gadget, index) =>
    gadgetInScan[index] ? gadget : null
  );

  // Calculate result based on mode (single ship or mining group)
  const result = useMiningGroup
    ? calculateGroupBreakability(miningGroup, rock, enabledGadgets, scanGadgets)
    : calculateBreakability(config, rock, enabledGadgets, selectedShip.id, scanGadgets);

  // Handle toggling gadget enabled state
  const handleToggleGadget = (index: number) => {
    const newEnabled = [...gadgetEnabled];
    newEnabled[index] = !newEnabled[index];
    setGadgetEnabled(newEnabled);
  };

  // Handle toggling gadget "In Scan" state
  const handleToggleGadgetInScan = (index: number) => {
    const newInScan = [...gadgetInScan];
    newInScan[index] = !newInScan[index];
    setGadgetInScan(newInScan);
  };

  const handleShipChange = (ship: Ship) => {
    setSelectedShip(ship);
    const newConfig = initializeDefaultLasersForShip(ship);
    setConfig(newConfig);
    setCurrentConfigName(undefined); // Clear config name when switching ships
  };

  const handleLoadConfiguration = (
    ship: Ship,
    loadedConfig: MiningConfiguration,
    name: string
  ) => {
    setSelectedShip(ship);
    setConfig(loadedConfig);
    setCurrentConfigName(name);
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

    // Use helper to handle stacking rules (sustained modules are mutually exclusive)
    const updatedModuleActive = toggleModuleActive(
      currentLaser.modules,
      currentLaser.moduleActive,
      moduleIndex
    );

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

        // Use helper to handle stacking rules (sustained modules are mutually exclusive)
        const updatedModuleActive = toggleModuleActive(
          currentLaser.modules,
          currentLaser.moduleActive,
          moduleIndex
        );

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
          <h1>
            <span className="title-line">PEACEFROG'S</span>
            <span className="title-line">ROCK BREAKER</span>
          </h1>
          <a
            href="https://forms.gle/GziNwLBcwaWpZVNy5"
            target="_blank"
            rel="noopener noreferrer"
            className="feedback-link"
          >
            FEEDBACK LINK
          </a>
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
            <div className={`overview-tab ${isMobile ? 'mobile-single-column' : ''}`}>
              {/* Rock Properties Content - shared between desktop sidebar and mobile drawer */}
              {(() => {
                const rockPropertiesContent = (
                  <>
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
                        inputMode="decimal"
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
                        inputMode="decimal"
                        value={!rock.instability ? '' : rock.instability}
                        onChange={(e) => setRock({ ...rock, instability: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <button
                      className="clear-rock-button"
                      onClick={handleRockResetClear}
                      aria-label={isRockAtDefaults ? 'Clear all rock values' : 'Reset rock values to defaults'}
                    >
                      {isRockAtDefaults ? 'Clear' : 'Reset'}
                    </button>
                    <div className="rock-slots">
                      {rockSlots.map((slot, index) => (
                        <button
                          key={index}
                          className={`rock-slot-button ${index === activeRockSlot ? 'active' : ''}`}
                          onClick={() => handleRockSlotSwitch(index)}
                          title={`${slot.name || 'Rock'}: ${slot.mass}kg, ${slot.resistance}%${slot.instability !== undefined ? `, ${slot.instability} instability` : ''}`}
                          aria-label={`Rock slot ${index + 1}`}
                          aria-pressed={index === activeRockSlot}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </>
                );

                const gadgetsContent = (
                  <>
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
                      const isInScan = gadgetInScan[index] === true;
                      const effects = getGadgetEffects(gadget);

                      return (
                        <div key={index} className="compact-form-group gadget-select-wrapper">
                          <div className="gadget-label-row">
                            <label>Gadget {index + 1}</label>
                            {rock.includeGadgetsInScan && gadget && gadget.id !== 'none' && (
                              <label className="in-scan-checkbox">
                                <input
                                  type="checkbox"
                                  checked={isInScan}
                                  onChange={() => handleToggleGadgetInScan(index)}
                                  title="Check if this gadget was attached to the rock when you scanned"
                                />
                                <span>In Scan</span>
                              </label>
                            )}
                          </div>
                          <select
                            value={gadgets[index]?.id || 'none'}
                            onChange={(e) => {
                              const newGadget = GADGETS.find((g) => g.id === e.target.value) || null;
                              const newGadgets = [...gadgets];
                              newGadgets[index] = newGadget;
                              setGadgets(newGadgets);
                              // Clear inScan state when gadget is removed
                              if (!newGadget || newGadget.id === 'none') {
                                const newInScan = [...gadgetInScan];
                                newInScan[index] = false;
                                setGadgetInScan(newInScan);
                              }
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
                      );
                    })}
                    {/* Guidance message when "Gadgets in Scan" is checked but none marked */}
                    {rock.includeGadgetsInScan &&
                     gadgets.some(g => g && g.id !== 'none') &&
                     !gadgetInScan.some((inScan, i) => inScan && gadgets[i] && gadgets[i]!.id !== 'none') && (
                      <div className="gadgets-scan-hint">
                        <span className="hint-icon">💡</span>
                        <span>Mark which gadgets were on the rock when you scanned</span>
                      </div>
                    )}
                  </>
                );

                return (
                  <>
                    {/* Mobile Drawers - Rock and Gadgets on Overview tab */}
                    {isMobile && (
                      <>
                        <MobileDrawer
                          isOpen={rockDrawerOpen}
                          onClose={() => setRockDrawerOpen(false)}
                          onOpen={() => { setGadgetDrawerOpen(false); setRockDrawerOpen(true); }}
                          side="left"
                          title="Rock Properties"
                          tabLabel="Rock"
                          tabImage={rockLabelVertical}
                        >
                          {rockPropertiesContent}
                        </MobileDrawer>
                        <MobileDrawer
                          isOpen={gadgetDrawerOpen}
                          onClose={() => setGadgetDrawerOpen(false)}
                          onOpen={() => { setRockDrawerOpen(false); setGadgetDrawerOpen(true); }}
                          side="right"
                          title="Gadgets"
                          tabLabel="Gadgets"
                          tabImage={gadgetLabelVertical}
                        >
                          {gadgetsContent}
                        </MobileDrawer>
                      </>
                    )}

                    {/* Desktop Left Sidebar - Rock Parameters */}
                    {!isMobile && (
                      <div className="overview-sidebar overview-left">
                        <div className="sidebar-panel">
                          <h2>Rock Properties</h2>
                          {rockPropertiesContent}
                        </div>
                      </div>
                    )}

                    {/* Mobile Ko-fi link - CSS controls visibility (shows only on mobile) */}
                    <a
                      href="https://ko-fi.com/peacefroggaming"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kofi-mobile-inline"
                    >
                      <img src="/rieger-icon.png" alt="Rieger-C3 mining module icon" />
                      <span>Buy me a Rieger-C3<br />on KO-FI</span>
                    </a>

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
                        configName={!useMiningGroup ? currentConfigName : undefined}
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

                    {/* Desktop Right Sidebar - Gadgets */}
                    {!isMobile && (
                      <div className="overview-sidebar overview-right">
                        <div className="sidebar-panel">
                          {gadgetsContent}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Mining Config Tab */}
          {activeTab === "mining" && (
            <div className="mining-config-tab">
              {/* Mobile Library Drawer - Single Ship mode only (bottom) */}
              {isMobile && !useMiningGroup && (
                <MobileDrawer
                  isOpen={libraryDrawerOpen}
                  onClose={() => setLibraryDrawerOpen(false)}
                  onOpen={() => setLibraryDrawerOpen(true)}
                  side="bottom"
                  title="Ship Library"
                  tabLabel="Library"
                  tabImage={shipLibraryLabelHorz}
                >
                  <ConfigManager
                    currentShip={selectedShip}
                    currentConfig={config}
                    currentConfigName={currentConfigName}
                    onLoad={handleLoadConfiguration}
                    onAfterLoad={() => setLibraryDrawerOpen(false)}
                  />
                </MobileDrawer>
              )}

              {/* Mobile Library Drawers - Mining Group mode (left/right) */}
              {isMobile && useMiningGroup && (
                <>
                  <MobileDrawer
                    isOpen={shipLibraryDrawerOpen}
                    onClose={() => setShipLibraryDrawerOpen(false)}
                    onOpen={() => { setGroupLibraryDrawerOpen(false); setShipLibraryDrawerOpen(true); }}
                    side="left"
                    title="Ship Library"
                    tabLabel="Ship Library"
                    tabImage={shipLibraryLabelVertical}
                  >
                    <ConfigManager
                      onAddToGroup={(shipInstance) => {
                        if (miningGroup.ships.length >= 4) {
                          alert('Maximum of 4 ships allowed in mining group');
                          return;
                        }
                        shipInstance.isActive = true;
                        setMiningGroup({ ...miningGroup, ships: [...miningGroup.ships, shipInstance] });
                      }}
                      onAfterLoad={() => setShipLibraryDrawerOpen(false)}
                    />
                  </MobileDrawer>
                  <MobileDrawer
                    isOpen={groupLibraryDrawerOpen}
                    onClose={() => setGroupLibraryDrawerOpen(false)}
                    onOpen={() => { setShipLibraryDrawerOpen(false); setGroupLibraryDrawerOpen(true); }}
                    side="right"
                    title="Group Library"
                    tabLabel="Group Library"
                    tabImage={groupLibraryLabelVertical}
                  >
                    <MiningGroupManager
                      currentMiningGroup={miningGroup}
                      onLoad={setMiningGroup}
                      onAfterLoad={() => setGroupLibraryDrawerOpen(false)}
                    />
                  </MobileDrawer>
                </>
              )}

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
                <>
                  <ShipPoolManager
                    miningGroup={miningGroup}
                    onChange={setMiningGroup}
                  />
                  {/* Group Library and Ship Library for Mining Group - desktop only (mobile uses drawers) */}
                  {!isMobile && (
                    <>
                      <MiningGroupManager
                        currentMiningGroup={miningGroup}
                        onLoad={setMiningGroup}
                      />
                      <ConfigManager
                        onAddToGroup={(shipInstance) => {
                          if (miningGroup.ships.length >= 4) {
                            alert('Maximum of 4 ships allowed in mining group');
                            return;
                          }
                          shipInstance.isActive = true;
                          setMiningGroup({ ...miningGroup, ships: [...miningGroup.ships, shipInstance] });
                        }}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <ShipSelector
                    selectedShip={selectedShip}
                    onShipChange={handleShipChange}
                    configName={currentConfigName}
                  />

                  <LasersSetup
                    config={config}
                    selectedShip={selectedShip}
                    onLaserChange={(index, updatedLaser) => {
                      const newLasers = [...config.lasers];
                      newLasers[index] = updatedLaser;
                      setConfig({ ...config, lasers: newLasers });
                    }}
                  />

                  {/* Ship Library - only show inline on desktop (mobile uses drawer) */}
                  {!isMobile && (
                    <ConfigManager
                      currentShip={selectedShip}
                      currentConfig={config}
                      currentConfigName={currentConfigName}
                      onLoad={handleLoadConfiguration}
                    />
                  )}
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
