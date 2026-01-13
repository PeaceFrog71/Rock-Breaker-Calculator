import { useState } from 'react';
import type { MiningGroup } from '../types';
import type { SavedMiningGroup } from '../utils/storage';
import {
  getSavedMiningGroups,
  saveMiningGroup,
  updateMiningGroup,
  deleteMiningGroup,
  loadMiningGroup,
  exportMiningGroup,
  importMiningGroup,
} from '../utils/storage';
import { calculateLaserPower } from '../utils/calculator';
import './ConfigManager.css';

interface MiningGroupManagerProps {
  currentMiningGroup: MiningGroup;
  onLoad: (miningGroup: MiningGroup) => void;
  onAfterLoad?: () => void;
}

export default function MiningGroupManager({
  currentMiningGroup,
  onLoad,
  onAfterLoad,
}: MiningGroupManagerProps) {
  const [savedGroups, setSavedGroups] = useState<SavedMiningGroup[]>(
    getSavedMiningGroups()
  );
  const [showDialog, setShowDialog] = useState(false);
  const [groupName, setGroupName] = useState('');

  const handleSave = () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (currentMiningGroup.ships.length === 0) {
      alert('Cannot save an empty mining group');
      return;
    }

    const trimmedName = groupName.trim();
    const existing = savedGroups.find(
      (g) => g.name.toLowerCase() === trimmedName.toLowerCase()
    );

    // Update the group's name to match what's being saved
    const groupToSave = { ...currentMiningGroup, name: trimmedName };

    if (existing) {
      if (!confirm(`"${existing.name}" already exists. Overwrite?`)) {
        return;
      }
      const updated = updateMiningGroup(existing.id, trimmedName, groupToSave);
      if (!updated) {
        alert('Failed to update the mining group. It may have been removed. Saving as a new group instead.');
        saveMiningGroup(trimmedName, groupToSave);
      }
    } else {
      saveMiningGroup(trimmedName, groupToSave);
    }

    // Update the current group's name in parent state
    onLoad(groupToSave);

    setSavedGroups(getSavedMiningGroups());
    setGroupName('');
    setShowDialog(false);

    // Close drawer after save (same callback as after load)
    onAfterLoad?.();
  };

  const handleLoad = (id: string) => {
    const group = loadMiningGroup(id);
    if (group) {
      // Include the saved name in the loaded group
      onLoad({ ...group.miningGroup, name: group.name });
      onAfterLoad?.();
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete mining group "${name}"?`)) {
      deleteMiningGroup(id);
      setSavedGroups(getSavedMiningGroups());
    }
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
        alert(`Imported mining group "${imported.name}"`);
      })
      .catch((error) => {
        alert(`Failed to import: ${error.message}`);
      });

    e.target.value = '';
  };

  return (
    <div className="config-manager mining-group-manager panel">
      <h2>Mining Group Library</h2>

      <div className="config-actions">
        <button
          className="btn-primary btn-icon-text"
          onClick={() => {
            setGroupName(currentMiningGroup.name || '');
            setShowDialog(true);
          }}
          disabled={currentMiningGroup.ships.length === 0}
          title={currentMiningGroup.ships.length === 0 ? 'Add ships to save' : 'Save current group to library'}
        >
          <span className="btn-icon">💾</span>
          <span className="btn-label">Save Group</span>
        </button>
        <label className="btn-secondary btn-icon-text">
          <span className="btn-icon">📥</span>
          <span className="btn-label">Import</span>
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
          <h3>Save to Library</h3>
          <input
            type="text"
            placeholder="Enter group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
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
                  ▲
                </button>
                <button
                  onClick={() => handleExport(group)}
                  className="btn-export"
                  title="Export"
                >
                  📤
                </button>
                <button
                  onClick={() => handleDelete(group.id, group.name)}
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
