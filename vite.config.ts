import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  const apiKey = env.GEMINI_API_KEY || env.API_KEY || env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
      console.warn("⚠️  WARNING: GEMINI_API_KEY is missing from environment. The APK will not have AI features.");
  }
  return {
    plugins: [react()],
    base: './',
    define: {
      // Map the Vercel variable (GEMINI_API_KEY) or local variable (API_KEY) to the code's expected variable
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});