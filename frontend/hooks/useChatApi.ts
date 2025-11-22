import { useState, useCallback } from 'react';
import { sendChatMessage, getModels } from '../services/apiService';
import type { OllamaModel } from '../types';

export interface ChatMetrics {
  latency_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  tps?: number;
  model?: string;
  context_used_pct?: number;
}

export interface ChatResponse {
  reply: string;
  metrics: ChatMetrics;
}

export interface UseChatApiReturn {
  sendMessage: (message: string) => Promise<ChatResponse>;
  getAvailableModels: () => Promise<OllamaModel[]>;
  isLoading: boolean;
  error: string | null;
}

export const useChatApi = (): UseChatApiReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string): Promise<ChatResponse> => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage(message);
      setIsLoading(false);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const getAvailableModels = useCallback(async (): Promise<OllamaModel[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const models = await getModels();
      setIsLoading(false);
      return models;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch models';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  return {
    sendMessage,
    getAvailableModels,
    isLoading,
    error,
  };
};
