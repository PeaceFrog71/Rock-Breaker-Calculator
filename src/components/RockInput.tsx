import type { Rock } from "../types";
import "./RockInput.css";

interface RockInputProps {
  rock: Rock;
  onChange: (rock: Rock) => void;
}

export default function RockInput({ rock, onChange }: RockInputProps) {
  return (
    <div className="rock-input panel">
      <h2>Rock Properties</h2>

      <div className="form-group">
        <label>Rock Name (optional):</label>
        <input
          type="text"
          value={rock.name || ""}
          onChange={(e) => onChange({ ...rock, name: e.target.value })}
          placeholder="e.g., Quantainium Rock"
        />
      </div>

      <div className="form-group">
        <label>Mass:</label>
        <input
          type="number"
          value={rock.mass}
          onChange={(e) =>
            onChange({ ...rock, mass: parseFloat(e.target.value) || 0 })
          }
          min="0"
          step="0.1"
        />
      </div>

      <div className="form-group">
        <label>Base Resistance:</label>
        <input
          type="number"
          value={rock.resistance === 0 ? "" : rock.resistance}
          onChange={(e) =>
            onChange({
              ...rock,
              resistance:
                e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
            })
          }
          min="0"
          step="0.1"
          placeholder="0"
        />
      </div>

      <div className="rock-info">
        <p className="info-text">
          Find these values in the scanning UI when targeting a rock
        </p>
      </div>
    </div>
  );
}
