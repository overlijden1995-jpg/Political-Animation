import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Remotion Studio is powered by Vite under the hood. This config lets the
// `remotion studio` dev server resolve the workspace aliases and allows the
// Arena live-preview proxy to reach it from a foreign origin.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    strictPort: true,
    watch: {
      // Ignore generated asset manifests and render outputs
      ignored: ['**/out/**', '**/assets/generated/**', '**/node_modules/**'],
    },
  },
});
