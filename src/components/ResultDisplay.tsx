import { useState, useEffect } from "react";
import type {
  CalculationResult,
  Rock,
  MiningGroup,
  Gadget,
  MiningConfiguration,
  Module,
} from "../types";
import { formatPower, formatPercent } from "../utils/calculator";
import { formatModuleTooltip } from "../utils/formatters";
import {
  getMannedLasers,
  getLaserLengthScale,
  calculateMoleLaserAngleOffsets,
  calculateLaserYOffset,
} from "../utils/laserHelpers";
import { getShipImageConfig } from "../utils/shipImageMap";
import { getGadgetSymbol } from "../types";
import "./ResultDisplay.css";
import golemShipImage from "../assets/mining_ship_golem_pixel_120x78.png";
import moleShipImage from "../assets/mining_ship_mole_pixel_120x78_transparent.png";
import prospectorShipImage from "../assets/mining_ship_prospector_pixel_120x78.png";
import asteroidImage from "../assets/asteroid_pixel_1024x1024_true_transparent.png";
import laserGif from "../assets/mining_laser_wave_tileable.gif";

// Map ship IDs to their imported image assets
const SHIP_IMAGES: Record<string, string> = {
  golem: golemShipImage,
  mole: moleShipImage,
  prospector: prospectorShipImage,
};

/**
 * Ship-specific visual offset configurations for laser beams and UI elements.
 * Centralizes all magic numbers for easier maintenance and tuning.
 */
interface ShipOffsets {
  // Laser beam start position offsets (relative to ship center)
  laser: { x: number; y: number };
  // Scan icon offset (negative = left of ship)
  scanIcon: { x: number };
  // Module buttons offset (negative = left of ship)
  moduleButtons: { x: number };
}

const SHIP_OFFSETS: Record<string, ShipOffsets> = {
  golem: {
    laser: { x: 0, y: -18 },
    scanIcon: { x: -62 },
    moduleButtons: { x: -55 },
  },
  mole: {
    laser: { x: 60, y: 3 },
    scanIcon: { x: -62 },
    moduleButtons: { x: -25 },
  },
  prospector: {
    laser: { x: 0, y: -10 },
    scanIcon: { x: -72 },
    moduleButtons: { x: -33 },
  },
};

/**
 * Multi-ship mode: position-specific laser offsets by ship type and angle.
 * Angle values correspond to ship positions around the rock:
 * - 60°: upper right, 120°: lower right, 240°: lower left, 300°: upper left
 */
type PositionAngle = 60 | 120 | 240 | 300;

interface MultiShipLaserOffset {
  x: number;
  y: number;  // Added to base Y offset
}

const MULTI_SHIP_LASER_OFFSETS: Record<string, Partial<Record<PositionAngle, MultiShipLaserOffset>>> = {
  prospector: {
    120: { x: -20, y: 0 },  // Lower right
    240: { x: 20, y: 0 },   // Lower left
  },
  mole: {
    60: { x: -40, y: 5 },    // Upper right
    120: { x: -50, y: -17 }, // Lower right
    240: { x: 50, y: -19 },  // Lower left
    300: { x: 45, y: 5 },    // Upper left
  },
};

// Helper to get short ship name (e.g., "MISC Prospector" → "Prospector")
function getShortShipName(fullName: string): string {
  return fullName.split(" ").slice(1).join(" ");
}

// Laser beam component using tileable GIF
interface LaserBeamProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  svgSize: number;
}

function LaserBeam({ startX, startY, endX, endY, svgSize }: LaserBeamProps) {
  // Calculate length and angle
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const beamHeight = 20;

  return (
    <div
      className="laser-beam-gif"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: `${svgSize}px`,
        height: `${svgSize}px`,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}>
      <div
        className="laser-beam-animated"
        style={{
          position: "absolute",
          left: `${startX}px`,
          top: `${startY - beamHeight / 2}px`,
          width: `${length}px`,
          height: `${beamHeight}px`,
          transform: `rotate(${angle}deg)`,
          transformOrigin: "0 50%",
          backgroundImage: `url(${laserGif})`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          imageRendering: "pixelated",
          filter:
            "drop-shadow(0 0 8px rgba(255, 200, 0, 0.8)) drop-shadow(0 0 15px rgba(255, 170, 0, 0.5))",
        }}
      />
    </div>
  );
}

// Generate a pseudo-random number based on a seed (for consistent laser variation)
function seededRandom(seed: number): number {
  // Add offset to avoid sin(0) = 0 for seed 0
  const x = Math.sin((seed + 1) * 9999) * 10000;
  return x - Math.floor(x);
}

// Add random variation to laser endpoint (±10% of asteroid radius)
// Varies the distance along the laser beam direction (from ship to endpoint)
function addLaserVariation(
  endX: number,
  endY: number,
  asteroidRadius: number,
  seed: number,
  startX: number,
  startY: number
): { x: number; y: number } {
  // Calculate direction from ship start to endpoint
  const dx = endX - startX;
  const dy = endY - startY;
  const beamLength = Math.sqrt(dx * dx + dy * dy);

  // Add random variation to beam length (±10% of asteroid radius)
  const variation = asteroidRadius * 0.1;
  const randomLengthChange = (seededRandom(seed) - 0.5) * 2 * variation;
  const newBeamLength = beamLength + randomLengthChange;

  // Calculate new endpoint along the same beam direction
  const angle = Math.atan2(dy, dx);
  return {
    x: startX + Math.cos(angle) * newBeamLength,
    y: startY + Math.sin(angle) * newBeamLength,
  };
}

interface ResultDisplayProps {
  result: CalculationResult;
  rock: Rock;
  gadgets: (Gadget | null)[];
  gadgetEnabled?: boolean[];
  onToggleGadget?: (index: number) => void;
  miningGroup?: MiningGroup;
  onToggleShip?: (shipId: string) => void;
  onToggleLaser?: (shipId: string, laserIndex: number) => void;
  onSetScanningShip?: (shipId: string, laserIndex: number) => void;
  backgroundMode?: "starfield" | "landscape";
  onToggleBackground?: () => void;
}

interface SingleShipDisplayProps {
  selectedShip?: { id: string; name: string };
  config?: MiningConfiguration;
  configName?: string;
  onSingleShipToggleLaser?: (laserIndex: number) => void;
  onToggleModule?: (laserIndex: number, moduleIndex: number) => void;
  onGroupToggleModule?: (
    shipId: string,
    laserIndex: number,
    moduleIndex: number
  ) => void;
}

