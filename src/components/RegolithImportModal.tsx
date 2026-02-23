import { useState, useEffect } from 'react';
import type { Rock } from '../types';
import { useAuth, getRegolithApiKeySupabase } from '../contexts/AuthContext';
import { getRegolithApiKeyLocal } from '../utils/storage';
import { fetchActiveSessionId, fetchSessionRocks } from '../utils/regolith';
import type { RegolithShipRock } from '../utils/regolith';
import './RegolithImportModal.css';

interface RegolithImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rock: Partial<Rock>) => void;
}

type ModalState = 'loading' | 'no-key' | 'no-session' | 'error' | 'ready';

interface RockEntry {
  findId: string;
  rockIndex: number;
  location: string | null;
  rock: RegolithShipRock;
}

export default function RegolithImportModal({ isOpen, onClose, onImport }: RegolithImportModalProps) {
  const { user } = useAuth();

  const [state, setState] = useState<ModalState>('loading');
  const [rocks, setRocks] = useState<RockEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const apiKey = (user ? getRegolithApiKeySupabase(user) : null) || getRegolithApiKeyLocal();

    if (!apiKey) {
      setState('no-key');
      return;
    }

    setState('loading');

    const load = async () => {
      try {
        const sessionId = await fetchActiveSessionId(apiKey);
        if (!sessionId) {
          setState('no-session');
          return;
        }

        const finds = await fetchSessionRocks(apiKey, sessionId);
        const entries: RockEntry[] = [];

        finds.forEach((find) => {
          find.shipRocks.forEach((rock, i) => {
            entries.push({
              findId: find.scoutingFindId,
              rockIndex: i,
              location: find.gravityWell,
              rock,
            });
          });
        });

        if (entries.length === 0) {
          setState('no-session');
          return;
        }

        setRocks(entries);
        setState('ready');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
        setState('error');
      }
    };

    load();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (entry: RockEntry) => {
    const { rock } = entry;
    // Regolith res is on a 0-100 scale (percentage), same as BreakIt
    onImport({
      mass: rock.mass,
      resistance: rock.res ?? undefined,
      instability: rock.inst ?? undefined,
    });
    onClose();
  };

  return (
    <div
      className="regolith-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regolith-modal-title"
      onClick={onClose}
    >
      <div className="regolith-modal" onClick={(e) => e.stopPropagation()}>
        <button className="regolith-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3 id="regolith-modal-title">Import from Regolith</h3>

        {state === 'loading' && (
          <div className="regolith-modal-status">
            <div className="regolith-spinner" />
            <p>Connecting to Regolith...</p>
          </div>
        )}

        {state === 'no-key' && (
          <div className="regolith-modal-status">
            <p className="regolith-modal-hint">
              No Regolith API key found. Add your key in{' '}
              <strong>Profile → Integrations</strong>.
            </p>
          </div>
        )}

        {state === 'no-session' && (
          <div className="regolith-modal-status">
            <p className="regolith-modal-hint">
              No active Regolith session found, or no rock scans in the current session.
              Start a session in Regolith and scan some rocks first.
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

        {state === 'ready' && (
          <>
            <p className="regolith-modal-subtitle">
              Select a rock from your active session to import.
            </p>
            <div className="regolith-rock-list">
              {rocks.map((entry, i) => (
                <button
                  key={`${entry.findId}-${entry.rockIndex}`}
                  className="regolith-rock-item"
                  onClick={() => handleSelect(entry)}
                >
                  <span className="regolith-rock-number">#{i + 1}</span>
                  <div className="regolith-rock-stats">
                    <span><strong>{entry.rock.mass.toLocaleString()}</strong> kg</span>
                    {entry.rock.res != null && (
                      <span><strong>{entry.rock.res.toFixed(1)}</strong>% res</span>
                    )}
                    {entry.rock.inst != null && (
                      <span><strong>{entry.rock.inst.toFixed(2)}</strong> inst</span>
                    )}
                  </div>
                  {entry.location && (
                    <span className="regolith-rock-location">{entry.location}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
