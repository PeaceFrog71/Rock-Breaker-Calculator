import './ResistanceHelpModal.css';

interface ResistanceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResistanceHelpModal({ isOpen, onClose }: ResistanceHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="resistance-help-overlay" onClick={onClose}>
      <div className="resistance-help-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>

        <h2>Resistance Scanning Setup</h2>
        <p className="resistance-intro">
          The calculator needs to know how you scanned the rock's resistance to give accurate results.
          Choose the correct mode using the <strong>Base/Modified</strong> button.
        </p>

        <div className="resistance-section">
          <h3>Base Resistance Mode</h3>
          <p>Use this when you scanned the rock from:</p>
          <ul>
            <li>MOLE cockpit (pilot seat scanner)</li>
            <li>Any ship with laser <em>out of range</em> of the rock</li>
            <li>Extraction mode</li>
          </ul>
          <p className="resistance-note">Base resistance shows the rock's natural resistance without any equipment modifiers.</p>
        </div>

        <div className="resistance-section">
          <h3>Modified Resistance Mode</h3>
          <p>Use this when you scanned the rock with a mining laser <em>in range</em>:</p>
          <ul>
            <li>The reading includes your laser head and module resistance modifiers</li>
            <li><strong>Select which laser scanned:</strong> Use the dropdown to pick the specific laser that was in range when scanning</li>
            <li>The calculator will "reverse" the modification to find the true base resistance</li>
          </ul>
          <p className="resistance-note">For MOLE with multiple turrets, select the turret that was pointed at the rock during the scan.</p>
        </div>

        <div className="resistance-section">
          <h3>Gadgets in Scan</h3>
          <p>Check this box if gadgets were <em>attached to the rock</em> when you scanned:</p>
          <ul>
            <li>Gadgets physically attach to rocks and modify their resistance directly</li>
            <li>This affects <em>both</em> Base and Modified resistance readings</li>
            <li>Toggle ON the specific gadgets that were on the rock during your scan</li>
            <li>The calculator will account for their effect when determining true resistance</li>
          </ul>
          <p className="resistance-note">If you're unsure, scan the rock before attaching any gadgets and use Base mode.</p>
        </div>
      </div>
    </div>
  );
}
