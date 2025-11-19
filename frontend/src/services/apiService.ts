// Determine BASE_URL with priority: env var -> built site -> error
let BASE_URL: string;
const viteEnv = (import.meta as any).env?.VITE_JOEY_BACKEND_URL;

if (viteEnv) {
  BASE_URL = viteEnv;
} else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  BASE_URL = window.location.origin;
} else {
  throw new Error('Backend URL not configured. Set VITE_JOEY_BACKEND_URL or run on a built site with valid hostname.');
}

// API Response types
export interface HealthResponse {
  ollama: {
    ok: boolean;
    base: string;
  };
}

export interface SystemStatsResponse {
  cpu: number;
  memory: number;
  gpu?: number;
  cpu_temp?: number;
  gpu_temp?: number;
  power_draw?: number;
  tokens_per_sec?: number;
  context_used?: string;
  model: string;
  latency: number;
  status: string;
}

export interface ModelsResponse {
  ollama?: string[];
  anthropic?: string[];
}

export interface ChatResponse {
  id: number;
  title?: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  last_message?: {
    content: string;
    snippet: string;
  };
}

export interface MessageRequest {
  content: string;
  temperature?: number;
  model?: string;
}

export interface SetModelRequest {
  model: string;
}

// API Service Functions

export const apiService = {
  async validateBackendConnection(): Promise<boolean> {
    try {
      await this.health();
      return true;
    } catch (error) {
      console.error('Backend connection validation failed:', error);
      return false;
    }
  },

  async health(): Promise<HealthResponse> {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  async systemStats(): Promise<SystemStatsResponse> {
    const response = await fetch(`${BASE_URL}/api/system_stats`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  async models(): Promise<ModelsResponse> {
    const response = await fetch(`${BASE_URL}/api/models`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  async setModel(request: SetModelRequest): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/set_model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: request.model }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  },

  async chats(): Promise<ChatResponse[]> {
    const response = await fetch(`${BASE_URL}/api/chats`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  async createChat(): Promise<ChatResponse> {
    const response = await fetch(`${BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  async deleteChat(id: string | number): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/chats/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  },

  async sendMessage(
    chatId: string | number,
    request: MessageRequest,
    onChunk?: (chunk: string) => void,
    onComplete?: () => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const abortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
    }

    const response = await fetch(`${BASE_URL}/api/chats/${chatId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    if (!onChunk) {
      // Non-streaming mode - not implemented in requirements, but keeping for completeness
      return;
    }

    // Streaming mode
    console.log("[JoeyAI] Stream started…");
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              console.log("[JoeyAI] Stream ended.");
              onComplete?.();
              return;
            }
            console.log("[JoeyAI] Chunk:", data);
            onChunk(data);
          }
        }
      }
      console.log("[JoeyAI] Stream ended.");
      onComplete?.();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Streaming aborted');
      } else {
        throw error;
      }
    }
  },
};
