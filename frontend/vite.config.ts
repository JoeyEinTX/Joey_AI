import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file from the current directory (frontend/)
    const env = loadEnv(mode, process.cwd(), '');
    
    // Debug: Log environment variable loading
    console.log('[Vite Config] Loading env from:', process.cwd());
    console.log('[Vite Config] Mode:', mode);
    console.log('[Vite Config] VITE_JOEY_BACKEND_URL:', env.VITE_JOEY_BACKEND_URL);
    
    return {
      envPrefix: "VITE_",
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
