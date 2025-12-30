import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                skipWaiting: true,
                clientsClaim: true,
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
            },
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Grapplay',
                short_name: 'Grapplay',
                description: '프리미엄 주짓수 기술 영상 플랫폼',
                theme_color: '#09090b',
                background_color: '#09090b',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        }),
    ],
    esbuild: {
        drop: ['console', 'debugger'],
    },
    server: {
        port: 8080,
        open: true
    }
})

// Touch to force reload
