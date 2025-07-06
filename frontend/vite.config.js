// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { // Add this server configuration
    proxy: {
      // String shorthand: '/api' -> 'http://localhost:5001/api'
      '/api': {
        target: 'http://localhost:5001', // Your backend server address
        changeOrigin: true,
        // Optional: Remove '/api' prefix when forwarding request
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})