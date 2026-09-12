import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    host: true,
    watch: {
      ignored: ['**/users*.csv', '**/*.csv', '**/*.mjs']
    }
  },
  build: {
    sourcemap: false, // Phase 10: Block source maps to prevent code theft
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          ui: ['lucide-react', 'framer-motion', 'clsx', 'tailwind-merge'],
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'], // Phase 10: Remove all console.logs in production
  }
});