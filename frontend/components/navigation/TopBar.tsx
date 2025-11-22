import React from 'react';
import { useUI } from '../../context/UIContext';

const TopBar: React.FC = () => {
  const { toggleSidebar, toggleSlideout } = useUI();

  return (
    <header className="bg-joey-secondary border-b border-joey-accent px-4 py-3 flex items-center justify-between">
      {/* Mobile menu button (left side) */}
      <button
        onClick={toggleSidebar}
        className="md:hidden p-2 rounded-lg hover:bg-joey-accent/20 transition-colors"
        aria-label="Toggle sidebar"
      >
        <MenuIcon />
      </button>

      {/* Title */}
      <h2 className="text-lg font-semibold text-joey-accent">Joey AI Assistant</h2>

      {/* Settings/Menu button (right side) */}
      <button
        onClick={toggleSlideout}
        className="p-2 rounded-lg hover:bg-joey-accent/20 transition-colors"
        aria-label="Open menu"
      >
        <SettingsIcon />
      </button>
    </header>
  );
};

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
    />
  </svg>
);

export default TopBar;
