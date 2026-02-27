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
  const [confirmOverwrite, setConfirmOverwrite] = useState<SavedShipConfig | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill with current config name when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfigName(currentConfigName || '');
      setConfirmOverwrite(null);
      setErrorMsg('');
    } else {
      setConfigName('');
      setConfirmOverwrite(null);
      setErrorMsg('');
    }
  }, [isOpen, currentConfigName]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!configName.trim()) {
      setErrorMsg('Please enter a ship name.');
      return;
    }

    setErrorMsg('');
    const trimmedName = configName.trim();
    const savedConfigs: SavedShipConfig[] = getSavedShipConfigs();
    const existing = savedConfigs.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      setConfirmOverwrite(existing);
      return;
    }

    saveShipConfig(trimmedName, currentShip, currentConfig);
    onSaved(currentShip, currentConfig, trimmedName);
    setConfigName('');
    onClose();
  };

  const handleOverwriteConfirm = () => {
    if (!confirmOverwrite) return;
    const trimmedName = configName.trim();
    updateShipConfig(confirmOverwrite.id, trimmedName, currentShip, currentConfig);
    onSaved(currentShip, currentConfig, trimmedName);
    setConfigName('');
    setConfirmOverwrite(null);
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
    <div
      className="save-ship-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-ship-modal-title"
      onClick={onClose}
    >
      <div className="save-ship-modal" onClick={(e) => e.stopPropagation()}>
        {confirmOverwrite ? (
          <>
            <h3 id="save-ship-modal-title">Overwrite Ship</h3>
            <p className="save-ship-modal-message">
              &ldquo;{confirmOverwrite.name}&rdquo; already exists. Overwrite?
            </p>
            <div className="save-ship-modal-actions">
              <button onClick={handleOverwriteConfirm} className="btn-primary">
                Overwrite
              </button>
              <button onClick={() => setConfirmOverwrite(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 id="save-ship-modal-title">Save Ship</h3>
            {errorMsg && <p className="save-ship-modal-error">{errorMsg}</p>}
            <input
              type="text"
              placeholder="Enter ship name..."
              value={configName}
              onChange={(e) => { setConfigName(e.target.value); setErrorMsg(''); }}
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
          </>
        )}
      </div>
    </div>
  );
}
