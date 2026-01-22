import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@codelobby/logger/main': resolve('packages/logger/src/main.ts'),
        '@codelobby/logger': resolve('packages/logger/src/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@codelobby/logger/main': resolve('packages/logger/src/main.ts'),
        '@codelobby/logger': resolve('packages/logger/src/index.ts')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        // Workspace packages - resolved to source for hot reload
        '@codelobby/logger': resolve('packages/logger/src/index.ts'),
        '@codelobby/api': resolve('packages/api/src/index.ts'),
        '@codelobby/slot-system': resolve('packages/slot-system/src/index.tsx'),
        '@codelobby/shared-store': resolve('packages/shared-store/src/index.ts'),
        '@codelobby/queries': resolve('packages/queries/src/index.ts'),
        '@codelobby/data-module': resolve('packages/data-module/src/index.ts'),
        '@codelobby/header-module': resolve('packages/header-module/src/index.tsx'),
        '@codelobby/explorer-module': resolve('packages/explorer-module/src/index.tsx'),
        '@codelobby/canvas-module': resolve('packages/canvas-module/src/index.tsx'),
        '@codelobby/pr-detail-module': resolve('packages/pr-detail-module/src/index.tsx'),
        '@codelobby/ai-chat-module': resolve('packages/ai-chat-module/src/index.tsx'),
        '@codelobby/app/bootstrap': resolve('packages/app/src/bootstrap.ts'),
        '@codelobby/app': resolve('packages/app/src/index.ts'),
        '@codelobby/ui-kit': resolve('packages/ui-kit/src/index.ts')
      }
    },
    plugins: [react()]
  }
})
