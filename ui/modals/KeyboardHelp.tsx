import React, { useState, useRef } from 'react';
import './KeyboardHelp.css';

interface KeyboardHelpProps {
  onClose: () => void;
}

interface Shortcut {
  keyText: string;
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: Shortcut[];
  grid?: boolean;
  className?: string;
}

const ShortcutRow = ({ keyText, description }: Shortcut) => (
  <div className="shortcut-row">
    <span className="key">{keyText}</span>
    <span className="description">{description}</span>
  </div>
);

const ShortcutSection = ({ title, shortcuts, grid, className }: ShortcutSection) => (
  <div className={`shortcut-section ${className || ''}`}>
    <div className="shortcut-title">{title}</div>
    <div className={grid ? "shortcut-grid" : ""}>
      {shortcuts.map((shortcut, i) => (
        <ShortcutRow key={i} {...shortcut} />
      ))}
    </div>
  </div>
);

export const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ onClose }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const sections: ShortcutSection[] = [
    { title: "NodeTypes", grid: true, className: "node-type-section", shortcuts: [
        { keyText: "d", description: "Decision" },
        { keyText: "o", description: "Option" },
        { keyText: "p", description: "Pro" },
        { keyText: "c", description: "Con" },
        { keyText: "n", description: "Note" },
    ]},
    { title: "Edit:", shortcuts: [
        { keyText: "Ctrl + m, <letter from 'NodeTypes'>", description: "Make new node" },
        { keyText: "Ctrl + e", description: "Edit (re-press to save)" },
        { keyText: "Ctrl + d", description: "Delete currently selected node & children" },
    ]},
    { title: "Navigation:", grid: true, shortcuts: [
        { keyText: "j", description: "Down" },
        { keyText: "k", description: "Up" },
        { keyText: "h", description: "Right" },
        { keyText: "l", description: "Left" }
    ]},
    { title: "Mouse", shortcuts: [
        { keyText: "click + drag", description: "Move around" },
        { keyText: "click anywhere", description: "Deselect node" },
        { keyText: "click node + drag", description: "Move node layout" },
        { keyText: "right click node", description: "Node options - ex. change relationships" },
    ]},
  ];

  return (
    <div 
      className="keyboard-help-container"
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <div className="keyboard-help-modal">
        <div 
          className="keyboard-help-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <span>Keyboard Shortcut Help</span>
          <span className="keyboard-help-close" onClick={onClose}>×</span>
        </div>
        <div className="keyboard-help-content">
          {sections.map((section, i) => (
            <ShortcutSection key={i} {...section} />
          ))}
        </div>
      </div>
    </div>
  );
}; 