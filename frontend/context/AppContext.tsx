
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { SystemStats, OllamaModel, BackendStatus, Theme, ChatSession } from '../types';
import * as api from '../services/apiService';

interface AppContextType {
  systemStats: SystemStats | null;
  backendStatus: BackendStatus;
  models: OllamaModel[];
  selectedModel: string | null;
  setSelectedModel: (modelName: string) => void;
  isLoadingModels: boolean;
  fetchModels: () => Promise<void>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Chat Session State
  chatSessions: ChatSession[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: () => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  isLoadingSessions: boolean;
  updateChatSessionTitle: (id: string, title: string) => void;

  // Developer Mode
  isDeveloperMode: boolean;
  setIsDeveloperMode: (enabled: boolean) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModelInternal] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('joey-ai-theme') as Theme) || 'neon-cyber';
  });
  const [isDeveloperMode, setIsDeveloperModeState] = useState<boolean>(() => {
    return localStorage.getItem('joey-ai-dev-mode') === 'true';
  });

  // state for chat sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('joey-ai-theme', newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  const setIsDeveloperMode = (enabled: boolean) => {
    setIsDeveloperModeState(enabled);
    localStorage.setItem('joey-ai-dev-mode', String(enabled));
  };
  
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);


  const checkHealth = useCallback(async () => {
    try {
      const health = await api.getHealth();
      setBackendStatus(health.status === 'ok' ? 'connected' : 'disconnected');
      if (health.status === 'ok' && health.active_model) {
        setSelectedModelInternal(health.active_model);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setBackendStatus('disconnected');
    }
  }, []);

  const fetchSystemStats = useCallback(async () => {
    if (backendStatus !== 'connected') return;
    try {
      const stats = await api.getSystemStats();
      setSystemStats(stats);
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
      setBackendStatus('disconnected');
    }
  }, [backendStatus]);

  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const fetchedModels = await api.getModels();
      setModels(fetchedModels);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const setSelectedModel = useCallback(async (modelName: string) => {
    try {
      await api.setModel(modelName);
      setSelectedModelInternal(modelName);
    } catch (error) {
      console.error(`Failed to set model ${modelName}:`, error);
    }
  }, []);
  
  // --- Chat Session Management ---
  const fetchChatSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
        const sessions = await api.getChatSessions();
        setChatSessions(sessions);
        if (!currentChatId && sessions.length > 0) {
            setCurrentChatId(sessions[0].id);
        }
    } catch (error) {
        console.error('Failed to fetch chat sessions:', error);
    } finally {
        setIsLoadingSessions(false);
    }
  }, [currentChatId]);

  const createNewChat = useCallback(async () => {
      try {
          const newSession = await api.createChatSession();
          setChatSessions(prev => [newSession, ...prev]);
          setCurrentChatId(newSession.id);
      } catch (error) {
          console.error('Failed to create new chat:', error);
      }
  }, []);

  const deleteChat = useCallback(async (id: string) => {
    try {
        await api.deleteChatSession(id);
        setChatSessions(prev => prev.filter(s => s.id !== id));
        if (currentChatId === id) {
            const remainingSessions = chatSessions.filter(s => s.id !== id);
            setCurrentChatId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
        }
    } catch (error) {
        console.error('Failed to delete chat:', error);
    }
  }, [currentChatId, chatSessions]);

  const updateChatSessionTitle = useCallback((id: string, title: string) => {
    setChatSessions(prev =>
      prev.map(session =>
        session.id === id ? { ...session, title } : session
      )
    );
  }, []);


  useEffect(() => {
    checkHealth();
    fetchChatSessions();
    const healthInterval = setInterval(checkHealth, 10000);
    return () => clearInterval(healthInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (backendStatus === 'connected') {
      fetchSystemStats();
      const statsInterval = setInterval(fetchSystemStats, 3000);
      return () => clearInterval(statsInterval);
    }
  }, [backendStatus, fetchSystemStats]);

  const value = useMemo(() => ({
    systemStats,
    backendStatus,
    models,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    fetchModels,
    theme,
    setTheme,
    chatSessions,
    currentChatId,
    setCurrentChatId,
    createNewChat,
    deleteChat,
    isLoadingSessions,
    updateChatSessionTitle,
    isDeveloperMode,
    setIsDeveloperMode,
  }), [systemStats, backendStatus, models, selectedModel, setSelectedModel, isLoadingModels, fetchModels, theme, chatSessions, currentChatId, createNewChat, deleteChat, isLoadingSessions, updateChatSessionTitle, isDeveloperMode, setIsDeveloperMode]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
