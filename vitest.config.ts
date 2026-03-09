import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['lib/**/*.{test,spec}.{ts,tsx}', 'components/**/*.{test,spec}.{ts,tsx}', 'hooks/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'dist', 'testsprite_tests', 'mobile', '_OLD_BACKUP'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**', 'components/**', 'hooks/**'],
      exclude: ['**/*.d.ts', '**/*.config.*', 'node_modules'],
    },
  },
})
