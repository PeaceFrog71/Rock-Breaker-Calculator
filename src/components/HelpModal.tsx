import { useState } from 'react';
import './HelpModal.css';
import ResistanceHelpContent from './ResistanceHelpContent';

type UserMode = 'casual-single' | 'casual-group' | 'return-single' | 'return-group' | 'trainer-single' | 'trainer-group' | null;

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [selectedMode, setSelectedMode] = useState<UserMode>(null);

  if (!isOpen) return null;

  const handleModeSelect = (mode: UserMode) => {
    setSelectedMode(mode);
  };

  const handleBack = () => {
    setSelectedMode(null);
  };

  const renderModeSelection = () => (
    <div className="help-content">
      <h2>How to Use Rock Breaker Calculator</h2>
      <p className="help-intro">Select your user type to see a step-by-step guide:</p>

      <div className="user-modes-grid">
        <div className="mode-card" onClick={() => handleModeSelect('casual-single')}>
          <div className="mode-icon">◆</div>
          <h3>Casual User</h3>
          <p className="mode-subtitle">Single Ship Quick Check</p>
          <p className="mode-description">
            Quick check if your current ship can break the rock in front of you
          </p>
        </div>

        <div className="mode-card" onClick={() => handleModeSelect('casual-group')}>
          <div className="mode-icon">◆◆</div>
          <h3>Casual Group</h3>
          <p className="mode-subtitle">Multiple Ships</p>
          <p className="mode-description">
            Check if your group's combined power can break a rock
          </p>
        </div>

        <div className="mode-card" onClick={() => handleModeSelect('return-single')}>
          <div className="mode-icon">💾◆</div>
          <h3>Return User</h3>
          <p className="mode-subtitle">Single Ship with Saved Config</p>
          <p className="mode-description">
            Use saved ship configurations for quick rock assessment
          </p>
        </div>

        <div className="mode-card" onClick={() => handleModeSelect('return-group')}>
          <div className="mode-icon">💾◆◆</div>
          <h3>Return User</h3>
          <p className="mode-subtitle">Mining Group with Saved Config</p>
          <p className="mode-description">
            Load saved mining group configurations
          </p>
        </div>

        <div className="mode-card" onClick={() => handleModeSelect('trainer-single')}>
          <div className="mode-icon">🎓◆</div>
          <h3>Trainer Mode</h3>
          <p className="mode-subtitle">Single Ship Educational</p>
          <p className="mode-description">
            Teach mining mechanics and equipment effects
          </p>
        </div>

        <div className="mode-card" onClick={() => handleModeSelect('trainer-group')}>
          <div className="mode-icon">🎓◆◆</div>
          <h3>Trainer Mode</h3>
          <p className="mode-subtitle">Multi-Ship Educational</p>
          <p className="mode-description">
            Demonstrate group mining and crew coordination
          </p>
        </div>
      </div>
    </div>
  );

  const renderModeDetails = (mode: UserMode) => {
    const flows = {
      'casual-single': {
        title: 'Casual User - Single Ship Quick Check',
        subtitle: 'Quick check if your ship can break a rock',
        steps: [
          { title: 'Launch Application', desc: 'Application loads with Results tab active' },
          { title: 'Configure Ship (if needed)', desc: 'Click "Ship Setup" tab, select ship type, configure lasers and modules' },
          { title: 'Return to Results', desc: 'Click "Results" tab' },
          { title: 'Enter Rock Properties', desc: 'In left sidebar: enter Mass, Resistance, and optionally Instability' },
          { title: 'Add Gadgets (optional)', desc: 'In right sidebar: select up to 3 gadgets, toggle on/off as needed' },
          { title: 'Review Results', desc: 'Center display shows: Green "CAN BREAK" (>20% margin), Yellow "LOW MARGIN BREAK" (<20% margin), or Red "CANNOT BREAK"' },
          { title: 'Adjust if Needed', desc: 'Return to Ship Setup to modify equipment if needed' },
        ]
      },
      'casual-group': {
        title: 'Casual Group - Multiple Ships',
        subtitle: 'Check combined group mining power',
        steps: [
          { title: 'Launch Application', desc: 'Open Rock Breaker Calculator' },
          { title: 'Switch to Group Mode', desc: 'Ship Setup tab → Click "Mining Group" button' },
          { title: 'Add Ships to Group', desc: 'Click "Add Ship from Pool", configure each ship\'s equipment' },
          { title: 'Return to Results', desc: 'Click "Results" tab to see all ships' },
          { title: 'Enter Rock Properties', desc: 'Enter Mass and Resistance in left sidebar' },
          { title: 'Configure Gadgets', desc: 'Add all gadgets owned by group members in right sidebar' },
          { title: 'Review Combined Results', desc: 'See overall breaking power and individual contributions' },
          { title: 'Toggle Ships/Lasers', desc: 'Click ships to toggle active/inactive, click MOLE lasers for crew simulation' },
        ]
      },
      'return-single': {
        title: 'Return User - Single Ship with Saved Config',
        subtitle: 'Quickly load your standard ship setup',
        steps: [
          { title: 'Launch Application', desc: 'Last configuration loads automatically' },
          { title: 'Load Saved Config (if needed)', desc: 'Ship Setup tab → Saved Configurations → Click ↻ to load' },
          { title: 'Navigate to Results', desc: 'Click "Results" tab' },
          { title: 'Enter Rock Properties', desc: 'Enter Mass and Resistance in left sidebar' },
          { title: 'Review Results', desc: 'Check breaking capability in center display' },
          { title: 'Save New Config (optional)', desc: 'Ship Setup → "💾 Save Current" to save modifications' },
          { title: 'Export Config (optional)', desc: 'Click 📤 next to configuration to share or backup' },
        ]
      },
      'return-group': {
        title: 'Return User - Mining Group with Saved Config',
        subtitle: 'Load saved mining group configuration',
        steps: [
          { title: 'Launch Application', desc: 'Open Rock Breaker Calculator' },
          { title: 'Switch to Group Mode', desc: 'Ship Setup tab → "Mining Group" button' },
          { title: 'Load Saved Group', desc: 'Saved Mining Groups section → Click ↻ to load' },
          { title: 'Navigate to Results', desc: 'All group ships displayed in center view' },
          { title: 'Enter Rock Properties', desc: 'Enter Mass and Resistance in left sidebar' },
          { title: 'Adjust Active Ships', desc: 'Toggle ships/lasers based on crew availability' },
          { title: 'Check Gadgets', desc: 'Toggle gadgets on/off based on what crew brought' },
          { title: 'Update Group (if changed)', desc: 'Save modifications with "💾 Save Current Group"' },
        ]
      },
      'trainer-single': {
        title: 'Trainer Mode - Single Ship Educational',
        subtitle: 'Teach mining mechanics and equipment effects',
        steps: [
          { title: 'Set Up Demo', desc: 'Ship Setup → Single Ship → Choose Prospector for demonstration' },
          { title: 'Show Baseline', desc: 'Results tab → Enter sample rock (Mass: 25000, Resistance: 30)' },
          { title: 'Teach Laser Heads', desc: 'Change laser heads one by one, explain resistance modifiers (Klein-S1 = 0.55x, Helix = 0.7x)' },
          { title: 'Teach Modules', desc: 'Add modules (Surge, Stampede, Rieger), show real-time calculation updates' },
          { title: 'Teach Gadgets', desc: 'Add OptiMax (-30% resistance), Sabir (-50%), demonstrate toggling' },
          { title: 'Demo Edge Cases', desc: 'Show LOW MARGIN BREAK (<20% margin) and CANNOT BREAK scenarios' },
          { title: 'Practice Scenarios', desc: 'Have students try different rock values and choose equipment' },
          { title: 'Save Examples', desc: 'Create configurations: "Budget Build", "High Resist Setup", "Power Build"' },
        ]
      },
      'trainer-group': {
        title: 'Trainer Mode - Multi-Ship Educational',
        subtitle: 'Demonstrate group mining and coordination',
        steps: [
          { title: 'Switch to Group Mode', desc: 'Ship Setup → "Mining Group" button' },
          { title: 'Build Demo Group', desc: 'Add first ship, show insufficient power for high-resistance rock' },
          { title: 'Demo Group Synergy', desc: 'Add second ship, show combined power exceeds threshold' },
          { title: 'Teach Role Specialization', desc: 'Configure different roles: Power Ships (Helix+Surge), Resistance Ships (Klein-S1), Balanced Ships' },
          { title: 'Demo MOLE Operations', desc: 'Add MOLE, show full crew vs partial crew vs solo operation' },
          { title: 'Teach Gadget Distribution', desc: 'Show gadget pooling strategy, explain OptiMax/Sabir priority' },
          { title: 'Practice Coordination', desc: 'Have trainees toggle ships on/off, calculate minimum crew for breakability' },
          { title: 'Save Group Templates', desc: 'Save different compositions: "Full Org Op", "Small Team", "Duo Mining"' },
          { title: 'Advanced Scenarios', desc: 'Input progressively harder rocks, discuss trade-offs' },
        ]
      },
    };

    const flow = mode ? flows[mode] : null;
    if (!flow) return null;

    return (
      <div className="help-content help-details">
        <button className="back-button" onClick={handleBack}>
          ← Back to User Modes
        </button>
        <h2>{flow.title}</h2>
        <p className="flow-subtitle">{flow.subtitle}</p>

        <div className="flow-steps">
          {flow.steps.map((step, index) => (
            <div key={index} className="flow-step">
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="help-tips">
          <h3>Key Features</h3>
          <ul>
            <li><strong>Auto-Save:</strong> Configurations save automatically when switching tabs</li>
            <li><strong>Real-Time Calculations:</strong> Results update instantly as you change values</li>
            <li><strong>Toggle Functionality:</strong> Click gadgets, ships, and lasers to toggle on/off for "what if" scenarios</li>
            <li><strong>Color-Coded Results:</strong> Green (CAN BREAK, &gt;20% margin), Yellow (LOW MARGIN BREAK, &lt;20% margin), Red (CANNOT BREAK)</li>
          </ul>

          <h3>Resistance Scanning Setup</h3>
          <ResistanceHelpContent 
            headingLevel="h4"
            introText="The calculator needs to know how you scanned the rock's resistance to give accurate results. Choose the correct mode in the Resistance Mode selector above the resistance input."
          />
        </div>
      </div>
    );
  };

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        {selectedMode ? renderModeDetails(selectedMode) : renderModeSelection()}
      </div>
    </div>
  );
}
