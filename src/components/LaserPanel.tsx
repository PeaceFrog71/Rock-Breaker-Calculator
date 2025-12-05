import type { LaserConfiguration, Ship, LaserHead, Module } from '../types';
import { LASER_HEADS, MODULES } from '../types';
import { calculateLaserPower } from '../utils/calculator';
import './LaserPanel.css';

// Helper to format laser head effects for tooltips
const formatLaserHeadTooltip = (head: LaserHead) => {
  if (!head || head.id === 'none') return '';
  const effects: string[] = [];
  effects.push(`Power: ${head.maxPower}`);
  if (head.resistModifier !== 1) {
    const pct = head.resistModifier > 1
      ? `+${Math.round((head.resistModifier - 1) * 100)}%`
      : `-${Math.round((1 - head.resistModifier) * 100)}%`;
    effects.push(`Resist: ${pct}`);
  }
  effects.push(`Slots: ${head.moduleSlots}`);
  return `${head.name}: ${effects.join(', ')}`;
};

// Helper to format effect value as percentage
const formatPct = (value: number | undefined) => {
  if (value === undefined || value === 1) return null;
  return value > 1 ? `+${Math.round((value - 1) * 100)}%` : `-${Math.round((1 - value) * 100)}%`;
};

// Helper to format module effects for tooltips
const formatModuleTooltip = (module: Module) => {
  if (!module || module.id === 'none') return '';
  const effects: string[] = [];
  const addEffect = (value: number | undefined, label: string) => {
    const pct = formatPct(value);
    if (pct) effects.push(`${label}: ${pct}`);
  };
  addEffect(module.powerModifier, 'Power');
  addEffect(module.resistModifier, 'Resist');
  addEffect(module.instabilityModifier, 'Instability');
  addEffect(module.chargeWindowModifier, 'Window');
  addEffect(module.chargeRateModifier, 'Rate');
  addEffect(module.overchargeRateModifier, 'Overcharge');
  addEffect(module.shatterDamageModifier, 'Shatter');
  addEffect(module.extractionPowerModifier, 'Extraction');
  addEffect(module.inertMaterialsModifier, 'Inert');
  addEffect(module.clusterModifier, 'Cluster');
  if (module.category === 'active' && module.duration) {
    effects.push(`${module.duration}/${module.uses} uses`);
  }
  if (effects.length === 0) return `${module.name}: No stat effects`;
  return `${module.name}: ${effects.join(', ')}`;
};

interface LaserPanelProps {
  laserIndex: number;
  laser: LaserConfiguration;
  selectedShip: Ship;
  onChange: (laser: LaserConfiguration) => void;
  showMannedToggle?: boolean;
}

