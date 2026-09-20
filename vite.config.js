import path from 'node:path';
import { fileURLToPath } from 'node:url';
import base44 from '@base44/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Windows/Brave: host "localhost" binds IPv6-only (::1); WS then flakes.
    // Pin IPv4 so HTTP + HMR WebSocket share the same reachable endpoint.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 5173,
      clientPort: 5173
    }
  },
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: false,
      navigationNotifier: false,
      analyticsTracker: false,
      visualEditAgent: false
    }),
    react()
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Base44 Deno functions use npm:pkg@version; remap for Vite/browser.
      { find: /^npm:zod(@.*)?$/, replacement: 'zod' },
      { find: /^npm:haversine-distance(@.*)?$/, replacement: 'haversine-distance' }
    ],
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    // Ensure pdf.js is prebundled so first PDF upload does not race a cold dep optimize.
    include: ['pdfjs-dist']
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['pdf-lib', '@pdf-lib/fontkit', 'pdfjs-dist'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion', 'lucide-react'],
          'vendor-graph': ['graphology', 'graphology-metrics', 'geolib']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    // Vitest cannot bundle node:test — root tests/*.test.js run via npm test (node --test).
    include: ['tests/components/**/*.{test,spec}.{jsx,tsx}'],
    exclude: ['node_modules', 'dist']
  }
});
