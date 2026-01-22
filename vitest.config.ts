import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./packages/test-utils/src/setup.ts'],
    // Tests are colocated with their source files
    include: [
      'src/main/**/*.test.ts',
      'src/renderer/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
      'packages/*/src/**/*.test.tsx'
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
      // Workspace packages
      '@codelobby/slot-system': resolve(__dirname, 'packages/slot-system/src/index.tsx'),
      '@codelobby/shared-store': resolve(__dirname, 'packages/shared-store/src/index.ts'),
      '@codelobby/queries': resolve(__dirname, 'packages/queries/src/index.ts'),
      '@codelobby/data-module': resolve(__dirname, 'packages/data-module/src/index.ts'),
      '@codelobby/header-module': resolve(__dirname, 'packages/header-module/src/index.tsx'),
      '@codelobby/explorer-module': resolve(__dirname, 'packages/explorer-module/src/index.tsx'),
      '@codelobby/canvas-module': resolve(__dirname, 'packages/canvas-module/src/index.tsx'),
      '@codelobby/pr-detail-module': resolve(__dirname, 'packages/pr-detail-module/src/index.tsx'),
      '@codelobby/ai-chat-module': resolve(__dirname, 'packages/ai-chat-module/src/index.tsx'),
      '@codelobby/app': resolve(__dirname, 'packages/app/src/index.ts'),
      '@codelobby/ui-kit': resolve(__dirname, 'packages/ui-kit/src/index.ts'),
      '@codelobby/test-utils': resolve(__dirname, 'packages/test-utils/src/index.ts'),
      '@codelobby/api': resolve(__dirname, 'packages/api/src/index.ts'),
      '@codelobby/logger/main': resolve(__dirname, 'packages/logger/src/main.ts'),
      '@codelobby/logger': resolve(__dirname, 'packages/logger/src/index.ts')
    }
  }
})
