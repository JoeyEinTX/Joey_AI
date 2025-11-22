import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  isSidebarOpen: boolean;
  isSlideoutOpen: boolean;
  toggleSidebar: () => void;
  toggleSlideout: () => void;
  closeSidebar: () => void;
  closeSlideout: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSlideoutOpen, setIsSlideoutOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const toggleSlideout = () => setIsSlideoutOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const closeSlideout = () => setIsSlideoutOpen(false);

  return (
    <UIContext.Provider
      value={{
        isSidebarOpen,
        isSlideoutOpen,
        toggleSidebar,
        toggleSlideout,
        closeSidebar,
        closeSlideout,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
