import React, { useState, useRef, useEffect } from 'react';
import { canvasStore } from '../stores/CanvasStore';
import './ViewMenu.css';

export const ViewMenu: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="view-menu-container" ref={menuRef}>
      <button 
        className="view-button"
        onClick={() => setShowMenu(!showMenu)}
      >
        View
        {showMenu && (
          <div className="view-dropdown">
            <div className="menu-item" onClick={() => {
              canvasStore.toggleKeyboardHelp();
              setShowMenu(false);
            }}>
              Toggle Help
            </div>
          </div>
        )}
      </button>
    </div>
  );
}; 