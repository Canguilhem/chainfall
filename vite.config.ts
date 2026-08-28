import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// The web app is the only thing Vite builds. The engine is plain TypeScript
// imported by both this app and the Node server, so it must never depend on
// anything Vite-specific — no import.meta.env, no ?raw imports, no aliases
// that the server cannot resolve.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /* Engine is shared with the Node server; Vite HMR can leave a tab on a
       stale transform after engine edits. Force a full reload instead. */
    {
      name: 'reload-on-engine-change',
      handleHotUpdate({ file, server }) {
        if (file.includes('/src/engine/')) {
          server.ws.send({ type: 'full-reload' });
          return [];
        }
      },
    },
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src/web', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
