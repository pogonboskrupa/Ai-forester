import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base './' jer GitHub Pages servira app iz podputanje (/Ai-forester/), a Android (Capacitor) iz korijena.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  base: './',
  plugins: [
    // version.json: aplikacija (posebno APK) ga čita da sazna ima li novija verzija.
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registracija u src/pwa.ts (provjera nove verzije pri povratku u aplikaciju)
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-48.png'],
      manifest: {
        id: 'ai-sumar',
        name: 'Forester – šumarski propisi BiH / USK',
        short_name: 'Forester',
        description: 'Zakoni i pravilnici o šumarstvu BiH, FBiH i Unsko-sanskog kantona, s odgovorima i citatima članova.',
        lang: 'bs',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#f6f5f1',
        theme_color: '#2d6a43',
        categories: ['productivity', 'reference', 'education'],
        // Android traži PNG 192 i 512; "maskable" popunjava oblik ikone na početnom ekranu.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Novi razgovor', short_name: 'Novo pitanje', url: './?akcija=novi', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Biblioteka propisa', short_name: 'Biblioteka', url: './?akcija=biblioteka', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      // pdf.js (uvoz PDF-a) se ne kešira unaprijed: koristi se rijetko, a velik je.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        globIgnores: ['**/pdf-*.js', '**/pdf.worker*', 'version.json'], // version.json uvijek s mreže
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/\.apk$/], // APK mora ići na mrežu, ne na keširani index.html
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
