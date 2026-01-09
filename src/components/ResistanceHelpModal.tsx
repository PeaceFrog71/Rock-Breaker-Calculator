import { createPortal } from 'react-dom';
import './ResistanceHelpModal.css';
import ResistanceHelpContent from './ResistanceHelpContent';

interface ResistanceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResistanceHelpModal({ isOpen, onClose }: ResistanceHelpModalProps) {
  if (!isOpen) return null;

  // Use portal to render at body level, escaping any parent transform contexts
  return createPortal(
    <div className="resistance-help-overlay" onClick={onClose}>
      <div className="resistance-help-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>

        <h2>Resistance Scanning Setup</h2>
        <ResistanceHelpContent />
      </div>
    </div>,
    document.body
  );
}
