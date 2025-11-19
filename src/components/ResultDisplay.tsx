import type { CalculationResult, Rock, MiningGroup } from "../types";
import { formatPower, formatPercent } from "../utils/calculator";
import { getGadgetSymbol } from "../types";
import "./ResultDisplay.css";
import golemShipImage from "../assets/mining_ship_golem_pixel_120x48.png";
import moleShipImage from "../assets/mining_ship_mole_pixel_120x48_transparent.png";
import prospectorShipImage from "../assets/mining_ship_prospector_pixel_120x48.png";
import asteroidImage from "../assets/asteroid_pixel_120x48_true_transparent.png";

interface ResultDisplayProps {
  result: CalculationResult;
  rock: Rock;
  miningGroup?: MiningGroup;
  onToggleShip?: (shipId: string) => void;
}

interface SingleShipDisplayProps {
  selectedShip?: { id: string; name: string };
}

export default function ResultDisplay({
  result,
  rock,
  miningGroup,
  selectedShip,
  onToggleShip,
}: ResultDisplayProps & SingleShipDisplayProps) {
  const getStatusClass = () => {
    if (!result.canBreak) return "cannot-break";
    if (result.powerMarginPercent < 20) return "marginal";
    return "can-break";
  };

  const getStatusText = () => {
    if (!result.canBreak) return "CANNOT BREAK";
    if (result.powerMarginPercent < 20) return "RISKY - LOW MARGIN";
    return "CAN BREAK";
  };

  const powerPercentage =
    result.adjustedLPNeeded > 0
      ? Math.min((result.totalLaserPower / result.adjustedLPNeeded) * 100, 100)
      : 0;

  // Calculate rock size category based on mass
  const getRockSize = () => {
    if (rock.mass < 15000) return "Tiny";
    if (rock.mass < 25000) return "Small";
    if (rock.mass < 50000) return "Medium";
    if (rock.mass < 100000) return "Large";
    return "Huge";
  };

  // Get asteroid size multiplier based on rock size (1:1 aspect ratio)
  const getAsteroidSize = () => {
    if (rock.mass < 15000) return { width: 100, height: 100 }; // Tiny (50% smaller)
    if (rock.mass < 25000) return { width: 175, height: 175 }; // Small
    if (rock.mass < 50000) return { width: 250, height: 250 }; // Medium
    if (rock.mass < 100000) return { width: 325, height: 325 }; // Large
    return { width: 400, height: 400 }; // Huge
  };

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

  return (
    <div className="result-display">
      <div className="rock-display">
        {/* Rock stats column on the left */}
        <div className="rock-stats-sidebar">
          {rock.name && <div className="rock-title">{rock.name}</div>}
          <div className="rock-stat-item">
            <div className="stat-label-top">Mass</div>
            <div className="stat-value-bottom">{rock.mass.toFixed(0)}</div>
          </div>
          <div className="rock-stat-item">
            <div className="stat-label-top">Size</div>
            <div className="stat-value-bottom">{getRockSize()}</div>
          </div>
          <div className="rock-stat-item">
            <div className="stat-label-top">Resistance</div>
            <div className="stat-value-bottom">{rock.resistance.toFixed(1)}%</div>
          </div>
        </div>

        <div className="rock-container">
          {/* Single ship positioned to the left */}
          {!miningGroup &&
            selectedShip &&
            (() => {
              const asteroidSize = getAsteroidSize();
              const angle = 270; // Left side (270° - 90° adjustment = 180° which points left)
              const asteroidRadius = asteroidSize.width / 2;
              const radius = asteroidRadius * 1.1; // 110% of asteroid radius
              // Subtract 90° to make 0° point to top instead of right
              const adjustedAngle = angle - 90;
              const shipX = Math.cos((adjustedAngle * Math.PI) / 180) * radius;
              const shipY = Math.sin((adjustedAngle * Math.PI) / 180) * radius;

              const svgSize = 800;
              const center = svgSize / 2;
              // Laser starts at ship position (center of ship image)
              const laserStartX = center + shipX;
              const laserStartY = center + shipY - 10;
              // Laser ends 5% short of asteroid center
              const distance = Math.sqrt(shipX * shipX + shipY * shipY);
              const directionX = -shipX / distance; // Normalized direction from ship to center
              const directionY = -shipY / distance;
              const shortfall = (asteroidSize.width / 2) * 0.2; // 10% of radius
              const laserEndX = center - directionX * shortfall;
              const laserEndY = center - directionY * shortfall;

              return (
                <div className="ships-around-rock">
                  {/* Laser beam from ship to rock - always show for single ship */}
                  <svg
                    className="laser-beam"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: `${svgSize}px`,
                      height: `${svgSize}px`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}>
                    <line
                      x1={laserStartX}
                      y1={laserStartY}
                      x2={laserEndX}
                      y2={laserEndY}
                      stroke="var(--warning)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity="0.8">
                      <animate
                        attributeName="stroke-dashoffset"
                        from="8"
                        to="0"
                        dur="0.3s"
                        repeatCount="indefinite"
                      />
                    </line>
                  </svg>

                  {/* Ship icon */}
                  <div
                    className="ship-icon active"
                    style={{
                      position: "absolute",
                      top: `calc(50% + ${shipY}px)`,
                      left: `calc(50% + ${shipX}px)`,
                      transform: "translate(-50%, -50%)",
                    }}
                    title={selectedShip.name}>
                    {(() => {
                      // Single ship is always at 180° (left side), so just mirror horizontally
                      const shipTransform = "scaleX(-1)";

                      if (selectedShip.id === "golem") {
                        return (
                          <img
                            src={golemShipImage}
                            alt="GOLEM"
                            className="ship-image"
                            style={{
                              width: "60px",
                              height: "24px",
                              imageRendering: "pixelated",
                              transform: shipTransform,
                            }}
                          />
                        );
                      } else if (selectedShip.id === "mole") {
                        return (
                          <img
                            src={moleShipImage}
                            alt="MOLE"
                            className="ship-image"
                            style={{
                              width: "135px",
                              height: "54px",
                              imageRendering: "pixelated",
                              transform: shipTransform,
                            }}
                          />
                        );
                      } else if (selectedShip.id === "prospector") {
                        return (
                          <img
                            src={prospectorShipImage}
                            alt="Prospector"
                            className="ship-image"
                            style={{
                              width: "90px",
                              height: "36px",
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
                // Add extra spacing for tiny and small rocks
                let radiusMultiplier = 1.15;
                if (rock.mass < 15000) radiusMultiplier = 1.65; // Tiny
                else if (rock.mass < 25000) radiusMultiplier = 1.35; // Small
                const radius = asteroidRadius * radiusMultiplier;
                // Subtract 90° to make 0° point to top instead of right
                const adjustedAngle = angle - 90;
                const x = Math.cos((adjustedAngle * Math.PI) / 180) * radius;
                // Move ships up by 20% of asteroid height
                const y = Math.sin((adjustedAngle * Math.PI) / 180) * radius - (asteroidSize.height * 0.2);
                const isActive = shipInstance.isActive !== false;

                return (
                  <div key={shipInstance.id}>
                    {/* Laser beam from ship to rock - only show if active */}
                    {isActive &&
                      (() => {
                        const svgSize = 800;
                        const center = svgSize / 2;
                        // Laser starts at ship position (center of ship image)
                        const laserStartX = center + x;
                        const laserStartY = center + y - 10;
                        // Laser ends 5% short of asteroid center
                        const distance = Math.sqrt(x * x + y * y);
                        const directionX = -x / distance; // Normalized direction from ship to center
                        const directionY = -y / distance;
                        const shortfall = (asteroidSize.width / 2) * 0.25; // 5% of radius
                        const laserEndX = center - directionX * shortfall;
                        const laserEndY = center - directionY * shortfall;

                        return (
                          <svg
                            className="laser-beam"
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              width: `${svgSize}px`,
                              height: `${svgSize}px`,
                              transform: "translate(-50%, -50%)",
                              pointerEvents: "none",
                            }}>
                            <line
                              x1={laserStartX}
                              y1={laserStartY}
                              x2={laserEndX}
                              y2={laserEndY}
                              stroke="var(--warning)"
                              strokeWidth="2"
                              strokeDasharray="4 4"
                              opacity="0.8">
                              <animate
                                attributeName="stroke-dashoffset"
                                from="8"
                                to="0"
                                dur="0.3s"
                                repeatCount="indefinite"
                              />
                            </line>
                          </svg>
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
                      onClick={() =>
                        onToggleShip && onToggleShip(shipInstance.id)
                      }
                      title={`${shipInstance.name} (${shipInstance.ship.name
                        .split(" ")
                        .slice(1)
                        .join(" ")}) - ${
                        isActive ? "ACTIVE" : "INACTIVE"
                      } (Click to toggle)`}>
                      {(() => {
                        // Calculate ship transform based on position
                        // Left side ships: mirror horizontally to face right
                        const isLeftSide = x < 0;
                        let shipTransform = isLeftSide ? "scaleX(-1)" : "none";

                        // Lower left position (index 2): mirrored + counter-clockwise 30°
                        if (index === 2) {
                          shipTransform = "scaleX(-1) rotate(30deg)";
                        }

                        // Lower right position (index 1): clockwise 30°
                        if (index === 1) {
                          shipTransform = "rotate(30deg)";
                        }

                        if (shipInstance.ship.id === "golem") {
                          return (
                            <img
                              src={golemShipImage}
                              alt="GOLEM"
                              className="ship-image"
                              style={{
                                width: "60px",
                                height: "24px",
                                imageRendering: "pixelated",
                                transform: shipTransform,
                              }}
                            />
                          );
                        } else if (shipInstance.ship.id === "mole") {
                          return (
                            <img
                              src={moleShipImage}
                              alt="MOLE"
                              className="ship-image"
                              style={{
                                width: "135px",
                                height: "54px",
                                imageRendering: "pixelated",
                                transform: shipTransform,
                              }}
                            />
                          );
                        } else if (shipInstance.ship.id === "prospector") {
                          return (
                            <img
                              src={prospectorShipImage}
                              alt="Prospector"
                              className="ship-image"
                              style={{
                                width: "90px",
                                height: "36px",
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
                      <div className="ship-label">
                        {shipInstance.ship.name.split(" ").slice(1).join(" ")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rock in center */}
          <div className={`rock-icon ${getStatusClass()}`} style={{ position: 'relative', top: '-15%' }}>
            <div className="rock-symbol">
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
              {miningGroup &&
                miningGroup.gadgets &&
                miningGroup.gadgets.length > 0 && (
                  <div className="gadget-symbols-on-rock">
                    {miningGroup.gadgets
                      .filter((g) => g && g.id !== "none")
                      .map((gadget, index) => (
                        <span
                          key={index}
                          className="gadget-symbol-small"
                          title={gadget!.name}>
                          {getGadgetSymbol(gadget!.id)}
                        </span>
                      ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className={`status-indicator ${getStatusClass()}`}>
        <h2>{getStatusText()}</h2>
        {result.canBreak && (
          <div className="margin-text">
            Power Margin: {formatPercent(result.powerMarginPercent)}
          </div>
        )}
      </div>

      <div className="power-bar-container">
        <div className="power-bar">
          <div
            className={`power-fill ${getStatusClass()}`}
            style={{ width: `${powerPercentage}%` }}
          />
          <div className="power-required-marker" />
        </div>
        <div className="power-labels">
          <span>Your Power: {formatPower(result.totalLaserPower)}</span>
          <span>Required: {formatPower(result.adjustedLPNeeded)}</span>
        </div>
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
            Base: {rock.resistance} × {result.totalResistModifier.toFixed(3)}
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
          <span>(Mass × Adjusted Resist) ÷ 108.7</span>
        </div>
      </div>
    </div>
  );
}
