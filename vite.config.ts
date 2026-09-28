import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['bitewise-icon-192.png', 'bitewise-icon-512.png', 'logo.png'],
      manifest: {
        name: 'Bitewise 食见 — Your AI dining companion in China',
        short_name: 'Bitewise',
        description: 'Understand the dish. Know what fits you. Order with confidence.',
        theme_color: '#f25143',
        background_color: '#fff9f5',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'en',
        start_url: '/',
        icons: [
          { src: '/bitewise-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/bitewise-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/dish-photos/**', '**/classroom-demo-menu-*.png'],
        additionalManifestEntries: [
          { url: '/dish-photos/kung-pao.webp', revision: null },
          { url: '/dish-photos/mapo-tofu.webp', revision: null },
          { url: '/dish-photos/eggplant.webp', revision: null },
          { url: '/dish-photos/seasonal-greens.webp', revision: null },
          { url: '/dish-photos/lotus-root.webp', revision: null },
          { url: '/dish-photos/winter-melon-soup.webp', revision: null },
          { url: '/dish-photos/hotpot.webp', revision: null },
          { url: '/dish-photos/hotpot-sichuan-broth.webp', revision: null },
          { url: '/dish-photos/shanghai-red-braised-pork-belly.webp', revision: null },
          { url: '/dish-photos/jade-soup-dumpling-signature.webp', revision: null },
          { url: '/dish-photos/charcoal-yard-signature.webp', revision: null },
          { url: '/dish-photos/old-town-kitchen-signature.webp', revision: null },
        ],
        runtimeCaching: [
          {
            urlPattern: /\/dish-photos\/.*\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bitewise-dish-photos',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
