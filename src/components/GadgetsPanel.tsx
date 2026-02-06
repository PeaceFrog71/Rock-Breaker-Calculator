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
  return (
    <>
      <div className="gadget-header-compact">
        <h2>Gadgets</h2>
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
       gadgets.some(g => g && g.id !== 'none') &&
       !gadgetInScan.some((inScan, i) => inScan && gadgets[i] && gadgets[i]!.id !== 'none') && (
        <div className="gadgets-scan-hint">
          <span className="hint-icon">💡</span>
          <span>Mark which gadgets were on the rock when you scanned</span>
        </div>
      )}
    </>
  );
}
