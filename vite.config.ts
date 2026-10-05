import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base './' jer GitHub Pages servira app iz podputanje (/Ai-forester/)
export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Šumarski AI asistent BiH / USK',
        short_name: 'AI Šumar',
        lang: 'bs',
        start_url: '.',
        display: 'standalone',
        background_color: '#f6f5f1',
        theme_color: '#2d6a43',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'] },
    }),
  ],
});
