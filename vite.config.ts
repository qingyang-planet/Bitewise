import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'CanIEatThis — Your AI dining companion in China',
        short_name: 'CanIEatThis',
        description: 'Understand the dish. Know what fits you. Order with confidence.',
        theme_color: '#f8f7f4',
        background_color: '#f8f7f4',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'en',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
