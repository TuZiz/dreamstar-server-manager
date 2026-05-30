import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: resolve('src/renderer'),
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  build: {
    outDir: resolve('out-web/renderer'),
    emptyOutDir: true
  }
});
