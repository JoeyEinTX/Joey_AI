import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUI } from '../../context/UIContext';

const Sidebar: React.FC = () => {
  const { isSidebarOpen, closeSidebar } = useUI();

  const navItems = [
    { path: '/', label: 'Chat', icon: '💬' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/models', label: 'Models', icon: '🤖' },
    { path: '/system', label: 'System', icon: '⚙️' },
    { path: '/settings', label: 'Settings', icon: '🔧' },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          w-64 bg-joey-secondary
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
        `}
      >
        <div className="p-4 border-b border-joey-accent">
          <h1 className="text-2xl font-bold text-joey-accent">Joey AI</h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={closeSidebar}
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

        <div className="p-4 border-t border-joey-accent">
          <p className="text-sm text-joey-text/60">v0.1.0</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
