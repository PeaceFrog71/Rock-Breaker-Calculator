import { useState, useEffect } from 'react';
import type { ShipInstance } from '../types';
import type { SavedShipConfig } from '../utils/storage';
import {
  getSavedShipConfigs,
  deleteShipConfig,
  createShipInstanceFromConfig,
  importShipConfig,
  importShipConfigWithPicker,
  supportsFileSystemAccess,
} from '../utils/storage';
import { calculateLaserPower } from '../utils/calculator';
import { useMobileDetection } from '../hooks/useMobileDetection';
import './ConfigManager.css';

interface ShipPoolLibraryProps {
  onLoadShip: (shipInstance: ShipInstance) => void;
}

export default function ShipPoolLibrary({ onLoadShip }: ShipPoolLibraryProps) {
  const isMobile = useMobileDetection();
  const [savedShips, setSavedShips] = useState<SavedShipConfig[]>(
    getSavedShipConfigs()
  );

  // Refresh the ship list periodically to catch new saves
  useEffect(() => {
    const interval = setInterval(() => {
      setSavedShips(getSavedShipConfigs());
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  const handleLoad = (id: string) => {
    const ships = getSavedShipConfigs();
    const ship = ships.find((s) => s.id === id);
    if (ship) {
      // Create a ship instance from the saved config (makes a copy)
      const newShipInstance = createShipInstanceFromConfig(ship);
      onLoadShip(newShipInstance);
    }
  };

  const [alertDialog, setAlertDialog] = useState<{ title: string; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Close dialogs on Escape
  useEffect(() => {
    if (!confirmDialog && !alertDialog) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setConfirmDialog(null); setAlertDialog(null); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [confirmDialog, alertDialog]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importShipConfig(file)
      .then((imported) => {
        setSavedShips(getSavedShipConfigs());
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
      setSavedShips(getSavedShipConfigs());
      setAlertDialog({ title: 'Import Successful', message: `Imported configuration "${imported.name}"` });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setAlertDialog({ title: 'Import Failed', message: `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      title: 'Delete Ship',
      message: `Delete saved ship "${name}"?`,
      onConfirm: () => {
        deleteShipConfig(id);
        setSavedShips(getSavedShipConfigs());
        setConfirmDialog(null);
      },
    });
  };

  return (
    <div className="config-manager panel">
      <h2>Ship Library</h2>
      {!isMobile && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Load ships from your saved configurations. Ships saved from Single Ship mode or Mining Group mode appear here.
        </p>
      )}

      <div className="config-actions">
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

      <div className="configs-list">
        {savedShips.length === 0 ? (
          <p className="empty-message">No saved ships. Save ships from Single Ship mode or click "Save to Library" in a ship card.</p>
        ) : (
          savedShips.sort((a, b) => a.name.localeCompare(b.name)).map((ship) => (
            <div key={ship.id} className={`config-item${ship.isStarter ? ' starter' : ''}`}>
              <div className="config-info">
                <div className="config-header">
                  <div className="config-name">
                    {ship.name}
                    {ship.isStarter && <span className="starter-badge">Starter</span>}
                  </div>
                  <div className="config-meta">{ship.ship.name}</div>
                </div>
                <div className="config-details">
                  {ship.config.lasers
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
                    const totalPower = ship.config.lasers.reduce((sum, laser) =>
                      sum + (laser.laserHead && laser.laserHead.id !== 'none' ? calculateLaserPower(laser, true) : 0), 0);
                    return totalPower > 0 ? (
                      <span className="config-box stats-box">Σ {totalPower.toFixed(0)}</span>
                    ) : null;
                  })()}
                </div>
                <div className="config-date">
                  {new Date(ship.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="config-buttons">
                <button
                  onClick={() => handleLoad(ship.id)}
                  className="btn-load"
                  title="Add to Mining Group"
                >
                  + Add
                </button>
                {!ship.isStarter && (
                  <button
                    onClick={() => handleDelete(ship.id, ship.name)}
                    className="btn-delete"
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {alertDialog && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="library-alert-title" onClick={() => setAlertDialog(null)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="library-alert-title">{alertDialog.title}</h3>
            <p className="save-ship-modal-message">{alertDialog.message}</p>
            <div className="save-ship-modal-actions">
              <button onClick={() => setAlertDialog(null)} className="btn-primary">OK</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={() => setConfirmDialog(null)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="confirm-dialog-title">{confirmDialog.title}</h3>
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
