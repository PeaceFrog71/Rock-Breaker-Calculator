import { useState } from 'react';
import type { MiningConfiguration, Ship } from '../types';
import type { SavedShipConfig } from '../utils/storage';
import {
  getSavedShipConfigs,
  saveShipConfig,
  updateShipConfig,
  deleteShipConfig,
  loadShipConfig,
  exportShipConfig,
  importShipConfig,
} from '../utils/storage';
import { calculateLaserPower } from '../utils/calculator';
import './ConfigManager.css';

interface ConfigManagerProps {
  currentShip: Ship;
  currentConfig: MiningConfiguration;
  currentConfigName?: string;
  onLoad: (ship: Ship, config: MiningConfiguration, name: string) => void;
}

export default function ConfigManager({
  currentShip,
  currentConfig,
  currentConfigName,
  onLoad,
}: ConfigManagerProps) {
  const [savedConfigs, setSavedConfigs] = useState<SavedShipConfig[]>(
    getSavedShipConfigs()
  );
  const [showDialog, setShowDialog] = useState(false);
  const [configName, setConfigName] = useState('');

  const handleSave = () => {
    if (!configName.trim()) {
      alert('Please enter a configuration name');
      return;
    }

    const trimmedName = configName.trim();
    const existing = savedConfigs.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      if (!confirm(`"${existing.name}" already exists. Overwrite?`)) {
        return;
      }
      updateShipConfig(existing.id, trimmedName, currentShip, currentConfig);
    } else {
      saveShipConfig(trimmedName, currentShip, currentConfig);
    }

    // Update parent state with the saved name
    onLoad(currentShip, currentConfig, trimmedName);

    setSavedConfigs(getSavedShipConfigs());
    setConfigName('');
    setShowDialog(false);
  };

  const handleLoad = (id: string) => {
    const config = loadShipConfig(id);
    if (config) {
      onLoad(config.ship, config.config, config.name);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete configuration "${name}"?`)) {
      deleteShipConfig(id);
      setSavedConfigs(getSavedShipConfigs());
    }
  };

  const handleExport = (config: SavedShipConfig) => {
    exportShipConfig(config);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importShipConfig(file)
      .then((imported) => {
        setSavedConfigs(getSavedShipConfigs());
        alert(`Imported configuration "${imported.name}"`);
      })
      .catch((error) => {
        alert(`Failed to import: ${error.message}`);
      });

    e.target.value = '';
  };

  return (
    <div className="config-manager panel">
      <h2>Ship Library</h2>

      <div className="config-actions">
        <button className="btn-primary" onClick={() => {
          setConfigName(currentConfigName || '');
          setShowDialog(true);
        }}>
          💾 Save Current
        </button>
        <label className="btn-secondary">
          📥 Import
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {showDialog && (
        <div className="save-dialog">
          <h3>Save Configuration</h3>
          <input
            type="text"
            placeholder="Enter configuration name..."
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <div className="dialog-actions">
            <button onClick={handleSave} className="btn-primary">
              Save
            </button>
            <button onClick={() => setShowDialog(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="configs-list">
        {savedConfigs.length === 0 ? (
          <p className="empty-message">No saved configurations yet</p>
        ) : (
          savedConfigs.sort((a, b) => a.name.localeCompare(b.name)).map((config) => (
            <div key={config.id} className="config-item">
              <div className="config-info">
                <div className="config-header">
                  <div className="config-name">{config.name}</div>
                  <div className="config-meta">{config.ship.name}</div>
                </div>
                <div className="config-details">
                  {config.config.lasers
                    .filter(laser => laser.laserHead && laser.laserHead.id !== 'none')
                    .map((laser, idx) => {
                      const moduleCount = laser.modules.filter(m => m && m.id !== 'none').length;
                      const power = calculateLaserPower(laser, true);
                      return (
                        <span key={idx} className="config-box laser-box">
                          {laser.laserHead!.name}
                          {moduleCount > 0 && <span className="module-count">+{moduleCount}</span>}
                          <span className="power">{power.toFixed(0)}</span>
                        </span>
                      );
                    })}
                  {(() => {
                    const totalPower = config.config.lasers.reduce((sum, laser) =>
                      sum + (laser.laserHead && laser.laserHead.id !== 'none' ? calculateLaserPower(laser, true) : 0), 0);
                    return totalPower > 0 ? (
                      <span className="config-box stats-box">Σ {totalPower.toFixed(0)}</span>
                    ) : null;
                  })()}
                </div>
                <div className="config-date">
                  {new Date(config.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="config-buttons">
                <button
                  onClick={() => handleLoad(config.id)}
                  className="btn-load"
                  title="Load"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleExport(config)}
                  className="btn-export"
                  title="Export"
                >
                  📤
                </button>
                <button
                  onClick={() => handleDelete(config.id, config.name)}
                  className="btn-delete"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
