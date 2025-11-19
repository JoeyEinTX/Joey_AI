
import React, { useState } from 'react';
import { AppContextProvider } from './context/AppContext';
import RightDrawer from './components/layout/RightDrawer';
import Dashboard from './components/views/Dashboard';
import Chat from './components/views/Chat';
import Models from './components/views/Models';
import System from './components/views/System';
import Settings from './components/views/Settings';
import type { View } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSetView = (view: View) => {
    setCurrentView(view);
    setIsDrawerOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'chat':
        return <Chat />;
      case 'models':
        return <Models />;
      case 'system':
        return <System />;
      case 'settings':
        return <Settings />;
      default:
        return <Chat />;
    }
  };

  return (
    <AppContextProvider>
      <div className="relative h-screen bg-joey-main font-sans text-joey-text overflow-hidden">
        <header className="absolute top-4 right-4 z-30">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-full bg-joey-secondary/50 hover:bg-joey-secondary transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
        </header>

        <main className="h-full overflow-y-auto">
          <div className={`h-full ${currentView !== 'chat' ? 'p-4 md:p-8' : ''}`}>
            {renderView()}
          </div>
        </main>
        
        <RightDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentView={currentView}
          setCurrentView={handleSetView}
        />
      </div>
    </AppContextProvider>
  );
};

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

export default App;
