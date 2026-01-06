import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
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
                display: 'standalone',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // React 관련 라이브러리
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    // Supabase 클라이언트
                    'supabase': ['@supabase/supabase-js'],
                    // 비디오 관련
                    'video': ['@vimeo/player', 'tus-js-client'],
                    // UI 라이브러리
                    'ui': ['lucide-react', 'date-fns'],
                    // 차트 및 시각화
                    'charts': ['recharts'],
                }
            }
        },
        chunkSizeWarningLimit: 1000, // 경고 임계값 상향 (1MB)
    },
    esbuild: {
        drop: ['console', 'debugger'],
    },
    server: {
        port: 8080,
        open: true
    }
})

// Touch to force reload

// Touch to force reload
