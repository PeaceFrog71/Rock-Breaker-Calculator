import { useState } from 'react';
import './CollapsiblePanel.css';

interface CollapsiblePanelProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  // Controlled mode props
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function CollapsiblePanel({
  title,
  children,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
}: CollapsiblePanelProps) {
  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  // Use controlled mode if isOpen prop is provided
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalOpen(!internalOpen);
    }
  };

  return (
    <div className={`collapsible-panel ${isOpen ? 'open' : 'collapsed'}`}>
      <button
        className="collapsible-header"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-arrow">{isOpen ? '▼' : '▶'}</span>
      </button>
      <div className="collapsible-content">
        {children}
      </div>
    </div>
  );
}
