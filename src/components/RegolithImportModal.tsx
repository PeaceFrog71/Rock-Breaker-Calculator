import { useState, useEffect, useCallback, useRef } from 'react';
import type { Rock } from '../types';
import { useAuth, getRegolithApiKeySupabase, hasRegolithApiKeySupabase } from '../contexts/AuthContext';
import { getRegolithApiKeyLocal } from '../utils/storage';
import { fetchActiveSessions, fetchSessionRocks } from '../utils/regolith';
import type { RegolithSession, RegolithClusterFind, RegolithShipRock } from '../utils/regolith';
import { logRockImport } from '../utils/rockDataLogger';
import './RegolithImportModal.css';

interface RegolithImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rock: Partial<Rock>) => void;
  onOpenIntegrations?: () => void;
}

type ModalState = 'loading' | 'no-key' | 'no-session' | 'error' | 'select-session' | 'loading-rocks' | 'no-rocks' | 'ready';

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

/** Format session name for display, with fallback to truncated ID */
function formatSessionName(session: RegolithSession): string {
  return session.name || `Session ${session.sessionId.slice(0, 6)}...`;
}

export default function RegolithImportModal({ isOpen, onClose, onImport, onOpenIntegrations }: RegolithImportModalProps) {
  const { user } = useAuth();

  const [state, setState] = useState<ModalState>('loading');
  const [sessions, setSessions] = useState<RegolithSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [rocks, setRocks] = useState<RockEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Cache API key across session switches so we don't re-decrypt each time
  const apiKeyRef = useRef<string | null>(null);

  const loadRocksForSession = useCallback(async (apiKey: string, sessionId: string) => {
    setState('loading-rocks');
    setSelectedSessionId(sessionId);
    try {
      const finds = await fetchSessionRocks(apiKey, sessionId);
      const entries: RockEntry[] = [];

      finds.forEach((find) => {
        find.shipRocks.forEach((rock, i) => {
          if (rock.state !== 'READY') return;
          entries.push({ find, rockIndex: i, rock });
        });
      });

      if (entries.length === 0) {
        setState('no-rocks');
        return;
      }

      setRocks(entries);
      setState('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      // Reset state so stale results don't flash on next open
      setRocks([]);
      setSessions([]);
      setSelectedSessionId(null);
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
      // Decrypt the account key (async) or fall back to localStorage
      const apiKey = (user ? await getRegolithApiKeySupabase(user) : null) || getRegolithApiKeyLocal();
      if (!apiKey) {
        setState('no-key');
        return;
      }
      apiKeyRef.current = apiKey;

      try {
        const activeSessions = await fetchActiveSessions(apiKey);
        if (activeSessions.length === 0) {
          setState('no-session');
          return;
        }

        setSessions(activeSessions);

        if (activeSessions.length === 1) {
          // Single session — skip the picker, go straight to rocks
          await loadRocksForSession(apiKey, activeSessions[0].sessionId);
        } else {
          // Multiple sessions — let user pick
          setState('select-session');
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
        setState('error');
      }
    };

    load();
  }, [isOpen, user, loadRocksForSession]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSessionSelect = (sessionId: string) => {
    if (!apiKeyRef.current) return;
    setRocks([]);
    loadRocksForSession(apiKeyRef.current, sessionId);
  };

  const handleBackToSessions = () => {
    setRocks([]);
    setSelectedSessionId(null);
    setState('select-session');
  };

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
    if (selectedSessionId) {
      logRockImport({ find, rock, rockIndex, sessionId: selectedSessionId, user });
    }
    onClose();
  };

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId);

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
              No Regolith API key found.
              <br />
              Add your key in{' '}
              <button
                className="regolith-link-btn"
                onClick={onOpenIntegrations}
              >
                Profile → Connections
              </button>.
            </p>
          </div>
        )}

        {state === 'no-session' && (
          <div className="regolith-modal-status">
            <p className="regolith-modal-hint">
              No active Regolith session found.
              <br />
              Start a session in{' '}
              <a
                href="https://regolith.rocks/dashboard/sessions"
                target="_blank"
                rel="noopener noreferrer"
                className="regolith-link-btn"
              >
                Regolith
              </a>{' '}
              and scan some rocks first.
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

        {state === 'select-session' && (
          <>
            <p className="regolith-modal-subtitle">
              You have {sessions.length} active sessions. Select one to import rocks from.
            </p>
            <div className="regolith-session-list">
              {sessions.map((session) => (
                <button
                  key={session.sessionId}
                  className="regolith-session-item"
                  onClick={() => handleSessionSelect(session.sessionId)}
                >
                  <span className="regolith-session-name">
                    {formatSessionName(session)}
                  </span>
                  <div className="regolith-session-meta">
                    {session.ownerScName && (
                      <span>Owner: {session.ownerScName}</span>
                    )}
                    {session.createdAt > 0 && (
                      <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {state === 'loading-rocks' && (
          <div className="regolith-modal-status">
            <div className="regolith-spinner" />
            <p>Loading rocks...</p>
          </div>
        )}

        {state === 'no-rocks' && (
          <div className="regolith-modal-status">
            <p className="regolith-modal-hint">
              No rock scans found in this session.
            </p>
            {sessions.length > 1 && (
              <button className="regolith-back-btn" onClick={handleBackToSessions}>
                &larr; Back to sessions
              </button>
            )}
          </div>
        )}

        {state === 'ready' && (
          <>
            {sessions.length > 1 && (
              <button className="regolith-back-btn" onClick={handleBackToSessions}>
                &larr; Back to sessions
              </button>
            )}
            <p className="regolith-modal-subtitle">
              {sessions.length > 1
                ? `Rocks from "${formatSessionName(selectedSession!)}" \u2014 select one to import.`
                : 'Select a rock from your active session to import.'
              }
            </p>
            <div className="regolith-rock-list">
              {rocks.map((entry, i) => (
                  <button
                    key={`${entry.find.scoutingFindId}-${entry.rockIndex}`}
                    className="regolith-rock-item"
                    onClick={() => handleSelect(entry)}
                    aria-label={`Import rock ${i + 1}: ${entry.rock.mass.toLocaleString()} kg${entry.rock.res != null ? `, ${(entry.rock.res * 100).toFixed(1)}% resistance` : ''}${entry.rock.rockType ? `, ${entry.rock.rockType}` : ''}`}
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
