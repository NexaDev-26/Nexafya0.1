import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
  })],
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
          // DO NOT chunk React or Firebase separately - keep them in main bundle for synchronous loading
          // React and Firebase must load before components try to use them
          if (id.includes('firebase')) {
            return undefined; // Keep Firebase in main bundle
          }
          if (id.includes('react') || id.includes('react-dom')) {
            return undefined; // Keep React in main bundle - critical for hooks to work
          }
          if (id.includes('node_modules')) {
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
      onwarn(warning, warn) {
        // Suppress warnings about circular dependencies and eval
        if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'EVAL') {
          return;
        }
        warn(warning);
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (set to true for debugging)
    sourcemap: false,
    // Minify
    minify: 'esbuild',
    // Target modern browsers
    target: 'esnext',
    // Ensure common chunks are loaded synchronously
    commonjsOptions: {
      include: [/firebase/, /node_modules/],
    },
    // Ensure proper module resolution
    modulePreload: {
      polyfill: true,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'leaflet', 'lodash-es', 'zod'],
    exclude: [], // Don't exclude Firebase or React
    esbuildOptions: {
      target: 'esnext',
    },
  },
  // Ensure React and Firebase are treated as ESM and not split
  resolve: {
    dedupe: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
  },
})
