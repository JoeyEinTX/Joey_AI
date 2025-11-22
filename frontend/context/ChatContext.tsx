import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useChatApi, ChatMetrics } from '../hooks/useChatApi';
import type { ChatMessage } from '../types';

interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  tps: number;
  model: string;
  contextUsedPct: number;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  isLoading: boolean;
  error: string | null;
  tokenStats: TokenStats | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const { sendMessage: apiSendMessage, isLoading, error } = useChatApi();

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Call backend API
      const response = await apiSendMessage(message);

      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update token stats from response metrics
      if (response.metrics) {
        setTokenStats({
          inputTokens: response.metrics.input_tokens || 0,
          outputTokens: response.metrics.output_tokens || 0,
          totalTokens: response.metrics.total_tokens || 0,
          latencyMs: response.metrics.latency_ms || 0,
          tps: response.metrics.tps || 0,
          model: response.metrics.model || 'unknown',
          contextUsedPct: response.metrics.context_used_pct || 0,
        });
      }
    } catch (err) {
      console.error('[ChatContext] Error sending message:', err);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'ai',
        text: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  }, [apiSendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTokenStats(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        clearMessages,
        isLoading,
        error,
        tokenStats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
