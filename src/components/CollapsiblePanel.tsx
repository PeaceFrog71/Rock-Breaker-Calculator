import { useState, useRef, useEffect } from 'react';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(false);

  // Use controlled mode if isOpen prop is provided
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  // Scroll panel into view when it opens
  useEffect(() => {
    if (isOpen && !prevOpenRef.current && panelRef.current) {
      // Small delay to let the expand animation start
      const timer = setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalOpen(!internalOpen);
    }
  };

  return (
    <div ref={panelRef} className={`collapsible-panel ${isOpen ? 'open' : 'collapsed'}`}>
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
