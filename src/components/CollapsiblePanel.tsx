import { useState } from 'react';
import './CollapsiblePanel.css';

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsiblePanel({
  title,
  children,
  defaultOpen = false,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-panel ${isOpen ? 'open' : 'collapsed'}`}>
      <button
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
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
