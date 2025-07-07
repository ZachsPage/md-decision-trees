import React, { useState } from 'react';
import './NodeContextMenu.css';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeType: string;
  onClose: () => void;
  onMakeProFor: () => void;
  onMakeConFor: () => void;
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  x,
  y,
  nodeType,
  onClose,
  onMakeProFor,
  onMakeConFor,
}) => {
  const [showSubmenu, setShowSubmenu] = useState(false);

  // Only show for Pro or Con nodes
  if (nodeType !== 'pro' && nodeType !== 'con') {
    return null;
  }

  return (
    <div 
      className="node-context-menu"
      style={{ 
        position: 'absolute',
        left: x,
        top: y,
        zIndex: 1000
      }}
    >
      <div 
        className="menu-item"
        onMouseEnter={() => setShowSubmenu(true)}
        onMouseLeave={() => setShowSubmenu(false)}
      >
        Add relationship...
        {showSubmenu && (
          <div className="submenu">
            <div className="submenu-item" onClick={onMakeProFor}>
              Make Pro for...
            </div>
            <div className="submenu-item" onClick={onMakeConFor}>
              Make Con for...
            </div>
          </div>
        )}
      </div>
      <div className="menu-item" onClick={onClose}>
        Cancel
      </div>
    </div>
  );
};

export default NodeContextMenu; 