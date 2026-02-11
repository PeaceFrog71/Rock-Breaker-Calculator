import { useState, useEffect } from 'react';
import type { MiningConfiguration, Ship } from '../types';
import type { SavedShipConfig } from '../utils/storage';
import {
  getSavedShipConfigs,
  saveShipConfig,
  updateShipConfig,
} from '../utils/storage';
import './SaveShipModal.css';

interface SaveShipModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShip: Ship;
  currentConfig: MiningConfiguration;
  currentConfigName?: string;
  onSaved: (ship: Ship, config: MiningConfiguration, name: string) => void;
}

export default function SaveShipModal({
  isOpen,
  onClose,
  currentShip,
  currentConfig,
  currentConfigName,
  onSaved,
}: SaveShipModalProps) {
  const [configName, setConfigName] = useState('');

  // Pre-fill with current config name when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfigName(currentConfigName || '');
    }
  }, [isOpen, currentConfigName]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!configName.trim()) {
      alert('Please enter a ship name');
      return;
    }

    const trimmedName = configName.trim();
    const savedConfigs: SavedShipConfig[] = getSavedShipConfigs();
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

    onSaved(currentShip, currentConfig, trimmedName);
    setConfigName('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="save-ship-modal-overlay" onClick={onClose}>
      <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Save Ship</h3>
        <input
          type="text"
          placeholder="Enter ship name..."
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <div className="save-ship-modal-actions">
          <button onClick={handleSave} className="btn-primary">
            Save
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
