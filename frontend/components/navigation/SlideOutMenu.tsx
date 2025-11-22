import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUI } from '../../context/UIContext';

const SlideOutMenu: React.FC = () => {
  const { isSlideoutOpen, closeSlideout } = useUI();

  const menuItems = [
    { path: '/', label: 'Chat', icon: '💬' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/models', label: 'Models', icon: '🤖' },
    { path: '/system', label: 'System', icon: '⚙️' },
    { path: '/settings', label: 'Settings', icon: '🔧' },
  ];

  return (
    <>
      {/* Overlay */}
      {isSlideoutOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={closeSlideout}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 bg-joey-secondary z-50
          transform transition-transform duration-300 ease-in-out
          ${isSlideoutOpen ? 'translate-x-0' : 'translate-x-full'}
          shadow-2xl flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-joey-accent flex items-center justify-between">
          <h3 className="text-xl font-bold text-joey-accent">Menu</h3>
          <button
            onClick={closeSlideout}
            className="p-2 rounded-lg hover:bg-joey-accent/20 transition-colors"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={closeSlideout}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-joey-accent text-joey-main'
                        : 'hover:bg-joey-accent/20'
                    }`
                  }
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-joey-accent">
          <p className="text-sm text-joey-text/60">
            Joey AI v0.1.0
          </p>
          <p className="text-xs text-joey-text/40 mt-1">
            Backend: {import.meta.env.VITE_JOEY_BACKEND_URL || 'Not configured'}
          </p>
        </div>
      </div>
    </>
  );
};

const CloseIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export default SlideOutMenu;
