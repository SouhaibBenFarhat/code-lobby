import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // happy-dom is significantly faster than jsdom for this RTL-heavy suite.
    environment: 'happy-dom',
    setupFiles: ['./--module-test-utils/setup.ts'],
    include: [
      'src/main/**/*.test.ts',
      'src/renderer/**/*.test.ts',
      '--module-*/**/*.test.ts',
      '--module-*/**/*.test.tsx'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'cobertura', 'json-summary'],
      exclude: [
        'node_modules/',
        'tests/',
        'out/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types.ts',
        // Electron entry points: the main-process bootstrap and the preload
        // contextBridge can't run in the happy-dom renderer test env, so they're
        // structurally uncoverable here (Vitest's coverage.all would otherwise
        // report them as 0% and drag down the diff-coverage gate).
        'src/main/index.ts',
        'src/preload/index.ts'
      ],
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
      '@logger/main': resolve(__dirname, '--module-logger/main.ts'),
      '@logger': resolve(__dirname, '--module-logger/index.ts'),
      '@data': resolve(__dirname, '--module-data/index.ts'),
      '@slot-system': resolve(__dirname, '--module-slot-system/index.tsx'),
      '@header': resolve(__dirname, '--module-header/index.tsx'),
      '@explorer': resolve(__dirname, '--module-explorer/index.tsx'),
      '@canvas': resolve(__dirname, '--module-canvas/index.tsx'),
      '@network': resolve(__dirname, '--module-network/index.tsx'),
      '@pr-detail': resolve(__dirname, '--module-pr-detail/index.tsx'),
      '@ai-chat': resolve(__dirname, '--module-ai-chat/index.tsx'),
      '@app': resolve(__dirname, '--module-app/index.ts'),
      '@ui-kit': resolve(__dirname, '--module-ui-kit/index.ts'),
      '@test-utils': resolve(__dirname, '--module-test-utils/index.ts')
    }
  }
})
