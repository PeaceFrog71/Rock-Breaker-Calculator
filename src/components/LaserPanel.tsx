import type { LaserConfiguration, Ship } from '../types';
import { LASER_HEADS, MODULES } from '../types';
import './LaserPanel.css';

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
    onChange({ ...laser, isManned: !laser.isManned });
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
          >
            {availableLaserHeads.map((head) => (
              <option key={head.id} value={head.id}>
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
            >
              {MODULES.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                  {module.powerModifier !== 1 ? ` (${module.powerModifier}x power)` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {laser.laserHead && laser.laserHead.id !== 'none' && (
        <div className="laser-stats">
          <div className="stat">
            <span className="stat-label">Base Power:</span>
            <span className="stat-value">{laser.laserHead.maxPower}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Resist Mod:</span>
            <span className="stat-value">{laser.laserHead.resistModifier}x</span>
          </div>
        </div>
      )}
    </div>
  );
}
