import { useState, useEffect } from 'react';
import type { MiningConfiguration, Ship, ShipInstance } from '../types';
import type { SavedShipConfig } from '../utils/storage';
import {
  getSavedShipConfigs,
  saveShipConfig,
  updateShipConfig,
  deleteShipConfig,
  loadShipConfig,
  exportShipConfig,
  importShipConfig,
  importShipConfigWithPicker,
  supportsFileSystemAccess,
  createShipInstanceFromConfig,
} from '../utils/storage';
import { calculateLaserPower } from '../utils/calculator';
import './ConfigManager.css';

interface ConfigManagerProps {
  currentShip?: Ship;
  currentConfig?: MiningConfiguration;
  currentConfigName?: string;
  onLoad?: (ship: Ship, config: MiningConfiguration, name: string) => void;
  // For Mining Group mode - adds ship to group instead of replacing
  onAddToGroup?: (shipInstance: ShipInstance) => void;
  // Called after a successful load (for closing drawers, etc.)
  onAfterLoad?: () => void;
  // Hide the Save button (when moved to ShipSelector header)
  hideSaveButton?: boolean;
}

export default function ConfigManager({
  currentShip,
  currentConfig,
  currentConfigName,
  onLoad,
  onAddToGroup,
  onAfterLoad,
  hideSaveButton,
}: ConfigManagerProps) {
  const isGroupMode = !!onAddToGroup;
  const [savedConfigs, setSavedConfigs] = useState<SavedShipConfig[]>(
    getSavedShipConfigs()
  );

  // Refresh saved configs when config name changes (e.g., after external save via modal)
  useEffect(() => {
    setSavedConfigs(getSavedShipConfigs());
  }, [currentConfigName]);

  // Refresh the ship list periodically to catch saves from other components
  useEffect(() => {
    const interval = setInterval(() => {
      setSavedConfigs(getSavedShipConfigs());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Internal save dialog state (for legacy Save button when not hidden)
  const [showDialog, setShowDialog] = useState(false);
  const [configName, setConfigName] = useState('');
  // Themed alert/confirm dialogs (replace native alert/confirm)
  const [alertDialog, setAlertDialog] = useState<{ title: string; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Close alert/confirm dialogs on Escape
  useEffect(() => {
    const activeDialog = confirmDialog || alertDialog;
    if (!activeDialog) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmDialog(null);
        setAlertDialog(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [alertDialog, confirmDialog]);

  const handleSave = () => {
    if (!configName.trim()) {
      setAlertDialog({ title: 'Missing Name', message: 'Please enter a ship name.' });
      return;
    }

    // Guard: handleSave is only callable when currentShip and currentConfig are defined
    if (!currentShip || !currentConfig || !onLoad) return;

    const trimmedName = configName.trim();
    const existing = savedConfigs.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      setConfirmDialog({
        title: 'Overwrite Ship',
        message: `"${existing.name}" already exists. Overwrite?`,
        onConfirm: () => {
          updateShipConfig(existing.id, trimmedName, currentShip, currentConfig);
          onLoad(currentShip, currentConfig, trimmedName);
          setSavedConfigs(getSavedShipConfigs());
          setConfigName('');
          setShowDialog(false);
          setConfirmDialog(null);
          onAfterLoad?.();
        },
      });
      return;
    }

    saveShipConfig(trimmedName, currentShip, currentConfig);
    onLoad(currentShip, currentConfig, trimmedName);
    setSavedConfigs(getSavedShipConfigs());
    setConfigName('');
    setShowDialog(false);
    onAfterLoad?.();
  };

  const handleLoad = (id: string) => {
    const config = loadShipConfig(id);
    if (config) {
      if (isGroupMode) {
        // In group mode, create a ship instance and add to group
        const shipInstance = createShipInstanceFromConfig(config);
        onAddToGroup!(shipInstance);
      } else if (onLoad) {
        // In single ship mode, replace current config
        onLoad(config.ship, config.config, config.name);
      }
      // Call onAfterLoad callback (for closing drawers, etc.)
      onAfterLoad?.();
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      title: 'Delete Ship',
      message: `Delete configuration "${name}"?`,
      onConfirm: () => {
        deleteShipConfig(id);
        setSavedConfigs(getSavedShipConfigs());
        setConfirmDialog(null);
      },
    });
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
        setAlertDialog({ title: 'Import Successful', message: `Imported configuration "${imported.name}"` });
      })
      .catch((error) => {
        setAlertDialog({ title: 'Import Failed', message: `Failed to import: ${error.message}` });
      });

    e.target.value = '';
  };

  const handleImportWithPicker = async () => {
    try {
      const imported = await importShipConfigWithPicker();
      setSavedConfigs(getSavedShipConfigs());
      setAlertDialog({ title: 'Import Successful', message: `Imported configuration "${imported.name}"` });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setAlertDialog({ title: 'Import Failed', message: `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  return (
    <div className="config-manager panel">
      <h2>Ship Library</h2>

      <div className="config-actions">
        {/* Save button - only when not hidden (legacy location) */}
        {!isGroupMode && currentShip && currentConfig && !hideSaveButton && (
          <button className="btn-primary btn-icon-text" onClick={() => {
            setConfigName(currentConfigName || '');
            setShowDialog(true);
          }}>
            <span className="btn-icon">💾</span>
            <span className="btn-label">Save Current</span>
          </button>
        )}
        <label className="btn-import" onClick={(e) => {
          if (supportsFileSystemAccess()) {
            e.preventDefault();
            handleImportWithPicker();
          }
        }}>
          <span className="btn-text">Import</span>
          <span className="btn-emoji">📥</span>
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
          <h3>Save Ship</h3>
          <input
            type="text"
            placeholder="Enter ship name..."
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
          <p className="empty-message">No saved configurations</p>
        ) : (
          savedConfigs.sort((a, b) => a.name.localeCompare(b.name)).map((config) => (
            <div key={config.id} className={`config-item${config.isStarter ? ' starter' : ''}`}>
              <div className="config-info">
                <div className="config-name">
                  {config.name}
                  {config.isStarter && <span className="starter-badge">Starter</span>}
                </div>
                <div className="config-ship">{config.ship.name}</div>
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
                  title={isGroupMode ? "Add to Mining Group" : "Load"}
                >
                  <span className="btn-text">{isGroupMode ? "Add" : "Load"}</span>
                  <span className="btn-emoji">▲</span>
                </button>
                <button
                  onClick={() => handleExport(config)}
                  className="btn-export"
                  title="Export"
                >
                  <span className="btn-text">Export</span>
                  <span className="btn-emoji">📤</span>
                </button>
                {!config.isStarter && (
                  <button
                    onClick={() => handleDelete(config.id, config.name)}
                    className="btn-delete"
                    title="Delete"
                  >
                    <span className="btn-text">Delete</span>
                    <span className="btn-emoji">🗑️</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {alertDialog && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="config-alert-title" onClick={() => setAlertDialog(null)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="config-alert-title">{alertDialog.title}</h3>
            <p className="save-ship-modal-message">{alertDialog.message}</p>
            <div className="save-ship-modal-actions">
              <button onClick={() => setAlertDialog(null)} className="btn-primary">OK</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="config-confirm-title" onClick={() => setConfirmDialog(null)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="config-confirm-title">{confirmDialog.title}</h3>
            <p className="save-ship-modal-message">{confirmDialog.message}</p>
            <div className="save-ship-modal-actions">
              <button onClick={confirmDialog.onConfirm} className="btn-primary">OK</button>
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
