import type { CalculationResult, Rock, MiningGroup } from '../types';
import { formatPower, formatPercent } from '../utils/calculator';
import { getGadgetSymbol } from '../types';
import './ResultDisplay.css';

interface ResultDisplayProps {
  result: CalculationResult;
  rock: Rock;
  miningGroup?: MiningGroup;
}

interface SingleShipDisplayProps {
  selectedShip?: { id: string; name: string };
}

export default function ResultDisplay({ result, rock, miningGroup, selectedShip }: ResultDisplayProps & SingleShipDisplayProps) {
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
    if (rock.mass < 1000) return 'Tiny';
    if (rock.mass < 3000) return 'Small';
    if (rock.mass < 8000) return 'Medium';
    if (rock.mass < 15000) return 'Large';
    return 'Huge';
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
        {/* Rock stats in upper-left */}
        <div className="rock-stats-topleft">
          <div className="rock-stat-item">Mass: {rock.mass.toFixed(0)}</div>
          <div className="rock-stat-item">Size: {getRockSize()}</div>
          <div className="rock-stat-item">Res: {rock.resistance.toFixed(1)}%</div>
        </div>

        <div className="rock-container">
          {/* Single ship positioned to the left */}
          {!miningGroup && selectedShip && (
            <div className="ships-around-rock">
              <div>
                {/* Laser beam from ship to rock */}
                <svg
                  className="laser-beam"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '300px',
                    height: '300px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <line
                    x1={30}
                    y1={150}
                    x2={150}
                    y2={150}
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="8"
                      dur="0.5s"
                      repeatCount="indefinite"
                    />
                  </line>
                </svg>

                {/* Ship icon */}
                <div
                  className="ship-icon active"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 'calc(50% - 120px)',
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={selectedShip.name}
                >
                  <div className="ship-symbol">{getShipIcon(selectedShip.id)}</div>
                  <div className="ship-label">{selectedShip.name}</div>
                </div>
              </div>
            </div>
          )}

          {/* Multiple ships positioned around the rock */}
          {miningGroup && miningGroup.ships.length > 0 && (
            <div className="ships-around-rock">
              {miningGroup.ships.map((shipInstance) => {
                const angle = shipInstance.position || 0;
                const radius = 120; // Distance from rock center
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                const isActive = shipInstance.isActive !== false;

                return (
                  <div key={shipInstance.id}>
                    {/* Laser beam from ship to rock - only show if active */}
                    {isActive && (
                      <svg
                        className="laser-beam"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: '300px',
                          height: '300px',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                        }}
                      >
                        <line
                          x1={150 + x}
                          y1={150 + y}
                          x2={150}
                          y2={150}
                          stroke="var(--accent)"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          opacity="0.6"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from="0"
                            to="8"
                            dur="0.5s"
                            repeatCount="indefinite"
                          />
                        </line>
                      </svg>
                    )}

                    {/* Ship icon */}
                    <div
                      className={`ship-icon ${isActive ? 'active' : 'inactive'}`}
                      style={{
                        position: 'absolute',
                        top: `calc(50% + ${y}px)`,
                        left: `calc(50% + ${x}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`${shipInstance.name} (${shipInstance.ship.name}) - ${isActive ? 'ACTIVE' : 'INACTIVE'}`}
                    >
                      <div className="ship-symbol">{getShipIcon(shipInstance.ship.id)}</div>
                      <div className="ship-label">{shipInstance.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rock in center */}
          <div className={`rock-icon ${getStatusClass()}`}>
            <div className="rock-symbol">
              ⬢
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
            {rock.name && <div className="rock-name">{rock.name}</div>}
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
          <div className="stat-label">LP Required</div>
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
