import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    // No proxy needed - Firebase is client-side only
  },
  optimizeDeps: {
    include: ['leaflet'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
