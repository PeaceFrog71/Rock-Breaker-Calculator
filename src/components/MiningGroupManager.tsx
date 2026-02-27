import { useState, useEffect } from 'react';
import type { MiningGroup } from '../types';
import type { SavedMiningGroup } from '../utils/storage';
import {
  getSavedMiningGroups,
  deleteMiningGroup,
  loadMiningGroup,
  exportMiningGroup,
  importMiningGroup,
  importMiningGroupWithPicker,
  supportsFileSystemAccess,
} from '../utils/storage';
import { calculateLaserPower } from '../utils/calculator';
import './ConfigManager.css';

interface MiningGroupManagerProps {
  onLoad: (miningGroup: MiningGroup) => void;
  onAfterLoad?: () => void;
}

export default function MiningGroupManager({
  onLoad,
  onAfterLoad,
}: MiningGroupManagerProps) {
  const [savedGroups, setSavedGroups] = useState<SavedMiningGroup[]>(
    getSavedMiningGroups()
  );

  // Refresh the group list periodically to catch new saves from ShipPoolManager
  useEffect(() => {
    const interval = setInterval(() => {
      setSavedGroups(getSavedMiningGroups());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleLoad = (id: string) => {
    const group = loadMiningGroup(id);
    if (group) {
      // Include the saved name in the loaded group
      onLoad({ ...group.miningGroup, name: group.name });
      onAfterLoad?.();
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      title: 'Delete Group',
      message: `Delete mining group "${name}"?`,
      onConfirm: () => {
        deleteMiningGroup(id);
        setSavedGroups(getSavedMiningGroups());
        setConfirmDialog(null);
      },
    });
  };

  const handleExport = (group: SavedMiningGroup) => {
    exportMiningGroup(group);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importMiningGroup(file)
      .then((imported) => {
        setSavedGroups(getSavedMiningGroups());
        setAlertDialog({ title: 'Import Successful', message: `Imported mining group "${imported.name}"` });
      })
      .catch((error) => {
        setAlertDialog({ title: 'Import Failed', message: `Failed to import: ${error.message}` });
      });

    e.target.value = '';
  };

  const handleImportWithPicker = async () => {
    try {
      const imported = await importMiningGroupWithPicker();
      setSavedGroups(getSavedMiningGroups());
      setAlertDialog({ title: 'Import Successful', message: `Imported mining group "${imported.name}"` });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setAlertDialog({ title: 'Import Failed', message: `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  return (
    <div className="config-manager mining-group-manager panel">
      <h2>Mining Group Library</h2>

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
        {savedGroups.length === 0 ? (
          <p className="empty-message">No saved groups yet</p>
        ) : (
          savedGroups.map((group) => (
            <div key={group.id} className="config-item">
              <div className="config-info">
                <div className="config-header">
                  <div className="config-name">{group.name}</div>
                  <div className="config-meta">
                    {group.miningGroup.ships.length} ship{group.miningGroup.ships.length > 1 ? 's' : ''}
                  </div>
                </div>
                <div className="config-details">
                  {group.miningGroup.ships.map((shipInstance, shipIdx) => {
                    const shipPower = shipInstance.config.lasers.reduce((sum, laser) =>
                      sum + (laser.laserHead && laser.laserHead.id !== 'none' ? calculateLaserPower(laser, true) : 0), 0);
                    const totalModules = shipInstance.config.lasers.reduce((sum, laser) =>
                      sum + laser.modules.filter(m => m && m.id !== 'none').length, 0);
                    return (
                      <span key={shipIdx} className="config-box laser-box">
                        {shipInstance.ship.name}
                        {totalModules > 0 && <span className="module-count">+{totalModules}</span>}
                        <span className="power">{shipPower.toFixed(0)}</span>
                      </span>
                    );
                  })}
                  {(() => {
                    const totalPower = group.miningGroup.ships.reduce((shipSum, shipInstance) =>
                      shipSum + shipInstance.config.lasers.reduce((laserSum, laser) =>
                        laserSum + (laser.laserHead && laser.laserHead.id !== 'none' ? calculateLaserPower(laser, true) : 0), 0), 0);
                    return totalPower > 0 ? (
                      <span className="config-box stats-box">Σ {totalPower.toFixed(0)}</span>
                    ) : null;
                  })()}
                </div>
                <div className="config-date">
                  {new Date(group.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="config-buttons">
                <button
                  onClick={() => handleLoad(group.id)}
                  className="btn-load"
                  title="Load"
                >
                  <span className="btn-text">Load</span>
                  <span className="btn-emoji">▲</span>
                </button>
                <button
                  onClick={() => handleExport(group)}
                  className="btn-export"
                  title="Export"
                >
                  <span className="btn-text">Export</span>
                  <span className="btn-emoji">📤</span>
                </button>
                <button
                  onClick={() => handleDelete(group.id, group.name)}
                  className="btn-delete"
                  title="Delete"
                >
                  <span className="btn-text">Delete</span>
                  <span className="btn-emoji">🗑️</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {alertDialog && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="group-alert-title" onClick={() => setAlertDialog(null)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="group-alert-title">{alertDialog.title}</h3>
            <p className="save-ship-modal-message">{alertDialog.message}</p>
            <div className="save-ship-modal-actions">
              <button onClick={() => setAlertDialog(null)} className="btn-primary">OK</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="group-confirm-title" onClick={() => setConfirmDialog(null)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="group-confirm-title">{confirmDialog.title}</h3>
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
