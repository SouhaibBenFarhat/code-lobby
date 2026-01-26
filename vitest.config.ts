import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__module__test-utils/setup.ts'],
    include: [
      'src/main/**/*.test.ts',
      'src/renderer/**/*.test.ts',
      '__module__*/**/*.test.ts',
      '__module__*/**/*.test.tsx'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', 'out/', '**/*.d.ts', '**/*.config.*', '**/types.ts'],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/renderer'),
      '@main': resolve(__dirname, './src/main'),
      '@preload': resolve(__dirname, './src/preload'),
      '@logger/main': resolve(__dirname, '__module__logger/main.ts'),
      '@logger': resolve(__dirname, '__module__logger/index.ts'),
      '@data': resolve(__dirname, '__module__data/index.ts'),
      '@slot-system': resolve(__dirname, '__module__slot-system/index.tsx'),
      '@header': resolve(__dirname, '__module__header/index.tsx'),
      '@explorer': resolve(__dirname, '__module__explorer/index.tsx'),
      '@canvas': resolve(__dirname, '__module__canvas/index.tsx'),
      '@network': resolve(__dirname, '__module__network/index.tsx'),
      '@pr-detail': resolve(__dirname, '__module__pr-detail/index.tsx'),
      '@ai-chat': resolve(__dirname, '__module__ai-chat/index.tsx'),
      '@app': resolve(__dirname, '__module__app/index.ts'),
      '@ui-kit': resolve(__dirname, '__module__ui-kit/index.ts'),
      '@test-utils': resolve(__dirname, '__module__test-utils/index.ts')
    }
  }
})
