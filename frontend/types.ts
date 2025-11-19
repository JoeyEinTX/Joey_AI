
export interface SystemStats {
  cpu_load: number;
  gpu_load: number;
  ram_usage: number;
  ram_total: number;
  gpu_mode: 'MaxN' | 'Standard';
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface ChatMessage {
  id?: string; // Optional, can be useful for keys
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  messages: ChatMessage[];
}

export type BackendStatus = 'connected' | 'disconnected' | 'loading';

export type View = 'dashboard' | 'chat' | 'models' | 'system' | 'settings';

export type Theme = 'neon-cyber' | 'classic-dark' | 'light';

export type StreamChunk = string | { type: 'titleUpdate'; title: string };

export type TestScenario = 'normal' | 'error' | 'long' | 'code' | 'no-response';
