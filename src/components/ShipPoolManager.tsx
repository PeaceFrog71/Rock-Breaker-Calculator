import { useState, useEffect } from 'react';
import type { MiningGroup, ShipInstance, Ship, MiningConfiguration } from '../types';
import ShipConfigModal from './ShipConfigModal';
import SaveShipModal from './SaveShipModal';
import { getSavedMiningGroups, saveMiningGroup, updateMiningGroup } from '../utils/storage';
import { calculateLaserPower } from '../utils/calculator';
import './ShipPoolManager.css';
import './ConfigManager.css';

interface ShipPoolManagerProps {
  miningGroup: MiningGroup;
  onChange: (miningGroup: MiningGroup) => void;
  onOpenLibrary?: () => void;
}

export default function ShipPoolManager({ miningGroup, onChange, onOpenLibrary }: ShipPoolManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<ShipInstance | undefined>(undefined);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [savingShip, setSavingShip] = useState<ShipInstance | null>(null);
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Close choice modal on Escape
  useEffect(() => {
    if (!showAddChoice) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddChoice(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showAddChoice]);

  const handleAddShip = () => {
    if (miningGroup.ships.length >= 4) {
      setConfirmDialog({ title: 'Fleet Full', message: 'Maximum of 4 ships allowed in mining group.', onConfirm: () => setConfirmDialog(null) });
      return;
    }
    setShowAddChoice(true);
  };

  const handleAddNewShip = () => {
    setShowAddChoice(false);
    setEditingShip(undefined);
    setIsModalOpen(true);
  };

  const handleAddFromLibrary = () => {
    setShowAddChoice(false);
    onOpenLibrary?.();
  };

  const handleClearGroup = () => {
    if (miningGroup.ships.length === 0 && !miningGroup.name) return;
    setConfirmDialog({
      title: 'Clear Group',
      message: 'Remove all ships and reset group name?',
      onConfirm: () => {
        onChange({ ships: [], name: undefined });
        setConfirmDialog(null);
      },
    });
  };

  const handleSaveGroup = () => {
    if (miningGroup.ships.length === 0) {
      setConfirmDialog({ title: 'No Ships', message: 'Add at least one ship before saving the group.', onConfirm: () => setConfirmDialog(null) });
      return;
    }
    setGroupNameInput(miningGroup.name || '');
    setShowSaveGroup(true);
  };

  const handleSaveGroupConfirm = () => {
    const trimmedName = groupNameInput.trim();
    if (!trimmedName) return;

    const savedGroups = getSavedMiningGroups();
    const existing = savedGroups.find(
      (g) => g.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      setShowSaveGroup(false);
      setConfirmDialog({
        title: 'Overwrite Group',
        message: `"${existing.name}" already exists. Overwrite?`,
        onConfirm: () => {
          const updated = updateMiningGroup(existing.id, trimmedName, miningGroup);
          if (!updated) {
            saveMiningGroup(trimmedName, miningGroup);
          }
          onChange({ ...miningGroup, name: trimmedName });
          setConfirmDialog(null);
        },
      });
    } else {
      saveMiningGroup(trimmedName, miningGroup);
      onChange({ ...miningGroup, name: trimmedName });
      setShowSaveGroup(false);
    }
  };

  const handleEditShip = (ship: ShipInstance) => {
    setEditingShip(ship);
    setIsModalOpen(true);
  };

  const handleRemoveShip = (shipId: string) => {
    const updatedShips = miningGroup.ships.filter((s) => s.id !== shipId);
    onChange({ ...miningGroup, ships: updatedShips });
  };

  const handleToggleActive = (shipId: string) => {
    const updatedShips = miningGroup.ships.map((s) =>
      s.id === shipId ? { ...s, isActive: !s.isActive } : s
    );
    onChange({ ...miningGroup, ships: updatedShips });
  };

  const handleSaveShip = (shipInstance: ShipInstance) => {
    let updatedShips: ShipInstance[];

    if (editingShip) {
      updatedShips = miningGroup.ships.map((s) =>
        s.id === shipInstance.id ? shipInstance : s
      );
    } else {
      if (miningGroup.ships.length >= 4) {
        setConfirmDialog({ title: 'Fleet Full', message: 'Maximum of 4 ships allowed in mining group.', onConfirm: () => setConfirmDialog(null) });
        return;
      }
      shipInstance.isActive = true;
      updatedShips = [...miningGroup.ships, shipInstance];
    }

    onChange({ ...miningGroup, ships: updatedShips });
  };

  const handleSaveShipToLibrary = (ship: ShipInstance) => {
    setSavingShip(ship);
  };

  const handleSaveShipComplete = (_ship: Ship, _config: MiningConfiguration, name: string) => {
    if (savingShip) {
      const updatedShips = miningGroup.ships.map((s) =>
        s.id === savingShip.id ? { ...s, name } : s
      );
      onChange({ ...miningGroup, ships: updatedShips });
    }
    setSavingShip(null);
  };

  return (
    <div className="ship-pool-manager">
      <div className="ship-pool-header">
        <h2>
          Mining Group
          {miningGroup.name && <span className="group-name">{miningGroup.name}</span>}
        </h2>
        <div className="header-buttons">
          <div className="left-buttons">
            <button className="add-ship-button" onClick={handleAddShip}>
              Add<br />Ship
            </button>
            <button className="save-group-button" onClick={handleSaveGroup}>
              Save<br />Group
            </button>
          </div>
          <button className="clear-group-button" onClick={handleClearGroup}>
            Clear
          </button>
        </div>
      </div>

      <div className="ship-pool-content">
        {miningGroup.ships.length === 0 ? (
          <div className="empty-state">
            <p>No ships in mining group</p>
            <p className="hint">Click "Add Ship" to start building your mining fleet</p>
          </div>
        ) : (
          <div className="ships-list">
            {miningGroup.ships.map((ship) => (
              <div
                key={ship.id}
                className={`ship-card ${ship.isActive === false ? 'inactive' : 'active'}`}
              >
                <div className="ship-card-header">
                  <div className="ship-info">
                    <h3>{ship.name}</h3>
                    <p className="ship-type">{ship.ship.name}</p>
                  </div>
                  <button
                    className={`status-indicator ${ship.isActive === false ? 'off' : 'on'}`}
                    onClick={() => handleToggleActive(ship.id)}
                    title={ship.isActive === false ? 'Click to activate ship' : 'Click to deactivate ship'}
                  >
                    {ship.isActive === false ? 'OFF' : 'ON'}
                  </button>
                </div>
                <div className="ship-card-body">
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
                      const activeLasers = ship.config.lasers.filter(l => l.laserHead && l.laserHead.id !== 'none');
                      if (activeLasers.length <= 1) return null;
                      const totalPower = activeLasers.reduce((sum, laser) => sum + calculateLaserPower(laser, true), 0);
                      return totalPower > 0 ? (
                        <span className="config-box stats-box">&Sigma; {totalPower.toFixed(0)}</span>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="ship-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="edit-button"
                    onClick={() => handleEditShip(ship)}
                    title="Edit ship configuration"
                  >
                    <span className="btn-text">Edit</span>
                    <span className="btn-emoji">&#x270F;&#xFE0F;</span>
                  </button>
                  <button
                    className="save-library-button"
                    onClick={() => handleSaveShipToLibrary(ship)}
                    title="Save to Ship Library"
                  >
                    <span className="btn-text">Save</span>
                    <span className="btn-emoji">&#x1F4BE;</span>
                  </button>
                  <button
                    className="remove-button"
                    onClick={() => handleRemoveShip(ship.id)}
                    title="Remove ship from group"
                  >
                    <span className="btn-text">Remove</span>
                    <span className="btn-emoji">&#x1F5D1;&#xFE0F;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ShipConfigModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingShip(undefined);
        }}
        onSave={handleSaveShip}
        editingShip={editingShip}
      />

      {savingShip && (
        <SaveShipModal
          isOpen={true}
          onClose={() => setSavingShip(null)}
          currentShip={savingShip.ship}
          currentConfig={savingShip.config}
          currentConfigName={savingShip.name}
          onSaved={handleSaveShipComplete}
        />
      )}

      {showAddChoice && (
        <div className="add-choice-overlay" onClick={() => setShowAddChoice(false)}>
          <div className="add-choice-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Ship</h3>
            <p className="add-choice-subtitle">How would you like to add a ship?</p>
            <div className="add-choice-buttons">
              <button className="add-choice-btn new-ship" onClick={handleAddNewShip}>
                <span className="add-choice-btn-icon">+</span>
                <span className="add-choice-btn-label">New Ship</span>
                <span className="add-choice-btn-desc">Configure from scratch</span>
              </button>
              <button className="add-choice-btn from-library" onClick={handleAddFromLibrary}>
                <span className="add-choice-btn-icon">&#x1F4CB;</span>
                <span className="add-choice-btn-label">Ship Library</span>
                <span className="add-choice-btn-desc">Load a saved configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveGroup && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowSaveGroup(false)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Save Group</h3>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveGroupConfirm();
                if (e.key === 'Escape') setShowSaveGroup(false);
              }}
              autoFocus
            />
            <div className="save-ship-modal-actions">
              <button onClick={handleSaveGroupConfirm} className="btn-primary">Save</button>
              <button onClick={() => setShowSaveGroup(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="save-ship-modal-overlay" role="dialog" aria-modal="true" onClick={() => setConfirmDialog(null)}>
          <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmDialog.title}</h3>
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
