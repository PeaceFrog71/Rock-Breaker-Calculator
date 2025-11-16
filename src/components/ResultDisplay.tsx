import type { CalculationResult, Rock } from '../types';
import { formatPower, formatPercent } from '../utils/calculator';
import './ResultDisplay.css';

interface ResultDisplayProps {
  result: CalculationResult;
  rock: Rock;
}

export default function ResultDisplay({ result, rock }: ResultDisplayProps) {
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

  return (
    <div className="result-display">
      <div className="rock-display">
        <div className="rock-icon">
          <div className="rock-symbol">⬢</div>
          {rock.name && <div className="rock-name">{rock.name}</div>}
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
