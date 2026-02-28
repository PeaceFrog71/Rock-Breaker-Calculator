import { useState, useEffect, useRef } from 'react';
import type { Ship, MiningConfiguration } from '../types';
import { useAuth, getRegolithApiKeySupabase, hasRegolithApiKeySupabase } from '../contexts/AuthContext';
import { getRegolithApiKeyLocal } from '../utils/storage';
import { fetchShipLoadouts } from '../utils/regolith';
import type { RegolithLoadout } from '../utils/regolith';
import { mapRegolithLoadout } from '../utils/regolithMapping';
import type { LoadoutMappingResult } from '../utils/regolithMapping';
import './RegolithShipImportModal.css';

interface RegolithShipImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (ship: Ship, config: MiningConfiguration, name: string, unmapped: string[]) => void;
  onOpenIntegrations?: () => void;
}

type ModalState = 'loading' | 'no-key' | 'error' | 'no-loadouts' | 'ready';

export default function RegolithShipImportModal({
  isOpen,
  onClose,
  onImport,
  onOpenIntegrations,
}: RegolithShipImportModalProps) {
  const { user } = useAuth();

  const [state, setState] = useState<ModalState>('loading');
  const [loadouts, setLoadouts] = useState<LoadoutMappingResult[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const apiKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLoadouts([]);
      setErrorMsg('');
      apiKeyRef.current = null;
      return;
    }

    // Sync check: if no key is stored anywhere, skip the loading state entirely
    if (!hasRegolithApiKeySupabase(user) && !getRegolithApiKeyLocal()) {
      setState('no-key');
      return;
    }

    setState('loading');

    const load = async () => {
      const apiKey = (user ? await getRegolithApiKeySupabase(user) : null) || getRegolithApiKeyLocal();
      if (!apiKey) {
        setState('no-key');
        return;
      }
      apiKeyRef.current = apiKey;

      try {
        const rawLoadouts: RegolithLoadout[] = await fetchShipLoadouts(apiKey);

        if (rawLoadouts.length === 0) {
          setState('no-loadouts');
          return;
        }

        // Map each loadout to Rock Breaker types
        const mapped: LoadoutMappingResult[] = [];
        for (const raw of rawLoadouts) {
          const result = mapRegolithLoadout(raw);
          if (result) mapped.push(result);
        }

        if (mapped.length === 0) {
          setState('no-loadouts');
          return;
        }

        setLoadouts(mapped);
        setState('ready');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
        setState('error');
      }
    };

    load();
  }, [isOpen, user]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (loadout: LoadoutMappingResult) => {
    onImport(loadout.ship, loadout.config, loadout.name, loadout.unmapped);
    onClose();
  };

  return (
    <div
      className="regolith-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regolith-ship-modal-title"
      onClick={onClose}
    >
      <div className="regolith-modal regolith-ship-modal" onClick={(e) => e.stopPropagation()}>
        <button className="regolith-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3 id="regolith-ship-modal-title">Import Ship from Regolith</h3>

        {state === 'loading' && (
          <div className="regolith-modal-status">
            <div className="regolith-spinner" />
            <p>Connecting to Regolith...</p>
          </div>
        )}

        {state === 'no-key' && (
          <div className="regolith-modal-status">
            <p className="regolith-modal-hint">
              No Regolith API key found.
              <br />
              Add your key in{' '}
              <button
                className="regolith-link-btn"
                onClick={onOpenIntegrations}
              >
                Profile &rarr; Connections
              </button>.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="regolith-modal-status">
            <p className="regolith-modal-error">
              Failed to connect to Regolith: {errorMsg}
            </p>
          </div>
        )}

        {state === 'no-loadouts' && (
          <div className="regolith-modal-status">
            <p className="regolith-modal-hint">
              No ship loadouts found in your Regolith profile.
              <br />
              Create loadouts in{' '}
              <a
                href="https://regolith.rocks/dashboard/loadouts"
                target="_blank"
                rel="noopener noreferrer"
                className="regolith-link-btn"
              >
                Regolith
              </a>{' '}
              first.
            </p>
          </div>
        )}

        {state === 'ready' && (
          <>
            <p className="regolith-modal-subtitle">
              Select a loadout to import.
            </p>
            <div className="regolith-loadout-list">
              {loadouts.map((loadout, i) => (
                <button
                  key={i}
                  className="regolith-loadout-item"
                  onClick={() => handleSelect(loadout)}
                >
                  <div className="regolith-loadout-info">
                    <div className="regolith-loadout-header">
                      <span className="regolith-loadout-name">{loadout.name}</span>
                      <span className="regolith-loadout-ship">{loadout.ship.name}</span>
                    </div>
                    <div className="regolith-loadout-lasers">
                      {loadout.config.lasers.map((laser, li) => {
                        if (!laser.laserHead) return null;
                        const moduleCount = laser.modules.filter(m => m !== null).length;
                        return (
                          <span key={li} className="regolith-loadout-laser-chip">
                            {laser.laserHead.name}
                            {moduleCount > 0 && (
                              <span className="regolith-loadout-module-count">+{moduleCount}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                    {loadout.unmapped.length > 0 && (
                      <div className="regolith-loadout-warnings">
                        {loadout.unmapped.map((item, wi) => (
                          <span key={wi} className="regolith-loadout-warning">
                            ? {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
