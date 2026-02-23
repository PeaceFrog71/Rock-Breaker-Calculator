import { useState, useEffect } from 'react';
import type { Rock } from '../types';
import { useAuth, getRegolithApiKeySupabase } from '../contexts/AuthContext';
import { getRegolithApiKeyLocal } from '../utils/storage';
import { fetchActiveSessionId, fetchSessionRocks } from '../utils/regolith';
import type { RegolithClusterFind, RegolithShipRock } from '../utils/regolith';
import { logRockImport } from '../utils/rockDataLogger';
import './RegolithImportModal.css';

interface RegolithImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rock: Partial<Rock>) => void;
}

type ModalState = 'loading' | 'no-key' | 'no-session' | 'error' | 'ready';

interface RockEntry {
  find: RegolithClusterFind;
  rockIndex: number;
  rock: RegolithShipRock;
}

/** Format ore enum name for display: INERTMATERIAL → Inert, QUANTANIUM → Quantanium */
function formatOreName(ore: string): string {
  if (ore === 'INERTMATERIAL') return 'Inert';
  return ore.charAt(0) + ore.slice(1).toLowerCase();
}

export default function RegolithImportModal({ isOpen, onClose, onImport }: RegolithImportModalProps) {
  const { user } = useAuth();

  const [state, setState] = useState<ModalState>('loading');
  const [rocks, setRocks] = useState<RockEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

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
        setSessionId(sessionId);
        const entries: RockEntry[] = [];

        finds.forEach((find) => {
          find.shipRocks.forEach((rock, i) => {
            if (rock.state !== 'READY') return;
            entries.push({ find, rockIndex: i, rock });
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
    const { rock, find, rockIndex } = entry;
    // res is 0–1 in Regolith (0.25 = 25%) — convert to 0–100 for BreakIt
    onImport({
      mass: rock.mass,
      resistance: rock.res != null ? rock.res * 100 : undefined,
      instability: rock.inst ?? 0,
      name: rock.rockType ?? undefined,
    });
    // Log to Supabase for global analytics — fire-and-forget
    if (sessionId) {
      logRockImport({ find, rock, rockIndex, sessionId, user });
    }
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
                    key={`${entry.find.scoutingFindId}-${entry.rockIndex}`}
                    className="regolith-rock-item"
                    onClick={() => handleSelect(entry)}
                  >
                    <span className="regolith-rock-number">#{i + 1}</span>
                    <div className="regolith-rock-info">
                      <div className="regolith-rock-stats">
                        {entry.rock.rockType && (
                          <span className="regolith-rock-type">{entry.rock.rockType}</span>
                        )}
                        <span><strong>{entry.rock.mass.toLocaleString()}</strong> kg</span>
                        {entry.rock.res != null && (
                          <span><strong>{(entry.rock.res * 100).toFixed(1)}</strong>% res</span>
                        )}
                        <span><strong>{(entry.rock.inst ?? 0).toFixed(1)}</strong> inst</span>
                      </div>
                      {entry.rock.ores.length > 0 && (
                        <div className="regolith-rock-ores">
                          {entry.rock.ores.map((ore) => (
                            <span key={ore.ore} className={`regolith-ore-chip ${ore.ore === 'INERTMATERIAL' ? 'inert' : ''}`}>
                              {formatOreName(ore.ore)} {(ore.percent * 100).toFixed(0)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {entry.find.gravityWell && (
                      <span className="regolith-rock-location">{entry.find.gravityWell}</span>
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
