// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // En desarrollo, proxea /api al backend Node.js
  // En producción Nginx se encarga del enrutamiento
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:      'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir:    '../dist',        // Nginx sirve desde /dist/
    emptyOutDir: true,
  },
});
