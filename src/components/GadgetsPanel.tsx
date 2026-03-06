import { useState } from "react";
import { createPortal } from "react-dom";
import type { Gadget } from "../types";
import { GADGETS } from "../types";
import { formatGadgetTooltip, getGadgetEffects } from "../utils/formatters";

interface GadgetsPanelProps {
  gadgets: (Gadget | null)[];
  gadgetCount: number;
  gadgetEnabled: boolean[];
  gadgetInScan: boolean[];
  includeGadgetsInScan: boolean;
  onGadgetCountChange: (count: number) => void;
  onGadgetsChange: (gadgets: (Gadget | null)[]) => void;
  onGadgetInScanChange: (inScan: boolean[]) => void;
  onToggleGadget: (index: number) => void;
  onToggleGadgetInScan: (index: number) => void;
}

export default function GadgetsPanel({
  gadgets,
  gadgetCount,
  gadgetEnabled,
  gadgetInScan,
  includeGadgetsInScan,
  onGadgetCountChange,
  onGadgetsChange,
  onGadgetInScanChange,
  onToggleGadget,
  onToggleGadgetInScan,
}: GadgetsPanelProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div className="gadget-header-compact">
        <h2>Gadgets</h2>
        <button
          className="gadget-help-icon"
          onClick={() => setShowHelp(true)}
          type="button"
          aria-label="Gadgets help"
        >
          ?
        </button>
        <div className="gadget-count-stepper">
          <button
            className="stepper-btn"
            onClick={() => onGadgetCountChange(Math.max(0, gadgetCount - 1))}
            disabled={gadgetCount <= 0}
          >
            ▼
          </button>
          <span className="stepper-value">{gadgetCount}</span>
          <button
            className="stepper-btn"
            onClick={() => onGadgetCountChange(Math.min(10, gadgetCount + 1))}
            disabled={gadgetCount >= 10}
          >
            ▲
          </button>
        </div>
      </div>
      {Array.from({ length: gadgetCount }).map((_, index) => {
        const gadget = gadgets[index];
        const isEnabled = gadgetEnabled[index] !== false;
        const isInScan = gadgetInScan[index] === true;
        const effects = getGadgetEffects(gadget);

        return (
          <div key={index} className="compact-form-group gadget-select-wrapper">
            <div className="gadget-label-row">
              <label>Gadget {index + 1}</label>
              {includeGadgetsInScan && gadget && gadget.id !== 'none' && (
                <label className="in-scan-checkbox">
                  <input
                    type="checkbox"
                    checked={isInScan}
                    onChange={() => onToggleGadgetInScan(index)}
                    title="Check if this gadget was attached to the rock when you scanned"
                  />
                  <span>In Scan</span>
                </label>
              )}
            </div>
            <select
              value={gadgets[index]?.id || 'none'}
              onChange={(e) => {
                const newGadget = GADGETS.find((g) => g.id === e.target.value) || null;
                const newGadgets = [...gadgets];
                newGadgets[index] = newGadget;
                onGadgetsChange(newGadgets);
                // Clear inScan state when gadget is removed
                if (!newGadget || newGadget.id === 'none') {
                  const newInScan = [...gadgetInScan];
                  newInScan[index] = false;
                  onGadgetInScanChange(newInScan);
                }
              }}
              title={gadgets[index] && gadgets[index]!.id !== 'none' ?
                formatGadgetTooltip(gadgets[index]) : 'Select a gadget'}
            >
              {GADGETS.map((gadget) => (
                <option
                  key={gadget.id}
                  value={gadget.id}
                  title={formatGadgetTooltip(gadget)}
                >
                  {gadget.name}
                </option>
              ))}
            </select>

            {/* Gadget Info Box - directly below selector */}
            {gadget && gadget.id !== 'none' && effects.length > 0 && (
              <div
                className={`gadget-info-item ${!isEnabled ? 'disabled' : ''}`}
                onClick={() => onToggleGadget(index)}
              >
                <div className="gadget-info-effects">
                  {effects.map((effect, i) => (
                    <span key={i} className={`gadget-effect ${effect.isPositive ? 'positive' : 'negative'}`}>
                      {effect.label}: {effect.pct}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {/* Guidance message when "Gadgets in Scan" is checked but none marked */}
      {includeGadgetsInScan &&
       !gadgetInScan.some((inScan, i) => inScan && gadgets[i] && gadgets[i]!.id !== 'none') && (
        <div className="gadgets-scan-hint">
          <span className="hint-icon">💡</span>
          <span>
            {gadgets.some(g => g && g.id !== 'none')
              ? 'Mark which gadgets were on the rock when you scanned'
              : 'Add gadgets that were on the rock when you scanned'}
          </span>
        </div>
      )}

      {showHelp && createPortal(
        <div
          className="gadget-help-overlay"
          onClick={() => setShowHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gadget-help-title"
        >
          <div className="gadget-help-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setShowHelp(false)}
              type="button"
              aria-label="Close"
            >
              ×
            </button>
            <h2 id="gadget-help-title">Gadgets Help</h2>
            <p><strong>Multiple Gadgets:</strong> The game only allows one gadget per player on a rock. To stack multiple gadgets, coordinate with your mining crew — each player attaches their gadget simultaneously on a countdown (e.g., “3… 2… 1… attach!”). Use the arrows to add a gadget slot for each crew member contributing.</p>
            <p><strong>Effects:</strong> Gadget modifiers multiply together. Toggle individual gadgets on/off by clicking their effect boxes.</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
