import type { Rock } from "../types";
import ResistanceModeSelector from "./ResistanceModeSelector";

interface RockPropertiesPanelProps {
  rock: Rock;
  rockSlots: Rock[];
  activeRockSlot: number;
  isRockAtDefaults: boolean;
  showResistanceHint: boolean;
  onRockChange: (rock: Rock) => void;
  onResistanceChange: (value: number) => void;
  onResistanceModeToggle: () => void;
  onGadgetInclusionToggle: () => void;
  onRockResetClear: () => void;
  onRockSlotSwitch: (index: number) => void;
  onRegolithImport?: () => void;
}

export default function RockPropertiesPanel({
  rock,
  rockSlots,
  activeRockSlot,
  isRockAtDefaults,
  showResistanceHint,
  onRockChange,
  onResistanceChange,
  onResistanceModeToggle,
  onGadgetInclusionToggle,
  onRockResetClear,
  onRockSlotSwitch,
  onRegolithImport,
}: RockPropertiesPanelProps) {
  return (
    <>
      <div className="compact-form-group">
        <label>Name</label>
        <input
          type="text"
          value={rock.name || ''}
          onChange={(e) => onRockChange({ ...rock, name: e.target.value })}
          placeholder="Rock name"
        />
      </div>
      <div className="compact-form-group">
        <label>Mass</label>
        <input
          type="number"
          inputMode="decimal"
          value={rock.mass === 0 ? '' : rock.mass}
          onChange={(e) => onRockChange({ ...rock, mass: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          min="0"
          step="0.1"
        />
      </div>
      <ResistanceModeSelector
        value={rock.resistance}
        mode={rock.resistanceMode || 'base'}
        includeGadgets={rock.includeGadgetsInScan || false}
        showHint={showResistanceHint}
        instability={rock.instability}
        onChange={onResistanceChange}
        onModeToggle={onResistanceModeToggle}
        onGadgetToggle={onGadgetInclusionToggle}
        onInstabilityChange={(value) => onRockChange({ ...rock, instability: value })}
      />
      {onRegolithImport && (
        <button
          className="regolith-import-button"
          onClick={onRegolithImport}
          aria-label="Import rock from Regolith"
        >
          Import from Regolith
        </button>
      )}
      <button
        className="clear-rock-button"
        onClick={onRockResetClear}
        aria-label={isRockAtDefaults ? 'Clear all rock values' : 'Reset rock values to defaults'}
      >
        {isRockAtDefaults ? 'Clear' : 'Reset'}
      </button>
      <div className="rock-slots">
        {rockSlots.map((slot, index) => (
          <button
            key={index}
            className={`rock-slot-button ${index === activeRockSlot ? 'active' : ''}`}
            onClick={() => onRockSlotSwitch(index)}
            title={`${slot.name || 'Rock'}: ${slot.mass}kg, ${parseFloat(slot.resistance.toFixed(2))}%${slot.instability !== undefined ? `, ${slot.instability} instability` : ''}`}
            aria-label={`Rock slot ${index + 1}`}
            aria-pressed={index === activeRockSlot}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <a
        className="regolith-attribution"
        href="https://regolith.rocks/dashboard/sessions"
        target="_blank"
        rel="noopener noreferrer"
      >
        Scan rocks with Regolith.rocks
      </a>
    </>
  );
}
