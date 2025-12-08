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
import golemShipImage from "../assets/mining_ship_golem_pixel_120x48.png";
import moleShipImage from "../assets/mining_ship_mole_pixel_120x48_transparent.png";
import prospectorShipImage from "../assets/mining_ship_prospector_pixel_120x48.png";
import asteroidImage from "../assets/asteroid_pixel_1024x1024_true_transparent.png";
import laserGif from "../assets/mining_laser_wave_tileable.gif";

// Map ship IDs to their imported image assets
const SHIP_IMAGES: Record<string, string> = {
  golem: golemShipImage,
  mole: moleShipImage,
  prospector: prospectorShipImage,
};

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

  useEffect(() => {
    const scheduleNextFlyby = () => {
      // Random interval between 5-10 minutes (300000-600000ms)
      const interval = 300000 + Math.random() * 300000;
      return setTimeout(() => {
        // Set random vertical position in top third (5-30%)
        setFlyingShipTop(5 + Math.random() * 25);
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
    if (!result.canBreak) return "cannot-break";
    if (result.powerMarginPercent < 20) return "marginal";
    return "can-break";
  };

  const getStatusText = () => {
    if (!result.canBreak) return "CANNOT BREAK";
    if (result.powerMarginPercent < 20) return "LOW MARGIN BREAK";
    return "CAN BREAK";
  };

  const powerPercentage =
    result.adjustedLPNeeded > 0
      ? (result.totalLaserPower / result.adjustedLPNeeded) * 100
      : 0;

  // Determine if we have overcharge (>100%) and if it's excessive (>200%)
  // Note: powerPercentage represents total power as % of required power
  // So 200% means you have 2x the required power (100% margin)
  const hasOvercharge = powerPercentage > 100;
  const hasExcessiveOvercharge = result.powerMarginPercent > 100; // >100% margin = >200% total power
  const hasCriticalOvercharge = result.powerMarginPercent > 100;

  console.log(
    "hasExcessiveOvercharge:",
    hasExcessiveOvercharge,
    "powerMarginPercent:",
    result.powerMarginPercent
  );

  // Calculate the percentage of the bar that should show overcharge gradient
  // If we have 120% power, the rightmost 20% of the bar should be red
  const overchargeGradientPercent = hasOvercharge
    ? Math.min(powerPercentage - 100, 100) // Cap at 100% overcharge
    : 0;

  // Get asteroid size multiplier based on rock size (1:1 aspect ratio)
  const getAsteroidSize = () => {
    if (rock.mass < 15000) return { width: 100, height: 100 }; // and
    if (rock.mass < 25000) return { width: 175, height: 175 }; // Small
    if (rock.mass < 50000) return { width: 250, height: 250 }; // Medium
    if (rock.mass < 100000) return { width: 325, height: 325 }; // Large
    return { width: 400, height: 400 }; // Huge
  };

  // Calculate rock vertical offset for smaller rocks
  // Ships are positioned as if for a 25000 mass rock, so smaller rocks need to shift down
  // This makes the laser visually hit the rock center
  const getRockVerticalOffset = () => {
    if (rock.mass < 50000) {
      const asteroidSize = getAsteroidSize();
      const asteroidRadius = asteroidSize.width / 2;
      const positioningRadius = 87.5; // 25000 mass rock radius
      const tinyRockSize = 100; // Tiny rock diameter

      // For tiny rocks, shift down by positioning difference PLUS full diameter
      if (rock.mass < 15000) {
        return positioningRadius - asteroidRadius + tinyRockSize;
      }
      // For small and medium rocks, shift down so center matches tiny rock center
      // Tiny rock center is at: original + (37.5 + 100) = original + 137.5
      // Rock needs to shift down by: 137.5 - (difference in radii)
      return (
        positioningRadius -
        asteroidRadius +
        tinyRockSize -
        (asteroidRadius - tinyRockSize / 2)
      );
    }
    return 0;
  };
  const rockVerticalOffset = getRockVerticalOffset();

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
                width:
                  flyingShipType === "mole"
                    ? "135px"
                    : flyingShipType === "golem"
                    ? "75px"
                    : "100px",
                height:
                  flyingShipType === "mole"
                    ? "54px"
                    : flyingShipType === "golem"
                    ? "30px"
                    : "40px",
                imageRendering: "pixelated",
                transform:
                  flyingShipDirection === "from-left" ? "scaleX(-1)" : "none",
              }}
            />
          </div>
        )}
        <div
          className="rock-container"
          onClick={(e) => e.stopPropagation()}
          style={!miningGroup ? { transform: "translateX(100px)" } : undefined}>
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

              // Adjust radius multiplier based on rock size
              // For all rocks under 50000 mass, use the same positioning as 25000 mass rock (radius 87.5)
              let radiusMultiplier = 1.1;
              let positioningRadius = asteroidRadius; // Default: use actual asteroid radius

              if (rock.mass < 50000) {
                // All rocks under 50000 - use 25000 mass rock positioning (radius 87.5)
                positioningRadius = 87.5;
                radiusMultiplier = 1.3; // Reduced from 1.6 to bring ship closer
              } else if (rock.mass >= 100000) {
                // Huge rocks - use same positioning as large rocks
                radiusMultiplier = 0.9 * (325 / 400); // Scale down proportionally
              } else if (rock.mass >= 50000) {
                // Large rocks - bring ships closer to keep controls visible
                radiusMultiplier = 0.9;
              }

              const radius = positioningRadius * radiusMultiplier;
              // Subtract 90° to make 0° point to top instead of right
              const adjustedAngle = angle - 90;
              let shipX = Math.cos((adjustedAngle * Math.PI) / 180) * radius;
              const shipY = Math.sin((adjustedAngle * Math.PI) / 180) * radius;

              // Move ship left by half the ship image width to center it properly
              shipX -= shipWidth / 2;

              const svgSize = 800;
              const center = svgSize / 2;
              // Laser starts at ship position (center of ship image)
              // GOLEM needs a higher laser start point to match the ship design
              const laserYOffset = selectedShip.id === "golem" ? -18 : -10;
              const laserStartX = center + shipX;
              const laserStartY = center + shipY + laserYOffset;
              // Rock visual center - the rock is shifted down by marginTop in the DOM,
              // Calculate where the laser should hit based on rock size
              let rockVisualCenterY = center + rockVerticalOffset / 2;
              // For rocks under 50000, adjust to hit the visual center of the shifted rock
              if (rock.mass < 50000) {
                rockVisualCenterY -= asteroidSize.width / 16; // Move up by sixteenth diameter
              }
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
                      // Single ship is always at 180° (left side), so just mirror horizontally
                      const shipTransform = "scaleX(-1)";
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
                    <div className="ship-label">
                      {selectedShip.name.split(" ").slice(1).join(" ")}
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
                        left: `calc(50% + ${shipX - 50}px)`,
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
                            left: `calc(50% + ${shipX - shipWidth / 2 - 10}px)`,
                            transform: "translateY(-50%)",
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
                          left: `calc(50% + ${shipX - shipWidth / 2 - 50}px)`,
                          transform: "translateY(-50%)",
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
                // Position ships at radius that scales with rock size
                const asteroidRadius = asteroidSize.width / 2;
                // Adjust spacing based on rock size
                let radiusMultiplier = 1.35;
                let positioningRadius = asteroidRadius; // Default: use actual asteroid radius

                if (rock.mass < 50000) {
                  // All rocks under 50000 - use 25000 mass rock positioning (radius 87.5)
                  positioningRadius = 87.5;
                  radiusMultiplier = 1.6; // Same as single-ship mode
                } else if (rock.mass >= 100000) {
                  radiusMultiplier = 1.1 * (325 / 400); // Huge - same as large
                } else if (rock.mass >= 50000) {
                  radiusMultiplier = 1.1; // Large - bring closer
                }
                const radius = positioningRadius * radiusMultiplier;
                // Subtract 90° to make 0° point to top instead of right
                const adjustedAngle = angle - 90;
                const x = Math.cos((adjustedAngle * Math.PI) / 180) * radius;
                // Move ships down - for rocks under 50000, use consistent offset
                let yOffset;
                if (rock.mass < 50000) {
                  // Use small rock height for base offset, plus 50px for positioning
                  yOffset = 175 * 0.125 + 50; // 21.875 + 50 = 71.875px
                } else {
                  yOffset = asteroidSize.height * 0.125;
                }
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
                        // Laser starts at ship position (center of ship image)
                        // GOLEM needs a higher laser start point to match the ship design
                        const laserYOffset = shipInstance.ship.id === "golem" ? -18 : -10;
                        const laserStartX = center + x;
                        const laserStartY = center + y + laserYOffset;
                        // Calculate rock visual center (accounting for rock offset)
                        let rockVisualCenterY = center + rockVerticalOffset / 2;
                        if (rock.mass < 50000) {
                          rockVisualCenterY -= asteroidSize.width / 16; // Move up by sixteenth diameter for rocks under 50000
                        }
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
                      title={`${shipInstance.ship.name
                        .split(" ")
                        .slice(1)
                        .join(" ")} - ${isActive ? "ACTIVE" : "INACTIVE"}`}>
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
                          console.log(
                            "Gadget icon clicked:",
                            index,
                            gadget.name
                          );
                          e.stopPropagation();
                          if (onToggleGadget) {
                            console.log(
                              "Calling onToggleGadget for index:",
                              index
                            );
                            onToggleGadget(index);
                          } else {
                            console.log("onToggleGadget is not defined");
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
        <div className="power-bar">
          <div
            className={`power-fill ${getStatusClass()} ${
              hasOvercharge ? "has-overcharge" : ""
            }`}
            style={{
              width: "100%",
              background: hasOvercharge
                ? `linear-gradient(90deg,
                    ${
                      getStatusClass() === "can-break"
                        ? "var(--success)"
                        : getStatusClass() === "marginal"
                        ? "var(--warning)"
                        : "var(--danger)"
                    } 0%,
                    ${
                      getStatusClass() === "can-break"
                        ? "var(--accent-cyan)"
                        : getStatusClass() === "marginal"
                        ? "var(--accent-gold)"
                        : "#ff6688"
                    } ${Math.max(100 - overchargeGradientPercent, 50)}%,
                    ${
                      powerPercentage > 150
                        ? "var(--warning)"
                        : "var(--accent-gold)"
                    } ${Math.max(100 - overchargeGradientPercent / 2, 75)}%,
                    ${
                      hasExcessiveOvercharge
                        ? "var(--danger)"
                        : "var(--warning)"
                    } 100%)`
                : undefined,
            }}
          />
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

        {((result.powerMarginPercent >= -10 && result.powerMarginPercent < 0) ||
          (result.powerMarginPercent > 0 &&
            result.powerMarginPercent <= 10)) && (
          <div className="distance-tip" onClick={(e) => e.stopPropagation()}>
            <strong>Tip:</strong> Reducing laser distance may increase chances
            of a successful break.
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
                Derived Base: {result.resistanceContext.derivedBaseValue.toFixed(2)} × {result.resistanceContext.appliedModifier.toFixed(3)}
              </>
            ) : (
              <>
                Base: {rock.resistance} × {result.totalResistModifier.toFixed(3)}
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
