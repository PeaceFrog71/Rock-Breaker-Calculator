import type { Gadget } from '../types';
import { GADGETS } from '../types';
import './GadgetSelector.css';

interface GadgetSelectorProps {
  gadgets: (Gadget | null)[];
  onChange: (gadgets: (Gadget | null)[]) => void;
}

export default function GadgetSelector({ gadgets, onChange }: GadgetSelectorProps) {
  const handleGadgetChange = (index: number, gadgetId: string) => {
    const gadget = GADGETS.find((g) => g.id === gadgetId) || null;
    const newGadgets = [...gadgets];
    newGadgets[index] = gadget;
    onChange(newGadgets);
  };

  return (
    <div className="gadget-selector panel">
      <h2>Gadgets (Consumables)</h2>
      {[0, 1, 2].map((index) => (
        <div key={index} className="form-group">
          <label>Gadget {index + 1}:</label>
          <select
            value={gadgets[index]?.id || 'none'}
            onChange={(e) => handleGadgetChange(index, e.target.value)}
          >
            {GADGETS.map((gadget) => (
              <option key={gadget.id} value={gadget.id}>
                {gadget.name}
                {gadget.resistModifier !== 1 ? ` (${gadget.resistModifier}x resist)` : ''}
              </option>
            ))}
          </select>
          {gadgets[index] && gadgets[index]!.id !== 'none' && (
            <div className="gadget-description">{gadgets[index]!.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}
