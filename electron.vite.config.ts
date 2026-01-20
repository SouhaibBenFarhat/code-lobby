import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        // Workspace packages - resolved to source for hot reload
        '@codelobby/slot-system': resolve('packages/slot-system/src/index.tsx'),
        '@codelobby/shared-store': resolve('packages/shared-store/src/index.ts'),
        '@codelobby/data-module': resolve('packages/data-module/src/index.ts'),
        '@codelobby/header-module': resolve('packages/header-module/src/index.ts'),
        '@codelobby/explorer-module': resolve('packages/explorer-module/src/index.ts'),
        '@codelobby/canvas-module': resolve('packages/canvas-module/src/index.ts'),
        '@codelobby/pr-detail-module': resolve('packages/pr-detail-module/src/index.ts'),
        '@codelobby/ai-chat-module': resolve('packages/ai-chat-module/src/index.ts'),
        '@codelobby/app/bootstrap': resolve('packages/app/src/bootstrap.ts'),
        '@codelobby/app': resolve('packages/app/src/index.ts'),
        '@codelobby/ui-kit': resolve('packages/ui-kit/src/index.ts')
      }
    },
    plugins: [react()]
  }
})
