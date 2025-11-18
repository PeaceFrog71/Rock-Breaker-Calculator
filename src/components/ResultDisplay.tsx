import type { CalculationResult, Rock, MiningGroup } from '../types';
import { formatPower, formatPercent } from '../utils/calculator';
import { getGadgetSymbol } from '../types';
import './ResultDisplay.css';
import golemShipImage from '../assets/mining_ship_golem_pixel_120x48.png';
import moleShipImage from '../assets/mining_ship_mole_pixel_120x48_transparent.png';
import prospectorShipImage from '../assets/mining_ship_prospector_pixel_120x48.png';
import asteroidImage from '../assets/asteroid_pixel_120x48_true_transparent.png';

interface ResultDisplayProps {
  result: CalculationResult;
  rock: Rock;
  miningGroup?: MiningGroup;
  onToggleShip?: (shipId: string) => void;
}

interface SingleShipDisplayProps {
  selectedShip?: { id: string; name: string };
}

export default function ResultDisplay({ result, rock, miningGroup, selectedShip, onToggleShip }: ResultDisplayProps & SingleShipDisplayProps) {
  const getStatusClass = () => {
    if (!result.canBreak) return 'cannot-break';
    if (result.powerMarginPercent < 20) return 'marginal';
    return 'can-break';
  };

  const getStatusText = () => {
    if (!result.canBreak) return 'CANNOT BREAK';
    if (result.powerMarginPercent < 20) return 'RISKY - LOW MARGIN';
    return 'CAN BREAK';
  };

  const powerPercentage = result.adjustedLPNeeded > 0
    ? Math.min((result.totalLaserPower / result.adjustedLPNeeded) * 100, 100)
    : 0;

  // Calculate rock size category based on mass
  const getRockSize = () => {
    if (rock.mass < 15000) return 'Tiny';
    if (rock.mass < 25000) return 'Small';
    if (rock.mass < 50000) return 'Medium';
    if (rock.mass < 100000) return 'Large';
    return 'Huge';
  };

  // Get asteroid size multiplier based on rock size (1:1 aspect ratio)
  const getAsteroidSize = () => {
    if (rock.mass < 15000) return { width: 200, height: 200 }; // Tiny
    if (rock.mass < 25000) return { width: 250, height: 250 }; // Small
    if (rock.mass < 50000) return { width: 300, height: 300 }; // Medium
    if (rock.mass < 100000) return { width: 350, height: 350 }; // Large
    return { width: 400, height: 400 }; // Huge
  };

  // Get ship icon based on ship type
  const getShipIcon = (shipId: string) => {
    switch (shipId) {
      case 'prospector':
        return '◆';
      case 'mole':
        return '◈';
      case 'golem':
        return '◇';
      default:
        return '◆';
    }
  };

  return (
    <div className="result-display">
      <div className="rock-display">
        <div className="rock-container">
          {/* Single ship positioned to the left */}
          {!miningGroup && selectedShip && (() => {
            const asteroidSize = getAsteroidSize();
            const angle = 180; // Left side
            const asteroidRadius = asteroidSize.width / 2;
            const radius = asteroidRadius * 1.1; // 110% of asteroid radius
            const shipX = Math.cos((angle * Math.PI) / 180) * radius;
            const shipY = Math.sin((angle * Math.PI) / 180) * radius;

            const svgSize = 800;
            const center = svgSize / 2;
            const laserStartX = center + shipX;
            const laserStartY = center + shipY;
            // Laser ends 5% of asteroid radius from center, towards the ship
            const directionX = -shipX / radius; // Normalized direction
            const directionY = -shipY / radius;
            const laserEndX = center + directionX * asteroidRadius * 0.05;
            const laserEndY = center + directionY * asteroidRadius * 0.05;

            return (
              <div className="ships-around-rock">
                {/* Laser beam from ship to rock - always show for single ship */}
                <svg
                  className="laser-beam"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${svgSize}px`,
                    height: `${svgSize}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <line
                    x1={laserStartX}
                    y1={laserStartY}
                    x2={laserEndX}
                    y2={laserEndY}
                    stroke="var(--warning)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  >
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
                    position: 'absolute',
                    top: `calc(50% + ${shipY}px)`,
                    left: `calc(50% + ${shipX}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={selectedShip.name}
                >
                  {selectedShip.id === 'golem' ? (
                    <img
                      src={golemShipImage}
                      alt="GOLEM"
                      className="ship-image"
                      style={{ width: '60px', height: '24px', imageRendering: 'pixelated', transform: 'scaleX(-1)' }}
                    />
                  ) : selectedShip.id === 'mole' ? (
                    <img
                      src={moleShipImage}
                      alt="MOLE"
                      className="ship-image"
                      style={{ width: '135px', height: '54px', imageRendering: 'pixelated', transform: 'scaleX(-1)' }}
                    />
                  ) : selectedShip.id === 'prospector' ? (
                    <img
                      src={prospectorShipImage}
                      alt="Prospector"
                      className="ship-image"
                      style={{ width: '90px', height: '36px', imageRendering: 'pixelated', transform: 'scaleX(-1)' }}
                    />
                  ) : (
                    <div className="ship-symbol">{getShipIcon(selectedShip.id)}</div>
                  )}
                  <div className="ship-label">{selectedShip.name.split(' ').slice(1).join(' ')}</div>
                </div>
              </div>
            );
          })()}

          {/* Multiple ships positioned around the rock */}
          {miningGroup && miningGroup.ships.length > 0 && (
            <div className="ships-around-rock">
              {miningGroup.ships.map((shipInstance) => {
                const angle = shipInstance.position || 0;
                const asteroidSize = getAsteroidSize();
                // Position ships at 110% of asteroid radius
                const asteroidRadius = asteroidSize.width / 2;
                const radius = asteroidRadius * 1.1;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                const isActive = shipInstance.isActive !== false;

                return (
                  <div key={shipInstance.id}>
                    {/* Laser beam from ship to rock - only show if active */}
                    {isActive && (() => {
                      const svgSize = 800;
                      const center = svgSize / 2;
                      // Laser starts at ship position (behind ship)
                      const laserStartX = center + x;
                      const laserStartY = center + y;
                      // Laser ends 5% of asteroid radius from center, towards the ship
                      const asteroidRadius = asteroidSize.width / 2;
                      const directionX = -x / Math.sqrt(x * x + y * y); // Normalized direction from ship to center
                      const directionY = -y / Math.sqrt(x * x + y * y);
                      const laserEndX = center + directionX * asteroidRadius * 0.05;
                      const laserEndY = center + directionY * asteroidRadius * 0.05;

                      return (
                        <svg
                          className="laser-beam"
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: `${svgSize}px`,
                            height: `${svgSize}px`,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                          }}
                        >
                          <line
                            x1={laserStartX}
                            y1={laserStartY}
                            x2={laserEndX}
                            y2={laserEndY}
                            stroke="var(--warning)"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            opacity="0.8"
                          >
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
                      className={`ship-icon ${isActive ? 'active' : 'inactive'} clickable`}
                      style={{
                        position: 'absolute',
                        top: `calc(50% + ${y}px)`,
                        left: `calc(50% + ${x}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onClick={() => onToggleShip && onToggleShip(shipInstance.id)}
                      title={`${shipInstance.name} (${shipInstance.ship.name.split(' ').slice(1).join(' ')}) - ${isActive ? 'ACTIVE' : 'INACTIVE'} (Click to toggle)`}
                    >
                      {shipInstance.ship.id === 'golem' ? (
                        <img
                          src={golemShipImage}
                          alt="GOLEM"
                          className="ship-image"
                          style={{
                            width: '60px',
                            height: '24px',
                            imageRendering: 'pixelated',
                            transform: x < 0 ? 'scaleX(-1)' : 'none'
                          }}
                        />
                      ) : shipInstance.ship.id === 'mole' ? (
                        <img
                          src={moleShipImage}
                          alt="MOLE"
                          className="ship-image"
                          style={{
                            width: '135px',
                            height: '54px',
                            imageRendering: 'pixelated',
                            transform: x < 0 ? 'scaleX(-1)' : 'none'
                          }}
                        />
                      ) : shipInstance.ship.id === 'prospector' ? (
                        <img
                          src={prospectorShipImage}
                          alt="Prospector"
                          className="ship-image"
                          style={{
                            width: '90px',
                            height: '36px',
                            imageRendering: 'pixelated',
                            transform: x < 0 ? 'scaleX(-1)' : 'none'
                          }}
                        />
                      ) : (
                        <div className="ship-symbol">{getShipIcon(shipInstance.ship.id)}</div>
                      )}
                      <div className="ship-label">{shipInstance.ship.name.split(' ').slice(1).join(' ')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rock in center */}
          <div className={`rock-icon ${getStatusClass()}`}>
            <div className="rock-stats-above">
              <div className="rock-stat-item">Mass: {rock.mass.toFixed(0)}</div>
              <div className="rock-stat-item">Size: {getRockSize()}</div>
              <div className="rock-stat-item">Res: {rock.resistance.toFixed(1)}%</div>
            </div>
            {rock.name && <div className="rock-name">{rock.name}</div>}
            <div className="rock-symbol">
              <img
                src={asteroidImage}
                alt="Asteroid"
                className="asteroid-image"
                style={{ width: `${getAsteroidSize().width}px`, height: `${getAsteroidSize().height}px`, imageRendering: 'pixelated' }}
              />
              {/* Gadget symbols ON the rock */}
              {miningGroup && miningGroup.gadgets && miningGroup.gadgets.length > 0 && (
                <div className="gadget-symbols-on-rock">
                  {miningGroup.gadgets
                    .filter(g => g && g.id !== 'none')
                    .map((gadget, index) => (
                      <span key={index} className="gadget-symbol-small" title={gadget!.name}>
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
          <div className="stat-value">{formatPower(result.totalLaserPower)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Adjusted Resistance</div>
          <div className="stat-value">{result.adjustedResistance.toFixed(2)}</div>
          <div className="stat-subtitle">
            Base: {rock.resistance} × {result.totalResistModifier.toFixed(3)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Laser Power Required</div>
          <div className="stat-value">{formatPower(result.adjustedLPNeeded)}</div>
          <div className="stat-subtitle">
            Base: {formatPower(result.baseLPNeeded)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Power Difference</div>
          <div className={`stat-value ${result.canBreak ? 'positive' : 'negative'}`}>
            {result.canBreak ? '+' : ''}{formatPower(result.powerMargin)}
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
