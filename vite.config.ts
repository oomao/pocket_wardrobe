import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/pocket_wardrobe/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'avatars/*.svg'],
      manifest: {
        name: '智慧衣櫥 Pocket Wardrobe',
        short_name: '智慧衣櫥',
        description: '純前端虛擬試穿衣櫥，所有資料儲存於本地裝置。',
        theme_color: '#a21caf',
        background_color: '#fafafa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/pocket_wardrobe/',
        scope: '/pocket_wardrobe/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // ONNX wasm/model files are huge — let them stream from network instead of precaching.
        globIgnores: ['**/*.wasm', '**/ort*.{js,mjs}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/pocket_wardrobe/index.html',
        navigateFallbackDenylist: [/^\/pocket_wardrobe\/.*\.(wasm|onnx|bin)$/],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
  // Some Node-style libraries (e.g. @gradio/client) reference `global` /
  // `Buffer`. Aliasing `global` to `globalThis` keeps them working in the
  // browser; the Buffer polyfill lives at the top of src/main.tsx.
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
});