export default function LaserPanel({ laserIndex, laser, selectedShip, onChange, showMannedToggle }: LaserPanelProps) {
  const handleLaserHeadChange = (headId: string) => {
    const head = LASER_HEADS.find((h) => h.id === headId) || null;
    // Reset modules array to match the new laser head's module slot count
    const moduleSlots = head?.moduleSlots || 3;
    const newModules = Array(moduleSlots).fill(null);
    onChange({ ...laser, laserHead: head, modules: newModules });
  };

  const handleModuleChange = (moduleIndex: number, moduleId: string) => {
    const module = MODULES.find((m) => m.id === moduleId) || null;
    const newModules = [...laser.modules];
    newModules[moduleIndex] = module;
    onChange({ ...laser, modules: newModules });
  };

  // Check if GOLEM ship - if so, lock to Pitman laser
  const isGolem = selectedShip.id === 'golem';
  const pitmanLaser = LASER_HEADS.find((h) => h.id === 'pitman');

  // Determine which laser heads to show based on ship type
  const availableLaserHeads = isGolem
    ? LASER_HEADS.filter((h) => h.id === 'pitman')
    : LASER_HEADS.filter((h) => {
        if (h.id === 'pitman') return false; // Pitman is GOLEM-only
        const minSize = selectedShip.minLaserSize || 1;
        const maxSize = selectedShip.maxLaserSize;
        return h.size >= minSize && h.size <= maxSize;
      });

  // Get the number of module slots for the current laser head
  const moduleSlotCount = laser.laserHead?.moduleSlots || 0;

  const handleMannedToggle = () => {
    // Treat undefined as manned (default state), so toggle to unmanned
    const currentState = laser.isManned !== false; // true or undefined = manned
    onChange({ ...laser, isManned: !currentState });
  };

  return (
    <div className="laser-panel panel">
      <div className="laser-panel-header">
        <h3>Laser {laserIndex + 1}</h3>
        {showMannedToggle && (
          <button
            className={`manned-status-button ${laser.isManned !== false ? 'manned' : 'unmanned'}`}
            onClick={handleMannedToggle}
            title={laser.isManned !== false ? 'Click to mark as unmanned' : 'Click to mark as manned'}
          >
            {laser.isManned !== false ? 'MANNED' : 'UNMANNED'}
          </button>
        )}
      </div>

      <div className="form-group">
        <label>Laser Head:</label>
        {isGolem ? (
          <div className="locked-laser">
            <input
              type="text"
              value={`${pitmanLaser?.name} (Fixed - ${pitmanLaser?.maxPower} power)`}
              disabled
              style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              GOLEM has a fixed Pitman laser
            </small>
          </div>
        ) : (
          <select
            value={laser.laserHead?.id || 'none'}
            onChange={(e) => handleLaserHeadChange(e.target.value)}
            title={laser.laserHead ? formatLaserHeadTooltip(laser.laserHead) : 'Select a laser head'}
          >
            {availableLaserHeads.map((head) => (
              <option key={head.id} value={head.id} title={formatLaserHeadTooltip(head)}>
                {head.name} {head.maxPower > 0 ? `(${head.maxPower} power)` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="modules-section">
        <label>Modules ({moduleSlotCount} slots):</label>
        {Array.from({ length: moduleSlotCount }).map((_, moduleIndex) => (
          <div key={moduleIndex} className="form-group">
            <select
              value={laser.modules[moduleIndex]?.id || 'none'}
              onChange={(e) => handleModuleChange(moduleIndex, e.target.value)}
              disabled={!laser.laserHead || laser.laserHead.id === 'none'}
              title={laser.modules[moduleIndex] ? formatModuleTooltip(laser.modules[moduleIndex]!) : 'Select a module'}
            >
              {MODULES.map((module) => (
                <option key={module.id} value={module.id} title={formatModuleTooltip(module)}>
                  {module.name}
                  {module.powerModifier !== 1 ? ` (${module.powerModifier}x power)` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Component info boxes */}
      {laser.laserHead && laser.laserHead.id !== 'none' && (
        <div className="component-info-boxes">
          {/* Laser head box */}
          <div className="component-info-box laser-box">
            <div className="component-header">
              <span className="component-name">{laser.laserHead.name}</span>
              <span className="component-power">{laser.laserHead.maxPower} → {calculateLaserPower(laser, true).toFixed(0)}</span>
            </div>
            <div className="component-effects-inline">
              <span className="effect-badge neutral">Size: {laser.laserHead.size}</span>
              {laser.laserHead.resistModifier !== 1 && (
                <span className={`effect-badge ${laser.laserHead.resistModifier < 1 ? 'positive' : 'negative'}`}>
                  Res {formatPct(laser.laserHead.resistModifier)}
                </span>
              )}
              <span className="effect-badge neutral">Slots: {laser.laserHead.moduleSlots}</span>
            </div>
          </div>

          {/* Module boxes */}
          {laser.modules.map((module, idx) => {
            if (!module || module.id === 'none') return null;

            // Check if module has any effects (defined AND not equal to 1)
            const hasEffects = module.powerModifier !== 1 || module.resistModifier !== 1 ||
              (module.instabilityModifier !== undefined && module.instabilityModifier !== 1) ||
              (module.chargeWindowModifier !== undefined && module.chargeWindowModifier !== 1) ||
              (module.chargeRateModifier !== undefined && module.chargeRateModifier !== 1) ||
              (module.overchargeRateModifier !== undefined && module.overchargeRateModifier !== 1) ||
              (module.shatterDamageModifier !== undefined && module.shatterDamageModifier !== 1) ||
              (module.extractionPowerModifier !== undefined && module.extractionPowerModifier !== 1) ||
              (module.inertMaterialsModifier !== undefined && module.inertMaterialsModifier !== 1) ||
              (module.clusterModifier !== undefined && module.clusterModifier !== 1);

            // Helper to determine if effect is positive (beneficial)
            // For Power, Window, Rate, Extraction, Cluster: higher is better
            // For Resist, Instability, Overcharge, Shatter, Inert: lower is better
            const isPositive = (value: number | undefined, lowerIsBetter: boolean) => {
              if (value === undefined || value === 1) return null;
              return lowerIsBetter ? value < 1 : value > 1;
            };

            return (
              <div key={idx} className="component-info-box module-box">
                <div className="component-header">
                  <span className="component-name">{module.name}</span>
                  {module.category === 'active' && (
                    <span className="component-type">{module.duration}/{module.uses}</span>
                  )}
                </div>
                {hasEffects && (
                  <div className="component-effects-inline">
                    {module.powerModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.powerModifier, false) ? 'positive' : 'negative'}`}>
                        Pwr {formatPct(module.powerModifier)}
                      </span>
                    )}
                    {module.resistModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.resistModifier, true) ? 'positive' : 'negative'}`}>
                        Res {formatPct(module.resistModifier)}
                      </span>
                    )}
                    {module.instabilityModifier !== undefined && module.instabilityModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.instabilityModifier, true) ? 'positive' : 'negative'}`}>
                        Inst {formatPct(module.instabilityModifier)}
                      </span>
                    )}
                    {module.chargeWindowModifier !== undefined && module.chargeWindowModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.chargeWindowModifier, false) ? 'positive' : 'negative'}`}>
                        Win {formatPct(module.chargeWindowModifier)}
                      </span>
                    )}
                    {module.chargeRateModifier !== undefined && module.chargeRateModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.chargeRateModifier, false) ? 'positive' : 'negative'}`}>
                        Rate {formatPct(module.chargeRateModifier)}
                      </span>
                    )}
                    {module.overchargeRateModifier !== undefined && module.overchargeRateModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.overchargeRateModifier, true) ? 'positive' : 'negative'}`}>
                        OC {formatPct(module.overchargeRateModifier)}
                      </span>
                    )}
                    {module.shatterDamageModifier !== undefined && module.shatterDamageModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.shatterDamageModifier, true) ? 'positive' : 'negative'}`}>
                        Shtr {formatPct(module.shatterDamageModifier)}
                      </span>
                    )}
                    {module.extractionPowerModifier !== undefined && module.extractionPowerModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.extractionPowerModifier, false) ? 'positive' : 'negative'}`}>
                        Ext {formatPct(module.extractionPowerModifier)}
                      </span>
                    )}
                    {module.inertMaterialsModifier !== undefined && module.inertMaterialsModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.inertMaterialsModifier, true) ? 'positive' : 'negative'}`}>
                        Inrt {formatPct(module.inertMaterialsModifier)}
                      </span>
                    )}
                    {module.clusterModifier !== undefined && module.clusterModifier !== 1 && (
                      <span className={`effect-badge ${isPositive(module.clusterModifier, false) ? 'positive' : 'negative'}`}>
                        Clst {formatPct(module.clusterModifier)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
