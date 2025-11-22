import type { SystemStats, OllamaModel, ChatMessage, ChatSession, StreamChunk, TestScenario } from '../types';

// --- ENVIRONMENT VARIABLE HANDLING ---

const BASE_URL = import.meta.env.VITE_JOEY_BACKEND_URL as string;

// Enhanced debugging
console.log("[JoeyAI] Environment Check:");
console.log("  - import.meta.env:", import.meta.env);
console.log("  - VITE_JOEY_BACKEND_URL:", BASE_URL);
console.log("  - Type:", typeof BASE_URL);
console.log("  - Value:", BASE_URL || "(undefined/empty)");

if (!BASE_URL) {
  console.error("[JoeyAI] CRITICAL: Missing VITE_JOEY_BACKEND_URL in .env.local");
  console.error("[JoeyAI] Available env vars:", Object.keys(import.meta.env));
  throw new Error("Backend URL not configured");
}

console.log("[JoeyAI] ✅ Using Backend URL:", BASE_URL);

// --- API FUNCTIONS ---

export const getHealth = async (): Promise<{ status: 'ok' | 'error', active_model: string | null }> => {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    const data = await response.json();
    if (data.status === 'ok') {
      return { status: 'ok', active_model: data.active_model ?? null };
    } else {
      return { status: 'error', active_model: null };
    }
  } catch (error) {
    console.error('[JoeyAI] Health check error:', error);
    return { status: 'error', active_model: null };
  }
};

export const getSystemStats = async (): Promise<SystemStats> => {
  const response = await fetch(`${BASE_URL}/api/system/system_stats`);
  if (!response.ok) throw new Error(`Failed to fetch system stats: ${response.status}`);
  const json = await response.json();
  return {
    cpu_load: json.cpu_load ?? 0,
    gpu_load: json.gpu_load ?? 0,
    ram_usage: json.ram_used_gb ?? 0,
    ram_total: json.ram_total_gb ?? 0,
    gpu_mode: json.gpu_mode || 'MaxN'
  };
};

export const getModels = async (): Promise<OllamaModel[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/models`);
    if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('[JoeyAI] Failed to fetch models:', error);
    return [];
  }
};

export const setModel = async (modelName: string): Promise<{ success: boolean }> => {
  try {
    const response = await fetch(`${BASE_URL}/api/models/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName })
    });
    if (!response.ok) throw new Error(`Failed to set model: ${response.status}`);
    return { success: true };
  } catch (error) {
    console.error('[JoeyAI] Failed to set model:', error);
    throw error;
  }
};

// --- Chat Session API (Stubbed - Backend not yet implemented) ---

export const getChatSessions = async (): Promise<ChatSession[]> => {
  // TODO: Implement once backend supports chat sessions
  console.warn('[JoeyAI] Chat sessions not yet implemented in backend');
  return [];
};

export const createChatSession = async (): Promise<ChatSession> => {
  // TODO: Implement once backend supports chat sessions
  console.warn('[JoeyAI] Chat session creation not yet implemented in backend');
  const newSession: ChatSession = {
    id: `chat-${Date.now()}`,
    title: 'New Chat',
    created_at: new Date().toISOString(),
    messages: [],
  };
  return newSession;
};

export const deleteChatSession = async (id: string): Promise<{ success: boolean }> => {
  // TODO: Implement once backend supports chat sessions
  console.warn('[JoeyAI] Chat session deletion not yet implemented in backend');
  return { success: true };
};

export async function* postChatMessageStream(
  chatId: string, 
  message: string, 
  testScenario: TestScenario = 'normal'
): AsyncGenerator<StreamChunk, void, unknown> {
  // TODO: Implement once backend supports streaming chat
  console.warn('[JoeyAI] Chat streaming not yet implemented in backend');
  const response = 'Chat functionality is not yet available. Please wait for backend implementation.';
  const words = response.split(' ');
  for (const word of words) {
    yield word + ' ';
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

export const restartBackend = async (): Promise<{ success: boolean }> => {
  try {
    const response = await fetch(`${BASE_URL}/api/system/restart`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error(`Failed to restart backend: ${response.status}`);
    return { success: true };
  } catch (error) {
    console.error('[JoeyAI] Failed to restart backend:', error);
    throw error;
  }
};

export const reloadModels = async (): Promise<{ success: boolean }> => {
  try {
    const response = await fetch(`${BASE_URL}/api/models/reload`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error(`Failed to reload models: ${response.status}`);
    return { success: true };
  } catch (error) {
    console.error('[JoeyAI] Failed to reload models:', error);
    throw error;
  }
};

export async function sendChatMessage(message: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/chats/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return {
      reply: data.reply || data.message || data.output || "(no reply)",
      metrics: data.metrics || {}
    };

  } catch (err) {
    console.error('sendChatMessage error:', err);
    throw err;
  }
}
