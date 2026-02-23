import { useEffect } from 'react';
import { CHANGELOG } from '../data/changelog';
import './ChangelogModal.css';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="changelog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
      onClick={onClose}
    >
      <div className="changelog-modal" onClick={(e) => e.stopPropagation()}>
        <button className="changelog-close" onClick={onClose} aria-label="Close">×</button>
        <h2 id="changelog-title" className="changelog-heading">What's New</h2>

        <div className="changelog-list">
          {CHANGELOG.map((entry) => (
            <section key={entry.version} className="changelog-entry">
              <div className="changelog-version-row">
                <span className="changelog-version">v{entry.version}</span>
                <span className="changelog-date">{formatDate(entry.date)}</span>
              </div>

              {entry.new && (
                <ul className="changelog-bullets">
                  {entry.new.map((item, i) => (
                    <li key={i} className="changelog-bullet changelog-bullet--new">
                      <span className="changelog-badge">NEW</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {entry.improved && (
                <ul className="changelog-bullets">
                  {entry.improved.map((item, i) => (
                    <li key={i} className="changelog-bullet changelog-bullet--improved">
                      <span className="changelog-badge">IMPROVED</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {entry.fixed && (
                <ul className="changelog-bullets">
                  {entry.fixed.map((item, i) => (
                    <li key={i} className="changelog-bullet changelog-bullet--fixed">
                      <span className="changelog-badge">FIXED</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="changelog-footer">
          <a
            href="https://github.com/PeaceFrog71/BreakIt-Calculator/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            Full release history on GitHub →
          </a>
        </p>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
