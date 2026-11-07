import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Two front doors share this config:
//   • `npm run deck`  → the presentation player in `deck/` (repo-root index.html)
//   • Remotion Studio → its own bundler reads `resolve.alias` from here
//
// Everything is served from the repo root so `public/` (fonts, photos, audio)
// resolves identically in the player and in a Remotion render.
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
      ignored: ['**/out/**', '**/episodes/**', '**/assets/generated/**', '**/node_modules/**'],
    },
  },
  build: {
    outDir: 'dist-deck',
    target: 'es2020',
  },
});
