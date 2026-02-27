import { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";
import type { MiningConfiguration, Ship, Rock, MiningGroup, Gadget } from "./types";
import { SHIPS } from "./types";
import {
  calculateBreakability,
  calculateGroupBreakability,
} from "./utils/calculator";
import {
  initializeDefaultLasersForShip,
} from "./utils/shipDefaults";
import { toggleModuleActive } from "./utils/moduleHelpers";
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
import ChangelogModal from "./components/ChangelogModal";
import SaveShipModal from "./components/SaveShipModal";
import AuthModal from "./components/AuthModal";
import RegolithImportModal from "./components/RegolithImportModal";
import ProfileModal from "./components/ProfileModal";
import UserMenu from "./components/UserMenu";
import RockPropertiesPanel from "./components/RockPropertiesPanel";
import GadgetsPanel from "./components/GadgetsPanel";
import MobileDrawer from "./components/MobileDrawer";
import CollapsiblePanel from "./components/CollapsiblePanel";
import { useMobileDetection } from "./hooks/useMobileDetection";
import { useAuth } from "./contexts/AuthContext";
import pfLogo from "./assets/PFlogo.png";
import communityLogo from "./assets/MadeByTheCommunity_Black.png";
import gadgetLabelVertical from "./assets/gadget label vertical.png";
import rockLabelVertical from "./assets/rocks_tray_label_small.png";
import shipLibraryLabelVertical from "./assets/ship_library_small.png";
import shipLibraryLabelHorz from "./assets/ship_library_small_horz.png";
import groupLibraryLabelVertical from "./assets/group_library_small.png";
import resultsBackground from "./assets/Results Background.jpg";
import shipSetupBackground from "./assets/Ship Setup Background.jpg";
import { version } from "../package.json";

// Default rock values for reset functionality
const DEFAULT_ROCK: Rock = {
  mass: 25000,
  resistance: 30,
  instability: 50,
  type: "",
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
  // Cache ship configs per ship type during session (for #189 - retain config when swapping ships)
  // Includes name so it persists across ship switches (#204)
  const [shipConfigs, setShipConfigs] = useState<Record<string, { config: MiningConfiguration; name?: string }>>({});
  // Save dialog state (controlled from ShipSelector header for #190)
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  // Themed alert dialog (replaces native alert for fleet full, etc.)
  const [alertDialog, setAlertDialog] = useState<{ title: string; message: string } | null>(null);

  // Close alert dialog on Escape
  useEffect(() => {
    if (!alertDialog) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlertDialog(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [alertDialog]);

  // Load rock from active slot in localStorage (or default if not found)
  const [rock, setRock] = useState<Rock>(() => {
    try {
      const savedSlots = localStorage.getItem('rockbreaker-rock-slots');
      const savedActiveSlot = localStorage.getItem('rockbreaker-active-rock-slot');
      if (savedSlots && savedActiveSlot) {
        const slots = JSON.parse(savedSlots);
        const activeIndex = parseInt(savedActiveSlot, 10);
        if (slots[activeIndex]) {
          const slot = slots[activeIndex];
          // Migrate legacy "name" field to "type" (#236)
          if (slot && typeof slot === 'object' && 'name' in slot && !('type' in slot)) {
            const { name, ...rest } = slot;
            return { ...rest, type: name };
          }
          return { ...slot };
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
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState<'signIn' | 'signUp' | 'forgotPassword' | 'resetPassword' | undefined>(undefined);
  const [showRegolithModal, setShowRegolithModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'connections'>('profile');
  const { isConfigured: isAuthConfigured, passwordRecovery, clearPasswordRecovery } = useAuth();

  // Auto-open auth modal when user clicks password reset link from email
  useEffect(() => {
    if (passwordRecovery) {
      setAuthModalView('resetPassword');
      setShowAuthModal(true);
    }
  }, [passwordRecovery]);

  // Mobile drawer state
  const [rockDrawerOpen, setRockDrawerOpen] = useState(false);
  const [gadgetDrawerOpen, setGadgetDrawerOpen] = useState(false);
  const [libraryDrawerOpen, setLibraryDrawerOpen] = useState(false);
  const [shipLibraryDrawerOpen, setShipLibraryDrawerOpen] = useState(false);
  const [groupLibraryDrawerOpen, setGroupLibraryDrawerOpen] = useState(false);

  // Desktop accordion state - only one panel open at a time
  // Values: null, 'lasers', 'shipLibrary', 'miningGroup', 'groupLibrary'
  const [openPanel, setOpenPanel] = useState<string | null>('lasers');

  // Mobile detection via shared hook
  const isMobile = useMobileDetection();
  // Phone vs tablet detection (phones < 768px)
  const [isPhone, setIsPhone] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsPhone(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rock save slots (4 slots for quick save/load, pre-filled with defaults)
  const ROCK_SLOT_COUNT = 4;
  const [rockSlots, setRockSlots] = useState<Rock[]>(() => {
    try {
      const saved = localStorage.getItem('rockbreaker-rock-slots');
      if (saved) {
        const parsed: (Rock | null)[] = JSON.parse(saved);
        // Migrate old null slots to defaults, and pad to ROCK_SLOT_COUNT if needed
        // Also migrate legacy "name" field to "type" (#236)
        const slots = parsed.map((slot: Rock | null) => {
          if (!slot || typeof slot !== 'object') return { ...DEFAULT_ROCK };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const s = slot as any;
          if ('name' in s && !('type' in s)) {
            const { name, ...rest } = s;
            return { ...rest, type: name } as Rock;
          }
          return { ...s } as Rock;
        });
        while (slots.length < ROCK_SLOT_COUNT) slots.push({ ...DEFAULT_ROCK });
        return slots.slice(0, ROCK_SLOT_COUNT);
      }
      return Array.from({ length: ROCK_SLOT_COUNT }, () => ({ ...DEFAULT_ROCK }));
    } catch {
      return Array.from({ length: ROCK_SLOT_COUNT }, () => ({ ...DEFAULT_ROCK }));
    }
  });

  // Track which rock slot is currently active
  const [activeRockSlot, setActiveRockSlot] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rockbreaker-active-rock-slot');
      if (!saved) return 0;
      const parsed = parseInt(saved, 10);
      return parsed >= 0 && parsed < ROCK_SLOT_COUNT ? parsed : 0;
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

  // Scan mode handler — toggles both resistance and instability mode together
  const handleResistanceModeToggle = () => {
    const newMode = rock.resistanceMode === 'base' ? 'modified' : 'base';
    setRock({
      ...rock,
      resistanceMode: newMode,
      instabilityMode: newMode,
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
      (rock.type ?? DEFAULT_ROCK.type) === DEFAULT_ROCK.type &&
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
        type: '',
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

  // Handle rock import from Regolith: merge imported fields into current rock
  // Note: modal closes itself via onClose — no need to close it here
  const handleRegolithImport = (imported: Partial<Rock>) => {
    setRock((prev) => ({ ...prev, ...imported }));
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

  // Check if "Gadgets in Scan" is checked but no gadgets are actually marked "In Scan"
  // This means we're missing scan info and shouldn't show a break assessment
  const needsGadgetScanInfo = !!(
    rock.resistanceMode === 'modified' &&
    rock.includeGadgetsInScan &&
    !gadgetInScan.some((inScan, i) => inScan && gadgets[i] && gadgets[i]!.id !== 'none')
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
    // Cache current config + name before switching (for #189/#204 - retain config & name when swapping ships)
    setShipConfigs(prev => ({
      ...prev,
      [selectedShip.id]: { config, name: currentConfigName }
    }));

    setSelectedShip(ship);

    // Restore cached config + name if exists, otherwise initialize defaults
    const cached = shipConfigs[ship.id];
    if (cached) {
      setConfig(cached.config);
      setCurrentConfigName(cached.name);
    } else {
      setConfig(initializeDefaultLasersForShip(ship));
      setCurrentConfigName(undefined);
    }
  };

  const handleLoadConfiguration = (
    ship: Ship,
    loadedConfig: MiningConfiguration,
    name: string
  ) => {
    setSelectedShip(ship);
    setConfig(loadedConfig);
    setCurrentConfigName(name);
    // Auto-open laser setup panel so user can see the loaded config (#204)
    setOpenPanel('lasers');
  };

  // Clear config to defaults (for #190 - Clear button in ShipSelector header)
  const handleClearConfig = () => {
    setConfig(initializeDefaultLasersForShip(selectedShip));
    setCurrentConfigName(undefined);
    // Clear cache so switching ships and back doesn't restore old config
    setShipConfigs(prev => ({
      ...prev,
      [selectedShip.id]: { config: initializeDefaultLasersForShip(selectedShip), name: undefined }
    }));
  };

  // Called after SaveShipModal completes a save — collapse all panels (#231)
  const handleSaveComplete = (
    ship: Ship,
    savedConfig: MiningConfiguration,
    name: string
  ) => {
    setSelectedShip(ship);
    setConfig(savedConfig);
    setCurrentConfigName(name);
    // Collapse all panels to signal save is complete (#231)
    setOpenPanel(null);
  };

  // Open save dialog (for #190 - Save button in ShipSelector header)
  const handleOpenSaveDialog = () => {
    setShowSaveDialog(true);
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

  // Determine page background based on active tab
  const pageBackgroundClass = activeTab === "overview" ? "bg-results" : "bg-ship-setup";
  const pageBackgroundImage = activeTab === "overview" ? resultsBackground : shipSetupBackground;

  return (
    <div
      className={`app ${pageBackgroundClass}`}
      style={{ '--page-background': `url(${pageBackgroundImage})` } as React.CSSProperties}
    >
      <header className="app-header">
        <a href="https://peacefroggaming.com" target="_blank" rel="noopener noreferrer" title="Peacefrog Gaming">
          <img src={pfLogo} alt="Peacefrog Gaming" className="header-logo" />
        </a>
        <div className="header-title">
          <h1>
            <span className="title-line">PEACEFROG'S</span>
            <span className="title-line">ROCK BREAKER</span>
          </h1>
          <div className="header-links">
            <a
              href="https://forms.gle/GziNwLBcwaWpZVNy5"
              target="_blank"
              rel="noopener noreferrer"
              className="feedback-link"
            >
              FEEDBACK
            </a>
            <span className="header-link-sep">|</span>
            <button
              className="help-link"
              onClick={() => setShowHelpModal(true)}
            >
              HELP
            </button>
          </div>
          <button
            className="version-tag version-tag--clickable"
            onClick={() => setShowChangelogModal(true)}
            title="What's New"
          >
            v{version}
          </button>
        </div>
        <div className="header-controls">
          {isAuthConfigured && (
            <UserMenu onSignInClick={() => setShowAuthModal(true)} onProfileClick={() => { setProfileInitialTab('profile'); setShowProfileModal(true); }} />
          )}
          {!isMobile && (
            <a
              href="https://ko-fi.com/peacefroggaming"
              target="_blank"
              rel="noopener noreferrer"
              className="header-kofi-link"
              title="Support on Ko-fi"
            >
              <img src="/rieger-icon.png" alt="" className="kofi-icon" />
              <span>Buy me a Rieger</span>
            </a>
          )}
        </div>
      </header>

      <div className="content-wrapper">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className={`overview-tab ${isMobile ? 'mobile-single-column' : ''}`}>
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
                    <RockPropertiesPanel
                      rock={rock}
                      rockSlots={rockSlots}
                      activeRockSlot={activeRockSlot}
                      isRockAtDefaults={isRockAtDefaults}
                      showResistanceHint={showResistanceHint}
                      onRockChange={setRock}
                      onResistanceChange={handleResistanceChange}
                      onResistanceModeToggle={handleResistanceModeToggle}
                      onGadgetInclusionToggle={handleGadgetInclusionToggle}
                      onRockResetClear={handleRockResetClear}
                      onRockSlotSwitch={handleRockSlotSwitch}
                      onRegolithImport={() => setShowRegolithModal(true)}
                    />
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
                    <GadgetsPanel
                      gadgets={gadgets}
                      gadgetCount={gadgetCount}
                      gadgetEnabled={gadgetEnabled}
                      gadgetInScan={gadgetInScan}
                      includeGadgetsInScan={rock.includeGadgetsInScan || false}
                      onGadgetCountChange={setGadgetCount}
                      onGadgetsChange={setGadgets}
                      onGadgetInScanChange={setGadgetInScan}
                      onToggleGadget={handleToggleGadget}
                      onToggleGadgetInScan={handleToggleGadgetInScan}
                    />
                  </MobileDrawer>
                </>
              )}

              {/* Desktop Left Sidebar - Rock Parameters */}
              {!isMobile && (
                <div className="overview-sidebar overview-left">
                  <div className="sidebar-panel">
                    <h2>Rock Properties</h2>
                    <RockPropertiesPanel
                      rock={rock}
                      rockSlots={rockSlots}
                      activeRockSlot={activeRockSlot}
                      isRockAtDefaults={isRockAtDefaults}
                      showResistanceHint={showResistanceHint}
                      onRockChange={setRock}
                      onResistanceChange={handleResistanceChange}
                      onResistanceModeToggle={handleResistanceModeToggle}
                      onGadgetInclusionToggle={handleGadgetInclusionToggle}
                      onRockResetClear={handleRockResetClear}
                      onRockSlotSwitch={handleRockSlotSwitch}
                      onRegolithImport={() => setShowRegolithModal(true)}
                    />
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
                  needsGadgetScanInfo={needsGadgetScanInfo}
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
                    <GadgetsPanel
                      gadgets={gadgets}
                      gadgetCount={gadgetCount}
                      gadgetEnabled={gadgetEnabled}
                      gadgetInScan={gadgetInScan}
                      includeGadgetsInScan={rock.includeGadgetsInScan || false}
                      onGadgetCountChange={setGadgetCount}
                      onGadgetsChange={setGadgets}
                      onGadgetInScanChange={setGadgetInScan}
                      onToggleGadget={handleToggleGadget}
                      onToggleGadgetInScan={handleToggleGadgetInScan}
                    />
                  </div>
                </div>
              )}
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
                    hideSaveButton={true}
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
                          setAlertDialog({ title: 'Fleet Full', message: 'Maximum of 4 ships allowed in mining group.' });
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
                  {/* Mining Group - mobile: always visible, desktop: collapsible accordion */}
                  {isMobile ? (
                    <ShipPoolManager
                      miningGroup={miningGroup}
                      onChange={setMiningGroup}
                      onOpenLibrary={() => setShipLibraryDrawerOpen(true)}
                    />
                  ) : (
                    <CollapsiblePanel
                      title={<><span className="panel-label">Mining Group ({miningGroup.ships.length} {miningGroup.ships.length === 1 ? 'ship' : 'ships'})</span><span className="panel-name">{miningGroup.name || 'Group 1'}</span></>}
                      isOpen={openPanel === 'miningGroup'}
                      onToggle={() => setOpenPanel(openPanel === 'miningGroup' ? null : 'miningGroup')}
                    >
                      <ShipPoolManager
                        miningGroup={miningGroup}
                        onChange={setMiningGroup}
                        onOpenLibrary={() => setOpenPanel('shipLibrary')}
                      />
                    </CollapsiblePanel>
                  )}
                  {/* Group Library and Ship Library for Mining Group - desktop only (mobile uses drawers) */}
                  {!isMobile && (
                    <>
                      <CollapsiblePanel
                        title="Group Library"
                        isOpen={openPanel === 'groupLibrary'}
                        onToggle={() => setOpenPanel(openPanel === 'groupLibrary' ? null : 'groupLibrary')}
                      >
                        <MiningGroupManager
                          onLoad={setMiningGroup}
                        />
                      </CollapsiblePanel>
                      <CollapsiblePanel
                        title="Ship Library"
                        isOpen={openPanel === 'shipLibrary'}
                        onToggle={() => setOpenPanel(openPanel === 'shipLibrary' ? null : 'shipLibrary')}
                      >
                        <ConfigManager
                          onAddToGroup={(shipInstance) => {
                            if (miningGroup.ships.length >= 4) {
                              setAlertDialog({ title: 'Fleet Full', message: 'Maximum of 4 ships allowed in mining group.' });
                              return;
                            }
                            shipInstance.isActive = true;
                            setMiningGroup({ ...miningGroup, ships: [...miningGroup.ships, shipInstance] });
                          }}
                        />
                      </CollapsiblePanel>
                    </>
                  )}
                </>
              ) : (
                <>
                  <ShipSelector
                    selectedShip={selectedShip}
                    onShipChange={handleShipChange}
                    configName={currentConfigName}
                    onSave={handleOpenSaveDialog}
                    onClear={handleClearConfig}
                  />

                  {/* Laser Setup - mobile: always visible, desktop: collapsible accordion */}
                  {isMobile ? (
                    <LasersSetup
                      config={config}
                      selectedShip={selectedShip}
                      onLaserChange={(index, updatedLaser) => {
                        const newLasers = [...config.lasers];
                        newLasers[index] = updatedLaser;
                        setConfig({ ...config, lasers: newLasers });
                      }}
                    />
                  ) : (
                    <CollapsiblePanel
                      title="Laser Setup"
                      isOpen={openPanel === 'lasers'}
                      onToggle={() => setOpenPanel(openPanel === 'lasers' ? null : 'lasers')}
                    >
                      <LasersSetup
                        config={config}
                        selectedShip={selectedShip}
                        onLaserChange={(index, updatedLaser) => {
                          const newLasers = [...config.lasers];
                          newLasers[index] = updatedLaser;
                          setConfig({ ...config, lasers: newLasers });
                        }}
                      />
                    </CollapsiblePanel>
                  )}

                  {/* Ship Library - only show inline on desktop (mobile uses drawer) */}
                  {!isMobile && (
                    <CollapsiblePanel
                      title="Ship Library"
                      isOpen={openPanel === 'shipLibrary'}
                      onToggle={() => setOpenPanel(openPanel === 'shipLibrary' ? null : 'shipLibrary')}
                    >
                      <ConfigManager
                        currentShip={selectedShip}
                        currentConfig={config}
                        currentConfigName={currentConfigName}
                        onLoad={handleLoadConfiguration}
                        hideSaveButton={true}
                      />
                    </CollapsiblePanel>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <ChangelogModal isOpen={showChangelogModal} onClose={() => setShowChangelogModal(false)} />
      <AuthModal isOpen={showAuthModal} onClose={() => { setShowAuthModal(false); setAuthModalView(undefined); clearPasswordRecovery(); }} initialView={authModalView} />
      <SaveShipModal
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        currentShip={selectedShip}
        currentConfig={config}
        currentConfigName={currentConfigName}
        onSaved={handleSaveComplete}
      />
      <RegolithImportModal
        isOpen={showRegolithModal}
        onClose={() => setShowRegolithModal(false)}
        onImport={handleRegolithImport}
        onOpenIntegrations={() => {
          setShowRegolithModal(false);
          setProfileInitialTab('connections');
          setShowProfileModal(true);
        }}
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialTab={profileInitialTab}
      />

      {/* Community Logo - desktop: lower right, tablet: lower left, phone: in data drawer */}
      {!(isMobile && isPhone) && (
        <a
          href="https://www.robertsspaceindustries.com/enlist?referral=STAR-YVCT-KPSV"
          target="_blank"
          rel="noopener noreferrer"
          title="Join Star Citizen"
          className={`community-logo-link ${isMobile ? 'tablet' : ''}`}
        >
          <img
            src={communityLogo}
            alt="Made by the Community"
            className="community-logo"
          />
        </a>
      )}
      {alertDialog && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="app-alert-title" onClick={() => setAlertDialog(null)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="app-alert-title">{alertDialog.title}</h3>
            <p className="save-ship-modal-message">{alertDialog.message}</p>
            <div className="save-ship-modal-actions">
              <button onClick={() => setAlertDialog(null)} className="btn-primary">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
