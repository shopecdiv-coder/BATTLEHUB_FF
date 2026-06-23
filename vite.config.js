import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// A custom resolver plugin to redirect all legacy Base44 entities and integrations imports to compatibility files.
const base44ResolverPlugin = {
  name: 'base44-resolver-plugin',
  resolveId(source) {
    if (source.startsWith('@/entities/')) {
      return path.resolve(__dirname, './src/api/entities.js');
    }
    if (source.startsWith('@/integrations/')) {
      return path.resolve(__dirname, './src/api/integrations.js');
    }
    return null;
  }
};

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [
    base44ResolverPlugin,
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});