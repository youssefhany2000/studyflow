import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      lib: { entry: resolve(__dirname, 'electron/main.ts') },
      rollupOptions: {
        external: ['better-sqlite3']
      }
    },
  },
  preload: {
    build: {
      lib: { entry: resolve(__dirname, 'electron/preload.ts') },
    },
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'shared'),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
    },
  }
});