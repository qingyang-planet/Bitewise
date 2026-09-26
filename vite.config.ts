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
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
