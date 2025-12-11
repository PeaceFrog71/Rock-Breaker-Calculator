/**
 * Shared resistance help content used by both ResistanceHelpModal and HelpModal
 * to avoid duplication and ensure consistency.
 */
interface ResistanceHelpContentProps {
  headingLevel?: 'h3' | 'h4';
  introText?: string;
}

export default function ResistanceHelpContent({ 
  headingLevel = 'h3',
  introText = 'The calculator needs to know how you scanned the rock\'s resistance to give accurate results. Choose the correct mode using the Base/Modified button.'
}: ResistanceHelpContentProps) {
  const HeadingTag = headingLevel;

  return (
    <>
      <p className="resistance-intro">
        {introText}
      </p>

      <div className="resistance-section">
        <HeadingTag>Base Resistance Mode</HeadingTag>
        <p>Use this when you scanned the rock from:</p>
        <ul>
          <li>MOLE cockpit (pilot seat scanner)</li>
          <li>Any ship with laser <em>out of range</em> of the rock</li>
          <li>Extraction mode</li>
        </ul>
        <p className="resistance-note">Base resistance shows the rock's natural resistance without any equipment modifiers.</p>
      </div>

      <div className="resistance-section">
        <HeadingTag>Modified Resistance Mode</HeadingTag>
        <p>Use this when you scanned the rock with a mining laser <em>in range</em>:</p>
        <ul>
          <li>The reading includes your laser head and module resistance modifiers</li>
          <li><strong>Select which laser scanned:</strong> Use the dropdown to pick the specific laser that was in range when scanning</li>
          <li>The calculator will "reverse" the modification to find the true base resistance</li>
        </ul>
        <p className="resistance-note">For MOLE with multiple turrets, select the turret that was pointed at the rock during the scan.</p>
      </div>

      <div className="resistance-section">
        <HeadingTag>Gadgets in Scan</HeadingTag>
        <p>Check this box if gadgets were <em>attached to the rock</em> when you scanned:</p>
        <ul>
          <li>Gadgets physically attach to rocks and modify their resistance directly</li>
          <li>This affects <em>both</em> Base and Modified resistance readings</li>
          <li>Toggle ON the specific gadgets that were on the rock during your scan</li>
          <li>The calculator will account for their effect when determining true resistance</li>
        </ul>
        <p className="resistance-note">If you're unsure, scan the rock before attaching any gadgets and use Base mode.</p>
      </div>
    </>
  );
}
