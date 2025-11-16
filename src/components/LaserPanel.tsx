import type { LaserConfiguration, LaserHead, Module } from '../types';
import { LASER_HEADS, MODULES } from '../types';
import './LaserPanel.css';

interface LaserPanelProps {
  laserIndex: number;
  laser: LaserConfiguration;
  onChange: (laser: LaserConfiguration) => void;
}

export default function LaserPanel({ laserIndex, laser, onChange }: LaserPanelProps) {
  const handleLaserHeadChange = (headId: string) => {
    const head = LASER_HEADS.find((h) => h.id === headId) || null;
    onChange({ ...laser, laserHead: head });
  };

  const handleModuleChange = (moduleIndex: number, moduleId: string) => {
    const module = MODULES.find((m) => m.id === moduleId) || null;
    const newModules = [...laser.modules];
    newModules[moduleIndex] = module;
    onChange({ ...laser, modules: newModules });
  };

  return (
    <div className="laser-panel panel">
      <h3>Laser {laserIndex + 1}</h3>

      <div className="form-group">
        <label>Laser Head:</label>
        <select
          value={laser.laserHead?.id || 'none'}
          onChange={(e) => handleLaserHeadChange(e.target.value)}
        >
          {LASER_HEADS.map((head) => (
            <option key={head.id} value={head.id}>
              {head.name} {head.maxPower > 0 ? `(${head.maxPower} power)` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="modules-section">
        <label>Modules:</label>
        {[0, 1, 2].map((moduleIndex) => (
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
