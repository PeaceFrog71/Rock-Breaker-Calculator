import { useState } from 'react';
import type { MiningGroup } from '../types';
import type { SavedMiningGroup } from '../utils/storage';
import {
  getSavedMiningGroups,
  saveMiningGroup,
  updateMiningGroup,
  deleteMiningGroup,
  loadMiningGroup,
} from '../utils/storage';
import './ConfigManager.css';

interface MiningGroupManagerProps {
  currentMiningGroup: MiningGroup;
  onLoad: (miningGroup: MiningGroup) => void;
}

export default function MiningGroupManager({
  currentMiningGroup,
  onLoad,
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

    if (existing) {
      if (!confirm(`"${existing.name}" already exists. Overwrite?`)) {
        return;
      }
      const updated = updateMiningGroup(existing.id, trimmedName, currentMiningGroup);
      if (!updated) {
        alert('Failed to update the mining group. It may have been removed. Saving as a new group instead.');
        saveMiningGroup(trimmedName, currentMiningGroup);
      }
    } else {
      saveMiningGroup(trimmedName, currentMiningGroup);
    }

    setSavedGroups(getSavedMiningGroups());
    setGroupName('');
    setShowDialog(false);
  };

  const handleLoad = (id: string) => {
    const group = loadMiningGroup(id);
    if (group) {
      onLoad(group.miningGroup);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete mining group "${name}"?`)) {
      deleteMiningGroup(id);
      setSavedGroups(getSavedMiningGroups());
    }
  };

  return (
    <div className="config-manager panel">
      <h2>Saved Mining Groups</h2>

      <div className="config-actions">
        <button
          className="btn-primary"
          onClick={() => setShowDialog(true)}
          disabled={currentMiningGroup.ships.length === 0}
          title={currentMiningGroup.ships.length === 0 ? 'Add ships to save group' : 'Save current mining group'}
        >
          💾 Save Current Group
        </button>
      </div>

      {showDialog && (
        <div className="save-dialog">
          <h3>Save Mining Group</h3>
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
          <p className="empty-message">No saved mining groups yet</p>
        ) : (
          savedGroups.map((group) => (
            <div key={group.id} className="config-item">
              <div className="config-info">
                <div className="config-name">{group.name}</div>
                <div className="config-meta">
                  {group.miningGroup.ships.length} ship{group.miningGroup.ships.length > 1 ? 's' : ''}
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
                  ↑
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
