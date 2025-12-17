import { useState } from 'react';
import './ResistanceModeSelector.css';
import ResistanceHelpModal from './ResistanceHelpModal';

interface Props {
  value: number;
  mode: 'base' | 'modified';
  includeGadgets: boolean;
  showHint: boolean;
  onChange: (value: number) => void;
  onModeToggle: () => void;
  onGadgetToggle: () => void;
}

export default function ResistanceModeSelector({
  value,
  mode,
  includeGadgets,
  showHint,
  onChange,
  onModeToggle,
  onGadgetToggle,
}: Props) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="compact-form-group resistance-input-group">
      <label>
        Resistance
        <button
          className="resistance-help-icon"
          onClick={() => setShowHelp(true)}
          type="button"
          aria-label="Resistance scanning help"
        >
          ?
        </button>
      </label>
      <ResistanceHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <input
        type="number"
        inputMode="decimal"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(
          e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
        )}
        min="0"
        step="0.1"
        placeholder="0"
      />

      <div className="resistance-mode-controls">
        <button
          className={`mode-toggle ${mode === 'modified' ? 'modified-mode' : ''}`}
          onClick={onModeToggle}
          type="button"
          title={mode === 'base'
            ? "Currently: Base resistance (cockpit scan). Click if from laser scan."
            : "Currently: Modified resistance (laser scan). Click if from cockpit scan."}
        >
          {mode === 'base' ? 'Base' : 'Modified'}
        </button>

        <label className="gadget-checkbox">
          <input
            type="checkbox"
            checked={includeGadgets}
            onChange={onGadgetToggle}
            title="Check if gadgets were already applied when you scanned this rock"
          />
          <span>Gadgets in scan</span>
        </label>

        {showHint && mode === 'base' && (
          <div className="resistance-hint">
            <div className="hint-text">
              <span className="hint-icon">💡</span>
              <span>Low resistance + equipment modifiers detected. Scanned with laser?</span>
            </div>
            <button
              className="hint-btn"
              onClick={onModeToggle}
              type="button"
            >
              Switch to Modified
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