export default function ResultDisplay({
  result,
  rock,
  gadgets,
  gadgetEnabled,
  onToggleGadget,
  miningGroup,
  selectedShip,
  config,
  configName,
  onToggleShip,
  onToggleLaser,
  onSetScanningShip,
  onSingleShipToggleLaser,
  onToggleModule,
  onGroupToggleModule,
  backgroundMode = "starfield",
  onToggleBackground,
}: ResultDisplayProps & SingleShipDisplayProps) {
  // Flying ship easter egg - appears every 5-10 minutes
  const [showFlyingShip, setShowFlyingShip] = useState(false);
  const [flyingShipTop, setFlyingShipTop] = useState(10); // Random position in top third
  const [flyingShipType, setFlyingShipType] = useState<
    "prospector" | "mole" | "golem"
  >("prospector");
  const [flyingShipDirection, setFlyingShipDirection] = useState<
    "from-left" | "from-right"
  >("from-left");
  const [flyingShipScale, setFlyingShipScale] = useState(1); // Random scale 0.5-1.0

  // Helper to scale flyby ship dimensions with random reduction (keeps integers)
  const scaleFlybyDimension = (basePx: number): string => {
    return `${Math.round(basePx * flyingShipScale)}px`;
  };

  // Helper to get random flyby Y position based on background
  const getRandomFlybyTop = () => {
    if (backgroundMode === "starfield") {
      // Full range with 10% buffer from edges (10-90%)
      return 10 + Math.random() * 80;
    } else {
      // Landscape: top third only (5-30%)
      return 5 + Math.random() * 25;
    }
  };

  useEffect(() => {
    const scheduleNextFlyby = () => {
      // Random interval between 3-5 minutes
      const interval = 180000 + Math.random() * 120000;
      return setTimeout(() => {
        // Set random vertical position based on background
        setFlyingShipTop(getRandomFlybyTop());
        // Randomly pick a ship type
        const shipTypes: ("prospector" | "mole" | "golem")[] = [
          "prospector",
          "mole",
          "golem",
        ];
        setFlyingShipType(
          shipTypes[Math.floor(Math.random() * shipTypes.length)]
        );
        // Randomly pick direction
        setFlyingShipDirection(
          Math.random() > 0.5 ? "from-left" : "from-right"
        );
        // Random size reduction 0-50% (scale 0.5-1.0)
        setFlyingShipScale(0.5 + Math.random() * 0.5);
        setShowFlyingShip(true);
        // Hide after animation completes (12 seconds)
        setTimeout(() => setShowFlyingShip(false), 12000);
        // Schedule next flyby
        scheduleNextFlyby();
      }, interval);
    };

    const timeoutId = scheduleNextFlyby();
    return () => clearTimeout(timeoutId);
  }, []);

  const getStatusClass = () => {
    // No laser power means can't break
    if (result.totalLaserPower === 0) return "cannot-break";
    if (result.canBreak) {
      if (result.powerMarginPercent < 20) return "marginal";
      return "can-break";
    }
    // Power is below required - check if within "possible break" range (-15% to 0%)
    if (result.powerMarginPercent >= -15) return "possible-break";
    return "cannot-break";
  };

  const getStatusText = () => {
    // No laser power means can't break
    if (result.totalLaserPower === 0) return "CANNOT BREAK";
    if (result.canBreak) {
      if (result.powerMarginPercent < 20) return "LOW MARGIN BREAK";
      return "CAN BREAK";
    }
    // Power is below required - check if within "possible break" range (-15% to 0%)
    if (result.powerMarginPercent >= -15) return "POSSIBLE BREAK";
    return "CANNOT BREAK";
  };

  // Check if we're in the "possible break" zone for showing the warning
  // Exclude zero power - that's just "cannot break", not "possible break"
  const isPossibleBreak = !result.canBreak && result.totalLaserPower > 0 && result.powerMarginPercent >= -15;

  const powerPercentage =
    result.adjustedLPNeeded > 0
      ? (result.totalLaserPower / result.adjustedLPNeeded) * 100
      : 0;

  // Determine if we have excessive overcharge (>100% margin = >200% total power)
  const hasExcessiveOvercharge = result.powerMarginPercent > 100;
  const hasCriticalOvercharge = result.powerMarginPercent > 100;

  // Get asteroid size multiplier based on rock size (1:1 aspect ratio)
  const getAsteroidSize = () => {
    if (rock.mass < 15000) return { width: 100, height: 100 }; // and
    if (rock.mass < 25000) return { width: 175, height: 175 }; // Small
    if (rock.mass < 50000) return { width: 250, height: 250 }; // Medium
    if (rock.mass < 100000) return { width: 325, height: 325 }; // Large
    return { width: 400, height: 400 }; // Huge
  };

  // All rocks centered at the same position (no vertical offset)
  const rockVerticalOffset = 0;

  // Get ship icon based on ship type
  const getShipIcon = (shipId: string) => {
    switch (shipId) {
      case "prospector":
        return "◆";
      case "mole":
        return "◈";
      case "golem":
        return "◇";
      default:
        return "◆";
    }
  };

  // Get symbol for module type
  const getModuleSymbol = (moduleId: string) => {
    if (moduleId === "stampede") return "St";
    return moduleId.charAt(0).toUpperCase();
  };

  return (
    <div className="result-display">
      <div
        className={`status-indicator ${getStatusClass()} ${
          hasCriticalOvercharge ? "critical-overcharge" : ""
        }`}>
        <h2>{getStatusText()}</h2>
      </div>

      <div
        className={`rock-display rock-display-centered ${
          backgroundMode === "landscape" ? "bg-landscape" : "bg-starfield"
        }`}
        onClick={onToggleBackground}
        title="Click to change background">
        {/* Flying ship easter egg */}
        {showFlyingShip && (
          <div
            className={`flying-prospector ${flyingShipDirection}`}
            style={{ top: `${flyingShipTop}%` }}>
            <img
              src={
                flyingShipType === "mole"
                  ? moleShipImage
                  : flyingShipType === "golem"
                  ? golemShipImage
                  : prospectorShipImage
              }
              alt={`Flying ${flyingShipType}`}
              style={{
                // Smaller sizes for background/distant effect (120x78 aspect ratio)
                // Base sizes scaled by random factor (50%-100%)
                width:
                  flyingShipType === "mole"
                    ? scaleFlybyDimension(54)
                    : flyingShipType === "golem"
                    ? scaleFlybyDimension(40)
                    : scaleFlybyDimension(52),
                height:
                  flyingShipType === "mole"
                    ? scaleFlybyDimension(35)
                    : flyingShipType === "golem"
                    ? scaleFlybyDimension(26)
                    : scaleFlybyDimension(34),
                imageRendering: "pixelated",
                // GOLEM brightness adjusted (was 1.3, reduced 20%)
                filter: flyingShipType === "golem" ? "brightness(1.04)" : undefined,
                transform: (() => {
                  const parts: string[] = [];
                  if (flyingShipDirection === "from-left") {
                    parts.push("scaleX(-1)");
                  }
                  // All ships need rotation to level them
                  parts.push("rotate(15deg)");
                  return parts.length > 0 ? parts.join(" ") : "none";
                })(),
              }}
            />
          </div>
        )}
        <div
          className="rock-container"
          onClick={(e) => e.stopPropagation()}
          style={!miningGroup ? { transform: "translateX(145px)" } : undefined}>
          {/* Single ship positioned to the left */}
          {!miningGroup &&
            selectedShip &&
            (() => {
              const asteroidSize = getAsteroidSize();
              const angle = 270; // Left side (270° - 90° adjustment = 180° which points left)
              const asteroidRadius = asteroidSize.width / 2;

              // Get ship image width (10% larger for single ship mode)
              const shipWidth =
                selectedShip.id === "mole"
                  ? 148.5
                  : selectedShip.id === "prospector"
                  ? 110
                  : 66;

              // Fixed ship position for all rock sizes (matches huge rock positioning)
              const radius = 146;
              // Subtract 90° to make 0° point to top instead of right
              const adjustedAngle = angle - 90;
              let shipX = Math.cos((adjustedAngle * Math.PI) / 180) * radius;
              const shipY = Math.sin((adjustedAngle * Math.PI) / 180) * radius;

              // Move ship left by half the ship image width to center it properly
              shipX -= shipWidth / 2;

              const svgSize = 800;
              const center = svgSize / 2;
              // Laser starts at ship position with ship-specific offsets
              const shipOffsets = SHIP_OFFSETS[selectedShip.id] || SHIP_OFFSETS.prospector;
              const laserStartX = center + shipX + shipOffsets.laser.x;
              const laserStartY = center + shipY + shipOffsets.laser.y;
              // Rock visual center - all rocks centered at same position
              const rockVisualCenterY = center;
              // Laser ends at rock visual center, but shortened by 20% (or lengthened by 2% for tiny rocks)
              const fullDX = center - laserStartX;
              const fullDY = rockVisualCenterY - laserStartY;
              const laserLengthScale = getLaserLengthScale(rock.mass);
              const laserEndX = laserStartX + fullDX * laserLengthScale;
              const laserEndY = laserStartY + fullDY * laserLengthScale;

              // Check if this is a MOLE and count manned lasers
              const isMole = selectedShip.id === "mole";
              const mannedLasers = getMannedLasers(config);
              const numMannedLasers = mannedLasers.length;

              return (
                <div className="ships-around-rock">
                  {/* Laser beam from ship to rock - only show if MOLE has manned lasers or if not a MOLE */}
                  {(() => {
                    // For MOLE, only render lasers if there are manned lasers
                    if (isMole && numMannedLasers > 0) {
                      const angleOffsets = calculateMoleLaserAngleOffsets(numMannedLasers, rock.mass);

                      return (
                        <>
                          {angleOffsets.map((angleOffset, laserIndex) => {
                            const laserLength = Math.abs(laserEndX - laserStartX);
                            const yOffset = calculateLaserYOffset(angleOffset, laserLength);

                            const offsetEndX = laserEndX;
                            const offsetEndY = laserEndY + yOffset;

                            // Add random variation to endpoint (unique seed per laser)
                            const variedEnd = addLaserVariation(
                              offsetEndX,
                              offsetEndY,
                              asteroidRadius,
                              (laserIndex + 1) * 137,
                              laserStartX,
                              laserStartY
                            );

                            return (
                              <LaserBeam
                                key={laserIndex}
                                startX={laserStartX}
                                startY={laserStartY}
                                endX={variedEnd.x}
                                endY={variedEnd.y}
                                svgSize={svgSize}
                              />
                            );
                          })}
                        </>
                      );
                    }

                    // If no manned lasers (MOLE or non-MOLE), don't render any lasers
                    if (numMannedLasers === 0) {
                      return null;
                    }

                    // For non-MOLE ships, render single laser with variation
                    const variedEnd = addLaserVariation(
                      laserEndX,
                      laserEndY,
                      asteroidRadius,
                      0,
                      laserStartX,
                      laserStartY
                    );
                    return (
                      <LaserBeam
                        startX={laserStartX}
                        startY={laserStartY}
                        endX={variedEnd.x}
                        endY={variedEnd.y}
                        svgSize={svgSize}
                      />
                    );
                  })()}

                  {/* Ship icon */}
                  <div
                    className="ship-icon active"
                    style={{
                      position: "absolute",
                      top: `calc(50% + ${shipY}px)`,
                      left: `calc(50% + ${shipX}px)`,
                      transform: "translate(-50%, -50%)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                    title={selectedShip.name}>
                    {(() => {
                      // Single ship - flipped to face right with 15° upward tilt
                      const shipTransform = "scaleX(-1) rotate(15deg)";
                      // Ship should glow if it has manned lasers (or if it's not a MOLE)
                      const hasActiveLasers = !isMole || numMannedLasers > 0;
                      const shipImageConfig = getShipImageConfig(selectedShip.id);
                      const shipImage = SHIP_IMAGES[selectedShip.id];

                      if (shipImageConfig && shipImage) {
                        return (
                          <img
                            src={shipImage}
                            alt={shipImageConfig.alt}
                            className={`ship-image ${
                              hasActiveLasers ? "has-active-lasers" : ""
                            }`}
                            style={{
                              width: shipImageConfig.width,
                              height: shipImageConfig.height,
                              imageRendering: "pixelated",
                              transform: shipTransform,
                            }}
                          />
                        );
                      } else {
                        return (
                          <div className="ship-symbol">
                            {getShipIcon(selectedShip.id)}
                          </div>
                        );
                      }
                    })()}
                    <div className="ship-label" title={selectedShip.name}>
                      {configName || getShortShipName(selectedShip.name)}
                    </div>

                  </div>

                  {/* Scanning sensor for Prospector/GOLEM (single-laser ships) - positioned to the left (outside) */}
                  {onSetScanningShip &&
                   rock.resistanceMode === 'modified' &&
                   (selectedShip.id === 'prospector' || selectedShip.id === 'golem') &&
                   config &&
                   config.lasers[0]?.laserHead &&
                   config.lasers[0].laserHead.id !== 'none' && (
                    <span
                      className={`scanning-sensor ${
                        rock.scannedByShipId === selectedShip.id && rock.scannedByLaserIndex === 0
                          ? 'selected' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSetScanningShip(selectedShip.id, 0);
                      }}
                      title="Click to mark as scanning ship"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${shipY - 10}px)`,
                        left: `calc(50% + ${shipX + shipOffsets.scanIcon.x}px)`,
                        transform: "translate(-50%, -50%)",
                        cursor: "pointer",
                        pointerEvents: "auto",
                        zIndex: 10
                      }}>
                      📡
                    </span>
                  )}

                  {/* Active module controls for Prospector/GOLEM (single-laser ships) */}
                  {(selectedShip.id === 'prospector' || selectedShip.id === 'golem') &&
                    config &&
                    onToggleModule &&
                    (() => {
                      const laser = config.lasers[0];
                      const activeModules = laser?.modules
                        ?.map((module, moduleIndex) => {
                          if (
                            module &&
                            module.category === "active" &&
                            module.id !== "none"
                          ) {
                            const isActive = laser.moduleActive
                              ? laser.moduleActive[moduleIndex] === true
                              : false;
                            return { module, moduleIndex, isActive };
                          }
                          return null;
                        })
                        .filter(Boolean) as Array<{
                        module: Module;
                        moduleIndex: number;
                        isActive: boolean;
                      }>;

                      if (!activeModules || activeModules.length === 0) return null;

                      return (
                        <div
                          className="laser-controls"
                          style={{
                            position: "absolute",
                            top: `calc(50% + ${shipY - 15}px)`,
                            left: `calc(50% + ${shipX - shipWidth / 2 + shipOffsets.moduleButtons.x}px)`,
                            transform: "translate(-100%, -50%)",
                            display: "flex",
                            flexDirection: "row",
                            gap: "0.25rem",
                            pointerEvents: "auto",
                            alignItems: "center",
                          }}
                          onClick={(e) => e.stopPropagation()}>
                          {activeModules.map((item) => (
                            <span
                              key={item.moduleIndex}
                              className={`module-icon ${
                                item.isActive ? "active" : "inactive"
                              }`}
                              title={formatModuleTooltip(item.module)}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleModule(0, item.moduleIndex);
                              }}
                              style={{ cursor: "pointer" }}>
                              {getModuleSymbol(item.module.id)}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                  {/* Laser controls for MOLE */}
                  {selectedShip.id === "mole" &&
                    onSingleShipToggleLaser &&
                    config && (
                      <div
                        className="laser-controls"
                        style={{
                          position: "absolute",
                          top: `calc(50% + ${shipY}px)`,
                          left: `calc(50% + ${shipX - shipWidth / 2 - 15}px)`,
                          transform: "translate(-100%, -50%)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                          pointerEvents: "auto",
                          alignItems: "flex-end",
                        }}
                        onClick={(e) => e.stopPropagation()}>
                        {/* Single sensor icon above all laser buttons - positioned absolutely */}
                        {onSetScanningShip && rock.resistanceMode === 'modified' && (() => {
                          const isSelected = rock.scannedByShipId === selectedShip.id;
                          return (
                            <span
                              className={`scanning-sensor-mole ${isSelected ? 'selected' : ''}`}
                              style={{
                                position: "absolute",
                                top: "-2rem",
                                right: "0",
                                fontSize: "1.5rem",
                                opacity: isSelected ? 1 : 0.8,
                                filter: isSelected
                                  ? "brightness(1.8) hue-rotate(90deg) drop-shadow(0 0 8px rgba(0, 255, 136, 1)) drop-shadow(0 0 12px rgba(0, 255, 136, 1)) drop-shadow(0 0 16px rgba(0, 255, 136, 0.9))"
                                  : "drop-shadow(0 0 4px rgba(0, 255, 204, 0.6))",
                                pointerEvents: "auto",
                              }}
                              title={isSelected ? "This ship scanned the rock" : "Click a laser's radio button to select scanning laser"}>
                              📡
                            </span>
                          );
                        })()}
                        {/* Vertical stack of laser buttons */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {[0, 1, 2].map((laserIndex) => {
                            const isLaserManned =
                              config.lasers[laserIndex]?.isManned !== false;
                            const laserHead =
                              config.lasers[laserIndex]?.laserHead;
                            const laserName = laserHead?.name || "No Laser";
                            const tooltipText = `${laserName} - ${
                              isLaserManned ? "MANNED" : "UNMANNED"
                            }`;

                            // Get active modules for this laser
                            const laser = config.lasers[laserIndex];
                            const activeModules = laser?.modules
                              ?.map((module, moduleIndex) => {
                                if (
                                  module &&
                                  module.category === "active" &&
                                  module.id !== "none"
                                ) {
                                  const isActive = laser.moduleActive
                                    ? laser.moduleActive[moduleIndex] === true
                                    : false;
                                  return { module, moduleIndex, isActive };
                                }
                                return null;
                              })
                              .filter(Boolean) as Array<{
                              module: Module;
                              moduleIndex: number;
                              isActive: boolean;
                            }>;

                            const isScanning = rock.scannedByShipId === selectedShip.id && rock.scannedByLaserIndex === laserIndex;

                            return (
                              <div
                                key={laserIndex}
                                style={{
                                  display: "flex",
                                  gap: "0.25rem",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                }}>
                                {/* Laser button with radio indicator - positioned first to keep it fixed */}
                                <div style={{ position: "relative", order: 2 }}>
                                  <button
                                    className={`laser-button ${
                                      isLaserManned ? "manned" : "unmanned"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSingleShipToggleLaser(laserIndex);
                                    }}
                                    title={tooltipText}>
                                    L{laserIndex + 1}
                                  </button>
                                  {/* Radio button indicator for scanning ship */}
                                  {onSetScanningShip && rock.resistanceMode === 'modified' && laserHead && laserHead.id !== 'none' && (
                                    <span
                                      className={`scanning-radio ${isScanning ? 'selected' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSetScanningShip(selectedShip.id, laserIndex);
                                      }}
                                      title={isScanning ? "This laser scanned the rock" : "Click to select as scanning laser"}
                                      style={{
                                        position: "absolute",
                                        bottom: "-4px",
                                        right: "-4px",
                                        width: "12px",
                                        height: "12px",
                                        borderRadius: "50%",
                                        border: "2px solid var(--accent-cyan)",
                                        backgroundColor: isScanning ? "var(--accent-cyan)" : "#000",
                                        cursor: "pointer",
                                        boxShadow: isScanning ? "0 0 8px rgba(0, 255, 204, 0.8)" : "none"
                                      }}>
                                    </span>
                                  )}
                                </div>
                                {/* Module buttons to the left - will stack left when added */}
                                {activeModules && activeModules.length > 0 && (
                                  <div
                                    style={{ display: "flex", gap: "0.25rem", order: 1 }}>
                                    {activeModules.map((item) => (
                                      <span
                                        key={item.moduleIndex}
                                        className={`module-icon ${
                                          item.isActive ? "active" : "inactive"
                                        }`}
                                        title={formatModuleTooltip(item.module)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onToggleModule) {
                                            onToggleModule(
                                              laserIndex,
                                              item.moduleIndex
                                            );
                                          }
                                        }}
                                        style={{
                                          cursor: onToggleModule
                                            ? "pointer"
                                            : "default",
                                        }}>
                                        {getModuleSymbol(item.module.id)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              );
            })()}

          {/* Multiple ships positioned around the rock */}
          {miningGroup && miningGroup.ships.length > 0 && (
            <div className="ships-around-rock">
              {miningGroup.ships.map((shipInstance, index) => {
                // Positions: 60°, 120°, 240°, 300° (top is 0°, clockwise)
                const positions = [60, 120, 240, 300];
                const angle = positions[index] || 60;
                const asteroidSize = getAsteroidSize();
                const asteroidRadius = asteroidSize.width / 2;
                // Fixed ship position for all rock sizes (matches huge rock positioning)
                const radius = 179;
                // Subtract 90° to make 0° point to top instead of right
                const adjustedAngle = angle - 90;
                const x = Math.cos((adjustedAngle * Math.PI) / 180) * radius;
                // Fixed vertical offset for all rock sizes (matches huge rock positioning)
                const yOffset = 50;
                const y =
                  Math.sin((adjustedAngle * Math.PI) / 180) * radius + yOffset;
                const isActive = shipInstance.isActive !== false;

                // Check if this ship has any manned lasers (with laser heads configured)
                const isMole = shipInstance.ship.id === "mole";
                const mannedLasers = getMannedLasers(shipInstance.config);
                const numMannedLasers = mannedLasers.length;
                const hasLasers = numMannedLasers > 0;

                return (
                  <div key={shipInstance.id}>
                    {/* Laser beam from ship to rock - only show if active AND has manned lasers */}
                    {isActive &&
                      hasLasers &&
                      (() => {
                        const svgSize = 800;
                        const center = svgSize / 2;

                        // Get base offsets for this ship type
                        const baseOffsets = SHIP_OFFSETS[shipInstance.ship.id] || SHIP_OFFSETS.prospector;
                        let laserXOffset = 0;
                        let laserYOffset = baseOffsets.laser.y;

                        // Apply position-specific adjustments from config
                        const positionOffsets = MULTI_SHIP_LASER_OFFSETS[shipInstance.ship.id]?.[angle as PositionAngle];
                        if (positionOffsets) {
                          laserXOffset = positionOffsets.x;
                          laserYOffset += positionOffsets.y;
                        }

                        const laserStartX = center + x + laserXOffset;
                        const laserStartY = center + y + laserYOffset;
                        // Rock visual center - all rocks centered at same position
                        const rockVisualCenterY = center;
                        // Laser ends at rock visual center
                        const rockCenterEndX = center;
                        const rockCenterEndY = rockVisualCenterY;

                        // For MOLE, render multiple lasers with slight angle variations
                        if (isMole) {
                          const angleOffsets = calculateMoleLaserAngleOffsets(numMannedLasers, rock.mass);

                          return (
                            <>
                              {angleOffsets.map((angleOffset, laserIndex) => {
                                // First shorten/lengthen the laser from ship to rock center
                                const fullDX = rockCenterEndX - laserStartX;
                                const fullDY = rockCenterEndY - laserStartY;
                                const laserLengthScale = getLaserLengthScale(rock.mass);
                                const laserEndX = laserStartX + fullDX * laserLengthScale;
                                const laserEndY = laserStartY + fullDY * laserLengthScale;

                                // Calculate Y offset for angled laser
                                const laserLength = Math.sqrt(
                                  (laserEndX - laserStartX) ** 2 +
                                    (laserEndY - laserStartY) ** 2
                                );
                                const yOffset = calculateLaserYOffset(angleOffset, laserLength);

                                const rotatedEndX = laserEndX;
                                const rotatedEndY = laserEndY + yOffset;

                                // Add random variation to endpoint (unique seed per ship and laser)
                                const variedEnd = addLaserVariation(
                                  rotatedEndX,
                                  rotatedEndY,
                                  asteroidRadius,
                                  (index + 1) * 1000 + (laserIndex + 1) * 137,
                                  laserStartX,
                                  laserStartY
                                );

                                return (
                                  <LaserBeam
                                    key={laserIndex}
                                    startX={laserStartX}
                                    startY={laserStartY}
                                    endX={variedEnd.x}
                                    endY={variedEnd.y}
                                    svgSize={svgSize}
                                  />
                                );
                              })}
                            </>
                          );
                        }

                        // For non-MOLE ships, render single laser with variation
                        const fullDX = rockCenterEndX - laserStartX;
                        const fullDY = rockCenterEndY - laserStartY;
                        const laserLengthScale = getLaserLengthScale(rock.mass);
                        const laserEndX = laserStartX + fullDX * laserLengthScale;
                        const laserEndY = laserStartY + fullDY * laserLengthScale;

                        const variedEnd = addLaserVariation(
                          laserEndX,
                          laserEndY,
                          asteroidRadius,
                          index * 1000,
                          laserStartX,
                          laserStartY
                        );
                        return (
                          <LaserBeam
                            startX={laserStartX}
                            startY={laserStartY}
                            endX={variedEnd.x}
                            endY={variedEnd.y}
                            svgSize={svgSize}
                          />
                        );
                      })()}

                    {/* Ship icon */}
                    <div
                      className={`ship-icon ${
                        isActive ? "active" : "inactive"
                      } clickable`}
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${y}px)`,
                        left: `calc(50% + ${x}px)`,
                        transform: "translate(-50%, -50%)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleShip && onToggleShip(shipInstance.id);
                      }}
                      title={`${shipInstance.ship.name} - ${isActive ? "ACTIVE" : "INACTIVE"}`}>
                      {(() => {
                        // Calculate ship transform based on position
                        // Left side ships: mirror horizontally to face right
                        const isLeftSide = x < 0;
                        let shipTransform = isLeftSide ? "scaleX(-1)" : "none";

                        // GOLEM rotation - positions point toward rock
                        if (shipInstance.ship.id === "golem") {
                          if (index === 0) {
                            // Top right (60°): rotate 30° clockwise
                            shipTransform = "rotate(30deg)";
                          } else if (index === 1) {
                            // Bottom right (120°): rotate 60° clockwise
                            shipTransform = "rotate(60deg)";
                          } else if (index === 2) {
                            // Bottom left (240°): mirror + 60° rotation
                            shipTransform = "scaleX(-1) rotate(60deg)";
                          } else if (index === 3) {
                            // Top left (300°): mirror + 30° rotation
                            shipTransform = "scaleX(-1) rotate(30deg)";
                          }
                        } else {
                          // Non-GOLEM ships (MOLE, Prospector) use original logic
                          // Lower left position (index 2): mirrored + counter-clockwise 30°
                          if (index === 2) {
                            shipTransform = "scaleX(-1) rotate(30deg)";
                          }

                          // Lower right position (index 1): clockwise 30°
                          if (index === 1) {
                            shipTransform = "rotate(30deg)";
                          }
                        }

                        // Ship should glow if active AND has manned lasers
                        const shouldGlow = isActive && hasLasers;
                        const shipImageConfig = getShipImageConfig(shipInstance.ship.id, true); // small = true for mining group
                        const shipImage = SHIP_IMAGES[shipInstance.ship.id];

                        if (shipImageConfig && shipImage) {
                          return (
                            <img
                              src={shipImage}
                              alt={shipImageConfig.alt}
                              className={`ship-image ${
                                shouldGlow ? "has-active-lasers" : ""
                              }`}
                              style={{
                                width: shipImageConfig.width,
                                height: shipImageConfig.height,
                                imageRendering: "pixelated",
                                transform: shipTransform,
                              }}
                            />
                          );
                        } else {
                          return (
                            <div className="ship-symbol">
                              {getShipIcon(shipInstance.ship.id)}
                            </div>
                          );
                        }
                      })()}
                      <div className="ship-label">{shipInstance.name}</div>

                    </div>

                    {/* Scanning sensor for Prospector/GOLEM (single-laser ships) in multi-ship mode */}
                    {onSetScanningShip &&
                     rock.resistanceMode === 'modified' &&
                     (shipInstance.ship.id === 'prospector' || shipInstance.ship.id === 'golem') &&
                     shipInstance.config.lasers[0]?.laserHead &&
                     shipInstance.config.lasers[0].laserHead.id !== 'none' && (
                      <span
                        className={`scanning-sensor ${
                          rock.scannedByShipId === shipInstance.id && rock.scannedByLaserIndex === 0
                            ? 'selected' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onSetScanningShip(shipInstance.id, 0);
                        }}
                        title="Click to mark as scanning ship"
                        style={{
                          position: "absolute",
                          top: `calc(50% + ${y - 45}px)`,
                          left: x < 0
                            ? `calc(50% + ${x - 40}px)`
                            : `calc(50% + ${x + 60}px)`,
                          transform: "translate(-50%, -50%)",
                          cursor: "pointer",
                          pointerEvents: "auto",
                          zIndex: 10
                        }}>
                        📡
                      </span>
                    )}

                    {/* Active module controls for Prospector/GOLEM in multi-ship mode */}
                    {(shipInstance.ship.id === 'prospector' || shipInstance.ship.id === 'golem') &&
                      onGroupToggleModule &&
                      (() => {
                        const laser = shipInstance.config.lasers[0];
                        const activeModules = laser?.modules
                          ?.map((module, moduleIndex) => {
                            if (
                              module &&
                              module.category === "active" &&
                              module.id !== "none"
                            ) {
                              const isActive = laser.moduleActive
                                ? laser.moduleActive[moduleIndex] === true
                                : false;
                              return { module, moduleIndex, isActive };
                            }
                            return null;
                          })
                          .filter(Boolean) as Array<{
                          module: Module;
                          moduleIndex: number;
                          isActive: boolean;
                        }>;

                        if (!activeModules || activeModules.length === 0) return null;

                        // Position to the outside of the ship (left side ships: buttons on left, right side: buttons on right)
                        const isLeftSide = x < 0;

                        return (
                          <div
                            className="laser-controls"
                            style={{
                              position: "absolute",
                              top: `calc(50% + ${y - 15}px)`,
                              left: isLeftSide
                                ? `calc(50% + ${x - 60}px)`
                                : `calc(50% + ${x + 60}px)`,
                              transform: "translate(-50%, -50%)",
                              display: "flex",
                              flexDirection: "row",
                              gap: "0.25rem",
                              pointerEvents: "auto",
                              alignItems: "center",
                            }}
                            onClick={(e) => e.stopPropagation()}>
                            {activeModules.map((item) => (
                              <span
                                key={item.moduleIndex}
                                className={`module-icon ${
                                  item.isActive ? "active" : "inactive"
                                }`}
                                title={formatModuleTooltip(item.module)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onGroupToggleModule(shipInstance.id, 0, item.moduleIndex);
                                }}
                                style={{ cursor: "pointer" }}>
                                {getModuleSymbol(item.module.id)}
                              </span>
                            ))}
                          </div>
                        );
                      })()}

                    {/* Laser control buttons for MOLE ships */}
                    {shipInstance.ship.id === "mole" && onToggleLaser && (
                      <div
                        className="laser-controls"
                        style={{
                          position: "absolute",
                          top: `calc(50% + ${y}px)`,
                          left:
                            x < 0
                              ? `calc(50% + ${x - 110}px)` // Left side: buttons on the left
                              : `calc(50% + ${x + 110}px)`, // Right side: buttons on the right
                          transform: "translate(-50%, -50%)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                          pointerEvents: "auto",
                          alignItems: x < 0 ? "flex-end" : "flex-start",
                        }}
                        onClick={(e) => e.stopPropagation()}>
                        {/* Single sensor icon above all laser buttons - positioned absolutely */}
                        {onSetScanningShip && rock.resistanceMode === 'modified' && (() => {
                          const isSelected = rock.scannedByShipId === shipInstance.id;
                          return (
                            <span
                              className={`scanning-sensor-mole ${isSelected ? 'selected' : ''}`}
                              style={{
                                position: "absolute",
                                top: "-2rem",
                                right: x < 0 ? "0" : undefined,
                                left: x < 0 ? undefined : "0",
                                fontSize: "1.5rem",
                                opacity: isSelected ? 1 : 0.8,
                                filter: isSelected
                                  ? "brightness(1.8) hue-rotate(90deg) drop-shadow(0 0 8px rgba(0, 255, 136, 1)) drop-shadow(0 0 12px rgba(0, 255, 136, 1)) drop-shadow(0 0 16px rgba(0, 255, 136, 0.9))"
                                  : "drop-shadow(0 0 4px rgba(0, 255, 204, 0.6))",
                                pointerEvents: "auto",
                              }}
                              title={isSelected ? "This ship scanned the rock" : "Click a laser's radio button to select scanning laser"}>
                              📡
                            </span>
                          );
                        })()}
                        {/* Vertical stack of laser buttons */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {[0, 1, 2].map((laserIndex) => {
                            const isLaserManned =
                              shipInstance.config.lasers[laserIndex]?.isManned !==
                              false;
                            const laserHead =
                              shipInstance.config.lasers[laserIndex]?.laserHead;
                            const laserName = laserHead?.name || "No Laser";
                            const tooltipText = `${laserName} - ${
                              isLaserManned ? "MANNED" : "UNMANNED"
                            }`;

                            // Get active modules for this laser
                            const laser = shipInstance.config.lasers[laserIndex];
                            const activeModules = laser?.modules
                              ?.map((module, moduleIndex) => {
                                if (
                                  module &&
                                  module.category === "active" &&
                                  module.id !== "none"
                                ) {
                                  const isActive = laser.moduleActive
                                    ? laser.moduleActive[moduleIndex] === true
                                    : false;
                                  return { module, moduleIndex, isActive };
                                }
                                return null;
                              })
                              .filter(Boolean) as Array<{
                              module: Module;
                              moduleIndex: number;
                              isActive: boolean;
                            }>;

                            // Determine if ship is on left or right side
                            const isLeftSide = x < 0;

                            const isScanning = rock.scannedByShipId === shipInstance.id && rock.scannedByLaserIndex === laserIndex;

                            return (
                              <div
                                key={laserIndex}
                                style={{
                                  display: "flex",
                                  gap: "0.25rem",
                                  alignItems: "center",
                                  justifyContent: isLeftSide
                                    ? "flex-end"
                                    : "flex-start",
                                }}>
                                {/* Laser button with radio indicator - order keeps it fixed */}
                                <div style={{ position: "relative", order: isLeftSide ? 2 : 1 }}>
                                  <button
                                    className={`laser-button ${
                                      isLaserManned ? "manned" : "unmanned"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleLaser(shipInstance.id, laserIndex);
                                    }}
                                    title={tooltipText}>
                                    L{laserIndex + 1}
                                  </button>
                                  {/* Radio button indicator */}
                                  {onSetScanningShip && rock.resistanceMode === 'modified' && laserHead && laserHead.id !== 'none' && (
                                    <span
                                      className={`scanning-radio ${isScanning ? 'selected' : ''}`}
                                      style={{
                                        position: "absolute",
                                        bottom: "-4px",
                                        right: "-4px",
                                        width: "12px",
                                        height: "12px",
                                        borderRadius: "50%",
                                        border: "2px solid var(--accent-cyan)",
                                        backgroundColor: isScanning ? "var(--accent-cyan)" : "#000",
                                        cursor: "pointer",
                                        boxShadow: isScanning ? "0 0 8px rgba(0, 255, 204, 0.8)" : "none"
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSetScanningShip(shipInstance.id, laserIndex);
                                      }}>
                                    </span>
                                  )}
                                </div>

                                {/* Module buttons - stack away from ship using flex order */}
                                {activeModules && activeModules.length > 0 && (
                                  <div
                                    style={{ display: "flex", gap: "0.25rem", order: isLeftSide ? 1 : 2 }}>
                                    {activeModules.map((item) => (
                                      <span
                                        key={item.moduleIndex}
                                        className={`module-icon ${
                                          item.isActive ? "active" : "inactive"
                                        }`}
                                        title={formatModuleTooltip(item.module)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onGroupToggleModule) {
                                            onGroupToggleModule(
                                              shipInstance.id,
                                              laserIndex,
                                              item.moduleIndex
                                            );
                                          }
                                        }}
                                        style={{
                                          cursor: onGroupToggleModule
                                            ? "pointer"
                                            : "default",
                                        }}>
                                        {getModuleSymbol(item.module.id)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Rock in center */}
          <div
            className={`rock-icon ${getStatusClass()} ${
              hasExcessiveOvercharge ? "overcharge-warning" : ""
            }`}
            style={{
              position: "relative",
              marginTop:
                rockVerticalOffset > 0 ? `${rockVerticalOffset}px` : undefined,
            }}
            onClick={(e) => e.stopPropagation()}>
            <div
              className={`rock-symbol ${
                hasExcessiveOvercharge ? "trembling" : ""
              }`}>
              <img
                src={asteroidImage}
                alt="Asteroid"
                className="asteroid-image"
                style={{
                  width: `${getAsteroidSize().width}px`,
                  height: `${getAsteroidSize().height}px`,
                  imageRendering: "pixelated",
                }}
              />
              {/* Gadget symbols ON the rock */}
              {gadgets && gadgets.length > 0 && (
                <div className="gadget-symbols-on-rock">
                  {gadgets.map((gadget, index) => {
                    if (!gadget || gadget.id === "none") return null;
                    const isEnabled = gadgetEnabled
                      ? gadgetEnabled[index] !== false
                      : true;
                    // Build tooltip with all effects
                    const formatEffect = (
                      value: number | undefined,
                      label: string
                    ) => {
                      if (value === undefined || value === 1) return null;
                      const pct =
                        value > 1
                          ? `+${Math.round((value - 1) * 100)}%`
                          : `-${Math.round((1 - value) * 100)}%`;
                      return `${label}: ${pct}`;
                    };
                    const effects = [
                      formatEffect(gadget.resistModifier, "Resist"),
                      formatEffect(gadget.instabilityModifier, "Instability"),
                      formatEffect(
                        gadget.chargeWindowModifier,
                        "Charge Window"
                      ),
                      formatEffect(gadget.chargeRateModifier, "Charge Rate"),
                      formatEffect(gadget.clusterModifier, "Clustering"),
                    ].filter(Boolean);
                    const tooltipText = `${gadget.name}\n${effects.join("\n")}`;
                    return (
                      <span
                        key={index}
                        className={`gadget-symbol-small ${
                          !isEnabled ? "disabled" : ""
                        } ${onToggleGadget ? "clickable" : ""}`}
                        title={tooltipText}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleGadget) {
                            onToggleGadget(index);
                          }
                        }}>
                        {getGadgetSymbol(gadget.id)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scanning ship selection message */}
      {onSetScanningShip && rock.resistanceMode === 'modified' && !rock.scannedByShipId && (
        <div className="scanning-ship-message">
          <span className="message-icon">📡</span>
          <span className="message-text">
            Select which ship/laser scanned this rock<br />by activating a sensor icon or laser radio button
          </span>
        </div>
      )}

      <div className="power-bar-container" onClick={(e) => e.stopPropagation()}>
        <div className={`power-bar ${hasExcessiveOvercharge ? "excessive-glow" : ""}`}>
          {(() => {
            // Calculate bar fill width:
            // 0% power (-100% surplus) = 0% bar (far left)
            // 50% power (-50% surplus) = 50% bar (middle)
            // 100% power (0% surplus) = 75% bar (break threshold)
            // 200% power (+100% surplus) = 100% bar (far right)
            let fillWidth: number;
            if (powerPercentage <= 50) {
              // 0-50% power maps to 0-50% bar (1:1)
              fillWidth = powerPercentage;
            } else if (powerPercentage <= 100) {
              // 50-100% power maps to 50-75% bar
              fillWidth = 50 + (powerPercentage - 50) * 0.5;
            } else {
              // 100-200% power maps to 75-100% bar
              const surplus = Math.min(result.powerMarginPercent, 100);
              fillWidth = 75 + surplus * 0.25;
            }
            fillWidth = Math.min(Math.max(fillWidth, 0), 100);

            // Determine pulse class based on surplus
            // Yellow pulse for 50-100% surplus, red backglow takes over at >100%
            const surplusPercent = result.powerMarginPercent;
            const pulseClass = surplusPercent > 50 && surplusPercent <= 100 ? "pulse-yellow" : "";

            // Dynamic gradient based on fill position:
            // Colors should appear at correct positions relative to full bar
            // 0-33% bar: solid red
            // 33-75% bar: red → orange → yellow (yellow-green transition at 75%)
            // 75% bar: green (break threshold - 0% surplus)
            // 75-100% bar: green → yellow → orange → red
            let gradient: string;
            if (fillWidth <= 33) {
              // Fill is entirely in the red zone - solid red
              gradient = "var(--danger)";
            } else if (fillWidth <= 75) {
              // Fill extends into red→yellow zone (not yet at break threshold)
              // NO green until we reach 0% surplus (75% bar position)
              const redEndPct = (33 / fillWidth) * 100;
              const orangePct = (42 / fillWidth) * 100;
              const yellowStartPct = (50 / fillWidth) * 100;
              // Yellow all the way to the edge - no green yet
              gradient = `linear-gradient(90deg,
                var(--danger) 0%,
                var(--danger) ${redEndPct}%,
                #ff6600 ${Math.min(orangePct, 100)}%,
                #ffdd00 ${Math.min(yellowStartPct, 100)}%,
                #ffdd00 100%)`;
            } else {
              // Fill extends into surplus zone (past 75%)
              // Calculate all color stop positions within the fill
              // Yellow stays solid right up to green zone
              const redEndPct = (33 / fillWidth) * 100;
              const orangePct = (40 / fillWidth) * 100;
              const yellowStartPct = (45 / fillWidth) * 100;
              const yellowEndPct = (72 / fillWidth) * 100; // Yellow stays solid until here
              const greenStartPct = (73 / fillWidth) * 100;
              const greenEndPct = (80 / fillWidth) * 100;
              const yellowBackStartPct = (81 / fillWidth) * 100;
              const yellowBackEndPct = (88 / fillWidth) * 100;
              const orangeBackPct = (94 / fillWidth) * 100;
              gradient = `linear-gradient(90deg,
                var(--danger) 0%,
                var(--danger) ${redEndPct}%,
                #ff6600 ${orangePct}%,
                #ffdd00 ${yellowStartPct}%,
                #ffdd00 ${yellowEndPct}%,
                var(--success) ${greenStartPct}%,
                var(--success) ${greenEndPct}%,
                #ffdd00 ${yellowBackStartPct}%,
                #ffdd00 ${yellowBackEndPct}%,
                #ff6600 ${orangeBackPct}%,
                var(--danger) 100%)`;
            }

            return (
              <div
                className={`power-fill ${getStatusClass()} ${pulseClass}`}
                style={{
                  width: `${fillWidth}%`,
                  background: gradient,
                }}
              />
            );
          })()}
          <div className="power-margin-overlay">
            {result.powerMarginPercent >= 0 ? "Surplus:" : "Deficit:"}{" "}
            {formatPercent(result.powerMarginPercent)}
          </div>
        </div>
        <div className="power-labels">
          <span>Your Power: {formatPower(result.totalLaserPower)}</span>
          <span>Required: {formatPower(result.adjustedLPNeeded)}</span>
        </div>

        {/* Tip messages at bottom of power bar frame */}
        {hasExcessiveOvercharge && (
          <div className="overcharge-warning">
            <strong>WARNING!</strong> Excessive overcharge capability detected.
            Rock overcharge and premature fracture could easily occur. Approach
            with caution or reduce the number of lasers used.
          </div>
        )}

        {((result.powerMarginPercent >= -15 && result.powerMarginPercent < 0) ||
          (result.powerMarginPercent > 0 &&
            result.powerMarginPercent <= 10)) && (
          <div className="distance-tip" onClick={(e) => e.stopPropagation()}>
            <span className="warning-label">TIP:</span> Reducing laser distance may increase chances
            of a successful break.
          </div>
        )}

        {isPossibleBreak && (
          <div className="possible-break-warning" onClick={(e) => e.stopPropagation()}>
            <span className="warning-label">CAUTION:</span> Reduced distance breaks can lead to equipment damage and/or bodily injury.
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Laser Power</div>
          <div className="stat-value">
            {formatPower(result.totalLaserPower)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Adjusted Resistance</div>
          <div className="stat-value">
            {result.adjustedResistance.toFixed(2)}
          </div>
          <div className="stat-subtitle">
            {result.resistanceContext ? (
              <>
                Base × modifier = {result.resistanceContext.derivedBaseValue.toFixed(2)} × {result.resistanceContext.appliedModifier.toFixed(3)}
              </>
            ) : (
              <>
                Base × modifier = {rock.resistance} × {result.totalResistModifier.toFixed(3)}
              </>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Laser Power Required</div>
          <div className="stat-value">
            {formatPower(result.adjustedLPNeeded)}
          </div>
          <div className="stat-subtitle">
            Base: {formatPower(result.baseLPNeeded)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Power Difference</div>
          <div
            className={`stat-value ${
              result.canBreak ? "positive" : "negative"
            }`}>
            {result.canBreak ? "+" : ""}
            {formatPower(result.powerMargin)}
          </div>
          <div className="stat-subtitle">
            {formatPercent(result.powerMarginPercent)}
          </div>
        </div>
      </div>

      <div className="calculation-details">
        <h3>Calculation Details</h3>
        <div className="detail-row">
          <span>Rock Mass:</span>
          <span>{rock.mass.toFixed(1)}</span>
        </div>
        <div className="detail-row">
          <span>Base Resistance:</span>
          <span>{rock.resistance.toFixed(1)}</span>
        </div>
        <div className="detail-row">
          <span>Total Resist Modifier:</span>
          <span>{result.totalResistModifier.toFixed(3)}x</span>
        </div>
        <div className="detail-row">
          <span>Formula:</span>
          <span>(Mass / (1 - (Resist × 0.01))) / 5</span>
        </div>
      </div>
    </div>
  );
}
