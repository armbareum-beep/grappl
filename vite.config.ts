import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react()
        // PWA removed to prevent cache issues
    ],
    build: {
        rollupOptions: {
            output: {
                // Add hash to filenames for automatic cache busting
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]'
            }
        }
    },
    server: {
        port: 8080,
        open: true
    }
})
