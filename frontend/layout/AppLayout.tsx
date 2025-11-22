import React from 'react';
import { Outlet } from 'react-router-dom';
import { UIProvider } from '../context/UIContext';
import { AppContextProvider } from '../context/AppContext';
import { ChatProvider } from '../context/ChatContext';
import Sidebar from '../components/navigation/Sidebar';
import TopBar from '../components/navigation/TopBar';
import SlideOutMenu from '../components/navigation/SlideOutMenu';
import TokenBar from '../components/status/TokenBar';

const AppLayout: React.FC = () => {
  return (
    <UIProvider>
      <AppContextProvider>
        <ChatProvider>
          <div className="relative h-screen bg-joey-main font-sans text-joey-text overflow-hidden flex">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar */}
            <TopBar />
            
            {/* Page content */}
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
            
            {/* Token bar at bottom */}
            <TokenBar />
          </div>
          
          {/* Slide-out menu overlay */}
          <SlideOutMenu />
        </div>
        </ChatProvider>
      </AppContextProvider>
    </UIProvider>
  );
};

export default AppLayout;
