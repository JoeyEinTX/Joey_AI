
import type { SystemStats, OllamaModel, ChatMessage, ChatSession, StreamChunk, TestScenario } from '../types';

// --- ENVIRONMENT VARIABLE HANDLING ---

const BASE_URL = import.meta.env.VITE_JOEY_BACKEND_URL;

if (!BASE_URL) {
  console.warn("[JoeyAI] Missing backend URL in .env.local");
}

// --- MOCK DATA & SIMULATION ---

const MOCK_DELAY = 500; // ms

let mockModels: OllamaModel[] = [
  { name: 'qwen2:7b', modified_at: '2024-07-29T10:00:00Z', size: 7_000_000_000 },
  { name: 'phi3:mini', modified_at: '2024-07-28T12:00:00Z', size: 3_800_000_000 },
  { name: 'codellama:7b', modified_at: '2024-07-27T14:00:00Z', size: 7_000_000_000 },
  { name: 'llama3.1:8b', modified_at: '2024-07-29T16:00:00Z', size: 8_000_000_000 },
];

let activeModel: string | null = 'phi3:mini';
let isBackendHealthy = true;

let mockChatSessions: ChatSession[] = [
    { 
        id: 'chat-1', 
        title: 'Jetson Orin Nano Specs', 
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        messages: [
            { sender: 'user', text: 'Tell me about the Jetson Orin Nano.', timestamp: new Date(Date.now() - 86300000).toISOString() },
            { sender: 'ai', text: 'The Jetson Orin Nano is a powerful single-board computer designed for AI and robotics applications.', timestamp: new Date(Date.now() - 86200000).toISOString() },
        ]
    },
    { 
        id: 'chat-2', 
        title: 'Python Flask Example', 
        created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        messages: []
    }
];


const simulateDelay = <T,>(data: T): Promise<T> => 
  new Promise(resolve => setTimeout(() => resolve(data), MOCK_DELAY));

// --- API FUNCTIONS ---

export const getHealth = async (): Promise<{ status: 'ok' | 'error', active_model: string | null }> => {
  if (!isBackendHealthy) throw new Error("Backend is down");
  return simulateDelay({ status: 'ok', active_model: activeModel });
};

export const getSystemStats = async (): Promise<SystemStats> => {
  const stats: SystemStats = {
    cpu_load: Math.random() * 100,
    gpu_load: Math.random() * 100,
    ram_usage: Math.random() * 16,
    ram_total: 16,
    gpu_mode: 'MaxN',
  };
  return simulateDelay(stats);
};

export const getModels = async (): Promise<OllamaModel[]> => simulateDelay(mockModels);

export const setModel = async (modelName: string): Promise<{ success: boolean }> => {
  if (mockModels.some(m => m.name === modelName)) {
    activeModel = modelName;
    return simulateDelay({ success: true });
  }
  throw new Error("Model not found");
};

// --- Chat Session API ---
export const getChatSessions = async (): Promise<ChatSession[]> => {
    return simulateDelay(mockChatSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
};

export const createChatSession = async (): Promise<ChatSession> => {
    const newSession: ChatSession = {
        id: `chat-${Date.now()}`,
        title: 'New Chat',
        created_at: new Date().toISOString(),
        messages: [],
    };
    mockChatSessions.push(newSession);
    return simulateDelay(newSession);
};

export const deleteChatSession = async (id: string): Promise<{ success: boolean }> => {
    mockChatSessions = mockChatSessions.filter(s => s.id !== id);
    return simulateDelay({ success: true });
};


export async function* postChatMessageStream(chatId: string, message: string, testScenario: TestScenario = 'normal'): AsyncGenerator<StreamChunk, void, unknown> {
  const session = mockChatSessions.find(s => s.id === chatId);
  if (!session) {
    throw new Error('Chat session not found');
  }

  const userMessage: ChatMessage = { sender: 'user', text: message, timestamp: new Date().toISOString() };
  session.messages.push(userMessage);

  // Auto-title the chat if it's the first message and the title is generic
  if (session.messages.length === 1 && session.title === 'New Chat') {
    let newTitle = message.split(' ').slice(0, 5).join(' ');
    if (message.length > newTitle.length || message.split(' ').length > 5) newTitle += '...';
    newTitle = newTitle.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    session.title = newTitle;
    yield { type: 'titleUpdate', title: newTitle };
  }

  let responseText = '';
  switch (testScenario) {
    case 'error':
      throw new Error("Simulated backend error.");
    
    case 'long':
      responseText = "This is a simulated long response to test the UI's ability to handle a large amount of text and proper scrolling. ".repeat(20) + "The content will continue to stream, making sure that the container overflows correctly and that the user can still interact with the application without performance degradation. This is crucial for a good user experience, especially when models generate verbose explanations or large code snippets. We need to check for jank, smoothness of scrolling, and overall responsiveness during this streaming process. The end of the long message is now approaching.";
      break;
    
    case 'code':
      responseText = `Sure, here is a Python script for a simple web server:
\`\`\`python
import http.server
import socketserver

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()
\`\`\`
This script uses Python's built-in libraries to create a minimal web server.`;
      break;

    case 'no-response':
      await new Promise(resolve => setTimeout(resolve, 10000)); // Simulate a 10s timeout
      responseText = "Sorry for the delay! I was busy thinking. Here is your response.";
      break;

    case 'normal':
    default:
      if (!activeModel) {
        responseText = "Error: No model is currently selected. Please select a model from the Models tab.";
      } else {
        responseText = `This is a simulated streaming response about "${message}". The active model is **${activeModel}**.
  
Here is a code block:
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet("Joey_AI");
\`\`\`

Streaming allows for a much better user experience, doesn't it?`;
      }
      break;
  }

  const aiMessage: ChatMessage = { sender: 'ai', text: '', timestamp: new Date().toISOString() };
  session.messages.push(aiMessage);

  const words = responseText.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = words[i] + (i === words.length - 1 ? '' : ' ');
    yield chunk;
    aiMessage.text += chunk;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

export const restartBackend = async (): Promise<{ success: boolean }> => {
    isBackendHealthy = false;
    setTimeout(() => { isBackendHealthy = true; }, 5000);
    return simulateDelay({ success: true });
};

export const reloadModels = async (): Promise<{ success: boolean }> => {
    mockModels.push({
        name: `new-model:${Date.now().toString().slice(-4)}`,
        modified_at: new Date().toISOString(),
        size: 5_000_000_000
    });
    return simulateDelay({ success: true });
};
