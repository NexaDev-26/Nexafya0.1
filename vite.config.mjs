import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    // No proxy needed - Firebase is client-side only
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ui-vendor': ['lucide-react'],
          'utils-vendor': ['lodash-es', 'zod'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
    // Minify
    minify: 'esbuild',
    // Target modern browsers
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['leaflet', 'lodash-es', 'zod'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
