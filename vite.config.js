import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],
      manifest: {
        name: 'Mapeamento Votorantim',
        short_name: 'Saúde Votorantim',
        description: 'Mapeamento interativo da rede municipal de saúde e serviços públicos de Votorantim',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache de todos os arquivos estáticos gerados no build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        runtimeCaching: [
          // 1. Cache dos dados de leitura do Supabase (GET) - StaleWhileRevalidate (24h)
          // NÃO cacheia POST/PATCH/DELETE nem chamadas de autenticação (/auth/v1/*)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'StaleWhileRevalidate',
            method: 'GET',
            options: {
              cacheName: 'supabase-data-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 24 horas
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 2. Cache dos tiles do mapa (CARTO e OpenStreetMap) - CacheFirst (~30 dias, máx 200)
          {
            urlPattern: /^https:\/\/(?:.*\.basemaps\.cartocdn\.com|.*\.tile\.openstreetmap\.org)\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // ~30 dias
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 3. Marcadores e estilos externos do Leaflet (CDN)
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-assets-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 4. Fontes do Google (Inter)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
