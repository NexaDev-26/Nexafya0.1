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
  // Exclude mobile folder from build
  publicDir: 'public',
  build: {
    // Exclude mobile folder and other non-web files
    rollupOptions: {
      external: (id) => {
        // Exclude React Native imports
        if (id.includes('react-native') || id.includes('@expo/vector-icons')) {
          return true;
        }
        return false;
      },
      output: {
        manualChunks: (id) => {
          // DO NOT chunk Firebase separately - keep it in main bundle for synchronous loading
          // Firebase must load before components try to use it
          if (id.includes('firebase')) {
            return undefined; // Keep Firebase in main bundle
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
    exclude: [], // Don't exclude Firebase
    esbuildOptions: {
      target: 'esnext',
    },
  },
  // Ensure Firebase is treated as ESM and not split
  resolve: {
    dedupe: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
  },
})
