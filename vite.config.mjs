import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '0.0.0.0', // Listen on all network interfaces
    strictPort: false, // Try next available port if 5174 is taken
    // No proxy needed - Firebase is client-side only
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Keep Firebase together to avoid async loading issues
          if (id.includes('firebase')) {
            return 'firebase-vendor';
          }
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('lodash') || id.includes('zod')) {
              return 'utils-vendor';
            }
            return 'vendor';
          }
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
    // Ensure common chunks are loaded synchronously
    commonjsOptions: {
      include: [/firebase/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'leaflet', 'lodash-es', 'zod'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
