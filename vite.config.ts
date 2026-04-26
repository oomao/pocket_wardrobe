import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/pocket_wardrobe/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
});
