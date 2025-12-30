import type { LaserConfiguration, Ship, LaserHead, Module } from '../types';
import { LASER_HEADS, MODULES } from '../types';
import { calculateLaserPower } from '../utils/calculator';
import { formatModuleTooltip, formatPct } from '../utils/formatters';
import './LaserPanel.css';

// Helper to get the best modifier display for modules without power modifier
const getBestModifierDisplay = (module: Module): string => {
  if (module.powerModifier !== 1) {
    return ` (${formatPct(module.powerModifier)} power)`;
  }

  // Find the most beneficial modifier to display
  // Each entry: [value, label, lowerIsBetter]
  const modifiers: [number | undefined, string, boolean][] = [
    [module.resistModifier !== 1 ? module.resistModifier : undefined, 'Res', true],
    [module.instabilityModifier, 'Inst', true],
    [module.chargeWindowModifier, 'Win', false],
    [module.chargeRateModifier, 'Rate', false],
    [module.overchargeRateModifier, 'OC', true],
    [module.shatterDamageModifier, 'Shtr', true],
    [module.extractionPowerModifier, 'Ext', false],
    [module.inertMaterialsModifier, 'Inrt', true],
    [module.clusterModifier, 'Clst', false],
  ];

  // Find the best (most beneficial) modifier
  let bestModifier: { value: number; label: string; benefit: number } | null = null;

  for (const [value, label, lowerIsBetter] of modifiers) {
    if (value === undefined || value === 1) continue;

    // Calculate benefit magnitude (how far from 1, in the good direction)
    const benefit = lowerIsBetter ? (1 - value) : (value - 1);

    if (benefit > 0 && (!bestModifier || benefit > bestModifier.benefit)) {
      bestModifier = { value, label, benefit };
    }
  }

  if (bestModifier) {
    return ` (${formatPct(bestModifier.value)} ${bestModifier.label})`;
  }

  return '';
};

// Helper to format laser head stats for dropdown options
// Groups: Name, Power, Slots, then good modifiers, then bad modifiers
const formatLaserHeadOption = (head: LaserHead) => {
  if (!head || head.id === 'none') return '---';

  const good: string[] = [];
  const bad: string[] = [];

  // Resistance: lower is better
  if (head.resistModifier < 1) good.push(`Resist: ${formatPct(head.resistModifier)}`);
  else if (head.resistModifier > 1) bad.push(`Resist: ${formatPct(head.resistModifier)}`);

  // Instability: lower is better
  if (head.instabilityModifier !== undefined && head.instabilityModifier !== 1) {
    if (head.instabilityModifier < 1) good.push(`Inst: ${formatPct(head.instabilityModifier)}`);
    else bad.push(`Inst: ${formatPct(head.instabilityModifier)}`);
  }

  // Charge Rate: higher is better
  if (head.chargeRateModifier !== undefined && head.chargeRateModifier !== 1) {
    if (head.chargeRateModifier > 1) good.push(`Rate: ${formatPct(head.chargeRateModifier)}`);
    else bad.push(`Rate: ${formatPct(head.chargeRateModifier)}`);
  }

  // Charge Window: higher is better
  if (head.chargeWindowModifier !== undefined && head.chargeWindowModifier !== 1) {
    if (head.chargeWindowModifier > 1) good.push(`Win: ${formatPct(head.chargeWindowModifier)}`);
    else bad.push(`Win: ${formatPct(head.chargeWindowModifier)}`);
  }

  // Inert Materials: lower is better
  if (head.inertMaterialsModifier !== undefined && head.inertMaterialsModifier !== 1) {
    if (head.inertMaterialsModifier < 1) good.push(`Inert: ${formatPct(head.inertMaterialsModifier)}`);
    else bad.push(`Inert: ${formatPct(head.inertMaterialsModifier)}`);
  }

  // Build: Name:  Power  Slots    [good]  [bad]
  let result = `${head.name}:  Power: ${head.maxPower}  Slots: ${head.moduleSlots}`;
  if (good.length > 0) result += `    ${good.join(', ')}`;
  if (bad.length > 0) result += `  ${bad.join(', ')}`;
  return result;
};

// Helper to format laser head effects for tooltips (only used in this component)
const formatLaserHeadTooltip = (head: LaserHead) => {
  if (!head || head.id === 'none') return '';
  const effects: string[] = [];
  effects.push(`Power: ${head.maxPower}`);
  const resistPct = formatPct(head.resistModifier);
  if (resistPct) effects.push(`Resist: ${resistPct}`);
  if (head.instabilityModifier !== undefined && head.instabilityModifier !== 1) {
    effects.push(`Inst: ${formatPct(head.instabilityModifier)}`);
  }
  if (head.chargeRateModifier !== undefined && head.chargeRateModifier !== 1) {
    effects.push(`Rate: ${formatPct(head.chargeRateModifier)}`);
  }
  if (head.chargeWindowModifier !== undefined && head.chargeWindowModifier !== 1) {
    effects.push(`Win: ${formatPct(head.chargeWindowModifier)}`);
  }
  if (head.inertMaterialsModifier !== undefined && head.inertMaterialsModifier !== 1) {
    effects.push(`Inert: ${formatPct(head.inertMaterialsModifier)}`);
  }
  effects.push(`Slots: ${head.moduleSlots}`);
  return `${head.name}: ${effects.join(', ')}`;
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

    // Reset the moduleActive state for this slot when module changes
    // New modules should always start as inactive
    let newModuleActive = laser.moduleActive ? [...laser.moduleActive] : newModules.map(() => false);
    // Ensure array is the right length
    while (newModuleActive.length < newModules.length) {
      newModuleActive.push(false);
    }
    // Reset this slot to inactive since it's a new/changed module
    newModuleActive[moduleIndex] = false;

    onChange({ ...laser, modules: newModules, moduleActive: newModuleActive });
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
              value={pitmanLaser ? formatLaserHeadOption(pitmanLaser) : 'Pitman'}
              disabled
              style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
              title={pitmanLaser ? formatLaserHeadTooltip(pitmanLaser) : ''}
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              GOLEM has a fixed bespoke Pitman laser.
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
                {formatLaserHeadOption(head)}
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
                  {getBestModifierDisplay(module)}
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
              {laser.laserHead.instabilityModifier !== undefined && laser.laserHead.instabilityModifier !== 1 && (
                <span className={`effect-badge ${laser.laserHead.instabilityModifier < 1 ? 'positive' : 'negative'}`}>
                  Inst {formatPct(laser.laserHead.instabilityModifier)}
                </span>
              )}
              {laser.laserHead.chargeRateModifier !== undefined && laser.laserHead.chargeRateModifier !== 1 && (
                <span className={`effect-badge ${laser.laserHead.chargeRateModifier > 1 ? 'positive' : 'negative'}`}>
                  Rate {formatPct(laser.laserHead.chargeRateModifier)}
                </span>
              )}
              {laser.laserHead.chargeWindowModifier !== undefined && laser.laserHead.chargeWindowModifier !== 1 && (
                <span className={`effect-badge ${laser.laserHead.chargeWindowModifier > 1 ? 'positive' : 'negative'}`}>
                  Win {formatPct(laser.laserHead.chargeWindowModifier)}
                </span>
              )}
              {laser.laserHead.inertMaterialsModifier !== undefined && laser.laserHead.inertMaterialsModifier !== 1 && (
                <span className={`effect-badge ${laser.laserHead.inertMaterialsModifier < 1 ? 'positive' : 'negative'}`}>
                  Inrt {formatPct(laser.laserHead.inertMaterialsModifier)}
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
