import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ifc': 'http://localhost:8000',
      '/templates': 'http://localhost:8000',
      '/execute': 'http://localhost:8000',
      '/download': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
