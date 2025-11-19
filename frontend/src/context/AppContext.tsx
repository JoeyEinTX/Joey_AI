import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

type BackendStatus = 'loading' | 'ok' | 'error';

interface AppContextType {
  backendStatus: BackendStatus;
}

const AppContext = createContext<AppContextType>({
  backendStatus: 'loading',
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiService.health();
        setBackendStatus('ok');
      } catch (error) {
        console.error('Backend health check failed:', error);
        setBackendStatus('error');
      }
    };

    checkBackend();
  }, []);

  return (
    <AppContext.Provider value={{ backendStatus }}>
      {children}
    </AppContext.Provider>
  );
};
