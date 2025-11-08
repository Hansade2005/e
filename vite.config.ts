import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    strictPort: true, // Ensure port 3000 is used
    hmr: {
      host: 'localhost', // HMR host for development
    },
    cors: true, // Enable CORS for external access
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.e2b.app', // Allow all E2B sandbox domains
      '3000-*.e2b.app', // Allow E2B preview domains
    ],
  },
})